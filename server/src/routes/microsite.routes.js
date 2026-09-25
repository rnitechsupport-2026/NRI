const router = require('express').Router();
const { z } = require('zod');
const Microsite = require('../models/Microsite');
const MicrositeSection = require('../models/MicrositeSection');
const Property = require('../models/Property');
const PropertyImage = require('../models/PropertyImage');
const Favorite = require('../models/Favorite');
const { requireAuth, optionalAuth, requireApproved } = require('../middleware/auth');
const { asyncHandler, makeSlug, HttpError } = require('../utils/helpers');

const isStaff = (role) => role === 'admin' || role === 'employee';

async function loadOwnedProperty(req, propertyId) {
  const property = await Property.findById(propertyId).select('user title slug').lean();
  if (!property) throw new HttpError(404, 'Property not found');
  if (property.user.toString() !== req.user._id.toString() && !isStaff(req.user.role)) {
    throw new HttpError(403, 'You can only build a microsite for your own listing');
  }
  return property;
}

async function loadOwnedMicrosite(req, id) {
  const microsite = await Microsite.findById(id).lean();
  if (!microsite) throw new HttpError(404, 'Microsite not found');
  if (microsite.createdBy.toString() !== req.user._id.toString() && !isStaff(req.user.role)) {
    throw new HttpError(403, 'You can only manage your own microsite');
  }
  return microsite;
}

function shapeMicrosite(m) {
  const obj = { ...m };
  obj.id = String(obj._id);
  obj.property = obj.property ? String(obj.property) : null;
  delete obj._id;
  delete obj.__v;
  return obj;
}

function shapeSection(s) {
  const obj = { ...s };
  obj.id = String(obj._id);
  obj.microsite = String(obj.microsite);
  delete obj._id;
  delete obj.__v;
  return obj;
}

const sectionInput = z.object({
  sectionType: z.string().min(1).max(60),
  sectionOrder: z.number().int().default(0),
  isVisible: z.boolean().default(true),
  sectionData: z.record(z.any()).optional().default({}),
  settings: z.record(z.any()).optional().default({}),
});

const themeInput = z.object({
  primaryColor: z.string().max(20).optional(),
  secondaryColor: z.string().max(20).optional(),
  backgroundColor: z.string().max(20).optional(),
  textColor: z.string().max(20).optional(),
  buttonStyle: z.enum(['solid', 'outline', 'pill']).optional(),
  borderRadius: z.enum(['none', 'sm', 'md', 'lg', 'full']).optional(),
  fontStyle: z.enum(['classic', 'modern', 'editorial']).optional(),
  sectionSpacing: z.enum(['compact', 'normal', 'spacious']).optional(),
}).partial();

const navbarInput = z.object({
  showLogo: z.boolean().optional(),
  logoUrl: z.string().max(400).optional(),
  background: z.string().max(20).optional(),
  sticky: z.boolean().optional(),
  items: z.array(z.object({
    key: z.string().max(40),
    label: z.string().max(60),
    visible: z.boolean().default(true),
    order: z.number().int().default(0),
  })).optional(),
}).partial();

/** Fetches a property the same way property.routes.js's public GET does — real data, no invented copy. */
async function hydrateProperty(propertyId) {
  const property = await Property.findById(propertyId)
    .populate({ path: 'user', select: 'name role phone email companyName avatarUrl isVerified experienceYears about' })
    .lean();
  if (!property) return null;
  const images = await PropertyImage.find({ property: property._id }).sort({ sortOrder: 1, _id: 1 }).lean();
  const owner = property.user || {};
  return {
    id: String(property._id),
    title: property.title,
    slug: property.slug,
    description: property.description,
    purpose: property.purpose,
    property_type: property.propertyType,
    bhk: property.bhk,
    bathrooms: property.bathrooms,
    balconies: property.balconies,
    furnishing: property.furnishing,
    facing: property.facing,
    floor_no: property.floorNo,
    total_floors: property.totalFloors,
    age_years: property.ageYears,
    possession: property.possession,
    built_up_area: property.builtUpArea,
    carpet_area: property.carpetArea,
    area_unit: property.areaUnit,
    price: property.price,
    price_negotiable: property.priceNegotiable,
    maintenance: property.maintenance,
    address: property.address,
    locality: property.locality,
    city: property.city,
    state: property.state,
    pincode: property.pincode,
    amenities: Array.isArray(property.amenities) ? property.amenities : [],
    cover_image: property.coverImage,
    tour_url: property.tourUrl,
    tour_provider: property.tourProvider,
    video_url: property.videoUrl,
    floor_plan_url: property.floorPlanUrl,
    is_verified: property.isVerified,
    status: property.status,
    views: property.views,
    images: images.map((i) => ({ url: i.url })),
    owner_id: owner._id ? String(owner._id) : null,
    owner_name: owner.name,
    owner_role: owner.role,
    owner_company: owner.companyName,
    owner_avatar: owner.avatarUrl,
    owner_verified: owner.isVerified,
    owner_experience: owner.experienceYears,
    owner_phone: owner.phone,
    owner_email: owner.email,
  };
}

/** GET /property/:propertyId/preview — hydrated property (same shape hydrateProperty
 *  produces for a live microsite) for the "choose a template" live preview, before
 *  any Microsite doc exists yet. Ownership-checked like everything else here. */
router.get('/property/:propertyId/preview', requireAuth, asyncHandler(async (req, res) => {
  await loadOwnedProperty(req, req.params.propertyId);
  const property = await hydrateProperty(req.params.propertyId);
  if (!property) throw new HttpError(404, 'Property not found');
  res.json({ data: property });
}));

/** POST / — create a microsite from a chosen template's preset payload. */
router.post('/', requireAuth, requireApproved, asyncHandler(async (req, res) => {
  const d = z.object({
    property_id: z.string().regex(/^[0-9a-fA-F]{24}$/),
    template_id: z.enum(['premium-luxury', 'modern-real-estate', 'lead-generation', 'editorial', 'custom']),
    sections: z.array(sectionInput).min(1),
    theme: themeInput.optional(),
    navbar: navbarInput.optional(),
  }).parse(req.body);

  const property = await loadOwnedProperty(req, d.property_id);

  const already = await Microsite.findOne({ property: property._id }).select('_id').lean();
  if (already) throw new HttpError(409, 'This property already has a microsite. Edit the existing one instead.');

  const slug = await makeSlug('microsites', property.title);
  const microsite = await Microsite.create({
    property: property._id,
    createdBy: req.user._id,
    templateId: d.template_id,
    slug,
    theme: d.theme || undefined,
    navbar: d.navbar || undefined,
  });

  const sections = await MicrositeSection.insertMany(
    d.sections.map((s, i) => ({
      microsite: microsite._id,
      sectionType: s.sectionType,
      sectionOrder: s.sectionOrder ?? i,
      isVisible: s.isVisible,
      sectionData: s.sectionData,
      settings: s.settings,
    }))
  );

  res.status(201).json({
    data: {
      microsite: shapeMicrosite(microsite.toObject()),
      sections: sections.map((s) => shapeSection(s.toObject())),
    },
  });
}));

/** GET /mine — the current user's microsites. */
router.get('/mine', requireAuth, asyncHandler(async (req, res) => {
  const filter = isStaff(req.user.role) ? {} : { createdBy: req.user._id };
  const rows = await Microsite.find(filter).populate('property', 'title slug coverImage').sort({ createdAt: -1 }).lean();
  res.json({
    data: rows.map((m) => ({
      ...shapeMicrosite(m),
      propertyTitle: m.property?.title,
      propertySlug: m.property?.slug,
      propertyImage: m.property?.coverImage,
      property: m.property ? String(m.property._id) : null,
    })),
  });
}));

/** GET /:id — full doc + sections + hydrated property, for the builder. */
router.get('/:id', requireAuth, asyncHandler(async (req, res) => {
  const microsite = await loadOwnedMicrosite(req, req.params.id);
  const [sections, property] = await Promise.all([
    MicrositeSection.find({ microsite: microsite._id }).sort({ sectionOrder: 1 }).lean(),
    hydrateProperty(microsite.property),
  ]);
  res.json({
    data: {
      microsite: shapeMicrosite(microsite),
      sections: sections.map(shapeSection),
      property,
    },
  });
}));

/** PUT /:id — update theme/navbar/slug. */
router.put('/:id', requireAuth, asyncHandler(async (req, res) => {
  const microsite = await loadOwnedMicrosite(req, req.params.id);
  const d = z.object({
    slug: z.string().min(2).max(240).optional(),
    theme: themeInput.optional(),
    navbar: navbarInput.optional(),
  }).parse(req.body);

  const update = {};
  if (d.theme) for (const [k, v] of Object.entries(d.theme)) update[`theme.${k}`] = v;
  if (d.navbar) for (const [k, v] of Object.entries(d.navbar)) update[`navbar.${k}`] = v;
  if (d.slug && d.slug !== microsite.slug) {
    const clash = await Microsite.findOne({ slug: d.slug, _id: { $ne: microsite._id } }).select('_id').lean();
    if (clash) throw new HttpError(409, 'That URL is already taken — try another.');
    update.slug = d.slug;
  }

  const row = Object.keys(update).length
    ? await Microsite.findByIdAndUpdate(microsite._id, { $set: update }, { new: true }).lean()
    : microsite;
  res.json({ data: shapeMicrosite(row) });
}));

/** PUT /:id/sections — bulk replace the section list (add/remove/reorder/edit in one save). */
router.put('/:id/sections', requireAuth, asyncHandler(async (req, res) => {
  const microsite = await loadOwnedMicrosite(req, req.params.id);
  const { sections } = z.object({ sections: z.array(sectionInput).min(1) }).parse(req.body);

  await MicrositeSection.deleteMany({ microsite: microsite._id });
  const rows = await MicrositeSection.insertMany(
    sections.map((s, i) => ({
      microsite: microsite._id,
      sectionType: s.sectionType,
      sectionOrder: s.sectionOrder ?? i,
      isVisible: s.isVisible,
      sectionData: s.sectionData,
      settings: s.settings,
    }))
  );
  if (microsite.templateId !== 'custom') await Microsite.findByIdAndUpdate(microsite._id, { templateId: 'custom' });

  res.json({ data: { sections: rows.map((s) => shapeSection(s.toObject())) } });
}));

/** POST /:id/publish — go live at the microsite's slug. */
router.post('/:id/publish', requireAuth, asyncHandler(async (req, res) => {
  const microsite = await loadOwnedMicrosite(req, req.params.id);
  const row = await Microsite.findByIdAndUpdate(
    microsite._id,
    { status: 'published', publishedAt: new Date() },
    { new: true }
  ).lean();
  res.json({ data: shapeMicrosite(row) });
}));

/** POST /:id/unpublish — pull it offline without deleting the draft. */
router.post('/:id/unpublish', requireAuth, asyncHandler(async (req, res) => {
  const microsite = await loadOwnedMicrosite(req, req.params.id);
  const row = await Microsite.findByIdAndUpdate(microsite._id, { status: 'draft' }, { new: true }).lean();
  res.json({ data: shapeMicrosite(row) });
}));

router.delete('/:id', requireAuth, asyncHandler(async (req, res) => {
  const microsite = await loadOwnedMicrosite(req, req.params.id);
  await Promise.all([
    Microsite.findByIdAndDelete(microsite._id),
    MicrositeSection.deleteMany({ microsite: microsite._id }),
  ]);
  res.json({ message: 'Microsite deleted' });
}));

/** GET /public/:slug — no auth. Published only, unless the owner/admin passes ?preview=1. */
router.get('/public/:slug', optionalAuth, asyncHandler(async (req, res) => {
  const microsite = await Microsite.findOne({ slug: req.params.slug }).lean();
  if (!microsite) throw new HttpError(404, 'Microsite not found');

  const isPreview = req.query.preview === '1';
  const allowedPreview = isPreview && req.user &&
    (String(microsite.createdBy) === String(req.user._id) || isStaff(req.user.role));

  if (microsite.status !== 'published' && !allowedPreview) {
    throw new HttpError(404, 'This microsite is not published yet');
  }

  const [sections, property] = await Promise.all([
    MicrositeSection.find({ microsite: microsite._id, isVisible: true }).sort({ sectionOrder: 1 }).lean(),
    hydrateProperty(microsite.property),
  ]);
  if (!property) throw new HttpError(404, 'The listing behind this microsite is no longer available');

  res.json({
    data: {
      microsite: shapeMicrosite(microsite),
      sections: sections.map(shapeSection),
      property,
    },
  });
}));

module.exports = router;
