const router = require('express').Router();
const { z } = require('zod');
const Microsite = require('../models/Microsite');
const MicrositeSection = require('../models/MicrositeSection');
const Property = require('../models/Property');
const PropertyImage = require('../models/PropertyImage');
const Project = require('../models/Project');
const ProjectImage = require('../models/ProjectImage');
const Favorite = require('../models/Favorite');
const { requireAuth, optionalAuth, requireApproved } = require('../middleware/auth');
const { asyncHandler, makeSlug, HttpError } = require('../utils/helpers');
const plotMap = require('../services/plotMap');

const { managesUserId, managedUserIds } = require('../services/staffScope');

// Staff reach a listing's microsite only through its owner: an admin always,
// an employee only when that owner is assigned to them.
const staffManages = (req, ownerId) => managesUserId(req.user, ownerId);
// Not public while its listing is under verification or rejected.
const UNLISTED = ['pending', 'rejected'];

async function loadOwnedProperty(req, propertyId) {
  const property = await Property.findById(propertyId).select('user title slug').lean();
  if (!property) throw new HttpError(404, 'Property not found');
  if (property.user.toString() !== req.user._id.toString() && !(await staffManages(req, property.user))) {
    throw new HttpError(403, 'You can only build a microsite for your own listing');
  }
  return property;
}

async function loadOwnedProject(req, projectId) {
  const project = await Project.findById(projectId).select('builder name slug').lean();
  if (!project) throw new HttpError(404, 'Project not found');
  if (project.builder.toString() !== req.user._id.toString() && !(await staffManages(req, project.builder))) {
    throw new HttpError(403, 'You can only build a microsite for your own project');
  }
  return project;
}

async function loadOwnedMicrosite(req, id) {
  const microsite = await Microsite.findById(id).lean();
  if (!microsite) throw new HttpError(404, 'Microsite not found');
  if (microsite.createdBy.toString() !== req.user._id.toString() && !(await staffManages(req, microsite.createdBy))) {
    throw new HttpError(403, 'You can only manage your own microsite');
  }
  return microsite;
}

function shapeMicrosite(m) {
  const obj = { ...m };
  obj.id = String(obj._id);
  obj.property = obj.property ? String(obj.property) : null;
  obj.project = obj.project ? String(obj.project) : null;
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
  // No .default() here on purpose — omitting it must fall through to the
  // route handler's `s.sectionOrder ?? i` (array-index) fallback below, not
  // silently collapse every section in a fresh template to the same 0.
  sectionOrder: z.number().int().optional(),
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
  ctaLabel: z.string().max(40).optional(),
  ctaLink: z.string().max(400).optional(),
  background: z.string().max(20).optional(),
  sticky: z.boolean().optional(),
  items: z.array(z.object({
    key: z.string().max(40),
    label: z.string().max(60),
    visible: z.boolean().default(true),
    order: z.number().int().default(0),
  })).optional(),
}).partial();

/** A microsite's sections in display order. `_id` breaks ties on purpose —
 *  older microsites were saved with every section at sectionOrder 0, and
 *  without a tie-break Mongo is free to return those in any order, so the
 *  same published page could come back arranged differently per request.
 *  Sections are always inserted in display order, so `_id` restores it. */
function loadSections(micrositeId, { visibleOnly = false } = {}) {
  const filter = { microsite: micrositeId };
  if (visibleOnly) filter.isVisible = true;
  return MicrositeSection.find(filter).sort({ sectionOrder: 1, _id: 1 }).lean();
}

/** Fetches a property the same way property.routes.js's public GET does — real data, no invented copy.
 *  `plot_map` is the listing's interactive image map for the Image Mapping
 *  section: the published snapshot for visitors, or (`draftMap`) the owner's
 *  current draft for their own previews. null when there is none. */
async function hydrateProperty(propertyId, { draftMap = false } = {}) {
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
    entity_type: 'property',
    plot_map: await (draftMap ? plotMap.draftView(property._id) : plotMap.publishedView(property._id)),
  };
}

/** Same idea as hydrateProperty, but for a builder project — shaped as close
 *  to the property object as the data allows (title/price/owner_* etc.) so
 *  the same section components can render either without needing their own
 *  parallel set. `entity_type: 'project'` is how they tell the two apart for
 *  the handful of facts that genuinely don't translate (BHK, floor, etc). */
async function hydrateProject(projectId) {
  const project = await Project.findById(projectId)
    .populate({ path: 'builder', select: 'name role phone email companyName avatarUrl isVerified experienceYears about' })
    .lean();
  if (!project) return null;
  const images = await ProjectImage.find({ project: project._id }).sort({ sortOrder: 1, _id: 1 }).lean();
  const builder = project.builder || {};
  const hasRange = project.minPrice && project.maxPrice && project.minPrice !== project.maxPrice;
  return {
    id: String(project._id),
    title: project.name,
    slug: project.slug,
    description: [project.tagline, project.description].filter(Boolean).join('\n\n'),
    purpose: 'sale',
    property_type: project.projectType,
    bhk: null,
    bathrooms: null,
    balconies: null,
    furnishing: null,
    facing: null,
    floor_no: null,
    total_floors: null,
    age_years: null,
    possession: null,
    built_up_area: null,
    carpet_area: null,
    area_unit: 'sqft',
    price: project.minPrice || project.maxPrice || 0,
    price_range: hasRange ? { min: project.minPrice, max: project.maxPrice } : null,
    price_negotiable: false,
    maintenance: null,
    address: project.address,
    locality: project.locality,
    city: project.city,
    state: null,
    pincode: null,
    amenities: Array.isArray(project.amenities) ? project.amenities : [],
    cover_image: project.coverImage,
    tour_url: null,
    tour_provider: null,
    video_url: null,
    floor_plan_url: null,
    is_verified: project.verificationStatus === 'verified',
    status: project.status,
    views: project.views,
    images: images.map((i) => ({ url: i.url })),
    owner_id: builder._id ? String(builder._id) : null,
    owner_name: builder.name,
    owner_role: builder.role || 'builder',
    owner_company: builder.companyName,
    owner_avatar: builder.avatarUrl,
    owner_verified: builder.isVerified,
    owner_experience: builder.experienceYears,
    owner_phone: builder.phone,
    owner_email: builder.email,
    entity_type: 'project',
    configuration: project.configuration,
    total_units: project.totalUnits,
    towers: project.towers,
    min_area: project.minArea,
    max_area: project.maxArea,
    possession_on: project.possessionOn,
    rera_no: project.reraNo,
  };
}

/** Hydrates whichever entity a microsite doc points at. */
function hydrateForMicrosite(microsite, opts) {
  return microsite.property ? hydrateProperty(microsite.property, opts) : hydrateProject(microsite.project);
}

/** GET /property/:propertyId/preview — hydrated property (same shape hydrateProperty
 *  produces for a live microsite) for the "choose a template" live preview, before
 *  any Microsite doc exists yet. Ownership-checked like everything else here. */
router.get('/property/:propertyId/preview', requireAuth, asyncHandler(async (req, res) => {
  await loadOwnedProperty(req, req.params.propertyId);
  const property = await hydrateProperty(req.params.propertyId, { draftMap: true });
  if (!property) throw new HttpError(404, 'Property not found');
  res.json({ data: property });
}));

/** GET /project/:projectId/preview — same idea, for a builder project. */
router.get('/project/:projectId/preview', requireAuth, asyncHandler(async (req, res) => {
  await loadOwnedProject(req, req.params.projectId);
  const project = await hydrateProject(req.params.projectId);
  if (!project) throw new HttpError(404, 'Project not found');
  res.json({ data: project });
}));

/** POST / — create a microsite from a chosen template's preset payload, for
 *  either a property listing or a builder project. */
router.post('/', requireAuth, requireApproved, asyncHandler(async (req, res) => {
  const d = z.object({
    entity_type: z.enum(['property', 'project']).default('property'),
    entity_id: z.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
    property_id: z.string().regex(/^[0-9a-fA-F]{24}$/).optional(), // back-compat alias for entity_type: 'property'
    template_id: z.enum(['property-showcase', 'premium-luxury', 'modern-real-estate', 'lead-generation', 'editorial', 'custom']),
    sections: z.array(sectionInput).min(1),
    theme: themeInput.optional(),
    navbar: navbarInput.optional(),
  }).parse(req.body);

  const id = d.entity_id || d.property_id;
  if (!id) throw new HttpError(422, 'Missing the property or project to build this microsite for');
  const isProject = d.entity_type === 'project';

  const entity = isProject ? await loadOwnedProject(req, id) : await loadOwnedProperty(req, id);
  const entityTitle = isProject ? entity.name : entity.title;

  const already = await Microsite.findOne(isProject ? { project: entity._id } : { property: entity._id }).select('_id').lean();
  if (already) throw new HttpError(409, `This ${isProject ? 'project' : 'property'} already has a microsite. Edit the existing one instead.`);

  const slug = await makeSlug('microsites', entityTitle);
  const microsite = await Microsite.create({
    ...(isProject ? { project: entity._id } : { property: entity._id }),
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
  let filter = {};
  if (req.user.role === 'employee') {
    // an employee's "mine" = the microsites of the users assigned to them
    filter = { createdBy: { $in: await managedUserIds(req.user) } };
  } else if (req.user.role !== 'admin') {
    const [ownedProperties, ownedProjects] = await Promise.all([
      Property.find({ user: req.user._id }).select('_id').lean(),
      Project.find({ builder: req.user._id }).select('_id').lean(),
    ]);
    filter = {
      $or: [
        { createdBy: req.user._id },
        { property: { $in: ownedProperties.map((p) => p._id) } },
        { project: { $in: ownedProjects.map((p) => p._id) } },
      ],
    };
  }
  const rows = await Microsite.find(filter)
    .populate('property', 'title slug coverImage')
    .populate('project', 'name slug coverImage')
    .sort({ createdAt: -1 })
    .lean();
  res.json({
    data: rows.map((m) => {
      const entity = m.property || m.project;
      return {
        ...shapeMicrosite(m),
        entityType: m.property ? 'property' : 'project',
        propertyTitle: entity?.title || entity?.name,
        propertySlug: entity?.slug,
        propertyImage: entity?.coverImage,
        property: m.property ? String(m.property._id) : null,
        project: m.project ? String(m.project._id) : null,
      };
    }),
  });
}));

/** GET /:id — full doc + sections + hydrated entity, for the builder. */
router.get('/:id', requireAuth, asyncHandler(async (req, res) => {
  const microsite = await loadOwnedMicrosite(req, req.params.id);
  const [sections, property] = await Promise.all([
    loadSections(microsite._id),
    hydrateForMicrosite(microsite, { draftMap: true }),
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
  // The Image Mapping section shows the listing's published map — take any
  // pending map changes live together with the microsite.
  if (microsite.property) await plotMap.publishPendingForProperty(microsite.property);
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
    (String(microsite.createdBy) === String(req.user._id) || await staffManages(req, microsite.createdBy));

  if (microsite.status !== 'published' && !allowedPreview) {
    throw new HttpError(404, 'This microsite is not published yet');
  }

  const [sections, property] = await Promise.all([
    loadSections(microsite._id, { visibleOnly: true }),
    hydrateForMicrosite(microsite, { draftMap: !!allowedPreview }),
  ]);
  if (!property) throw new HttpError(404, 'The listing behind this microsite is no longer available');
  if (microsite.property && UNLISTED.includes(property.status) && !allowedPreview) {
    throw new HttpError(404, 'This listing is not live yet');
  }

  res.json({
    data: {
      microsite: shapeMicrosite(microsite),
      sections: sections.map(shapeSection),
      property,
    },
  });
}));

/** GET /for-property/:idOrSlug — no auth. Lets the real property detail page ask
 *  "does this listing have a published microsite?" without knowing the microsite's
 *  own slug. Same published-only rule as /public/:slug. */
router.get('/for-property/:idOrSlug', optionalAuth, asyncHandler(async (req, res) => {
  const key = req.params.idOrSlug;
  const byId = /^[0-9a-fA-F]{24}$/.test(key);
  const property = await Property.findOne(byId ? { _id: key } : { slug: key }).select('_id').lean();
  if (!property) throw new HttpError(404, 'Property not found');

  const microsite = await Microsite.findOne({ property: property._id }).lean();
  if (!microsite) throw new HttpError(404, 'No microsite for this property');

  const isPreview = req.query.preview === '1';
  const allowedPreview = isPreview && req.user &&
    (String(microsite.createdBy) === String(req.user._id) || await staffManages(req, microsite.createdBy));
  if (microsite.status !== 'published' && !allowedPreview) {
    throw new HttpError(404, 'This microsite is not published yet');
  }

  const [sections, hydrated] = await Promise.all([
    loadSections(microsite._id, { visibleOnly: true }),
    hydrateProperty(microsite.property, { draftMap: !!allowedPreview }),
  ]);
  if (!hydrated) throw new HttpError(404, 'The listing behind this microsite is no longer available');
  if (UNLISTED.includes(hydrated.status) && !allowedPreview) throw new HttpError(404, 'This listing is not live yet');

  res.json({
    data: {
      microsite: shapeMicrosite(microsite),
      sections: sections.map(shapeSection),
      property: hydrated,
    },
  });
}));

/** GET /for-project/:idOrSlug — same as /for-property, keyed by project instead. */
router.get('/for-project/:idOrSlug', optionalAuth, asyncHandler(async (req, res) => {
  const key = req.params.idOrSlug;
  const byId = /^[0-9a-fA-F]{24}$/.test(key);
  const project = await Project.findOne(byId ? { _id: key } : { slug: key }).select('_id').lean();
  if (!project) throw new HttpError(404, 'Project not found');

  const microsite = await Microsite.findOne({ project: project._id }).lean();
  if (!microsite) throw new HttpError(404, 'No microsite for this project');

  const isPreview = req.query.preview === '1';
  const allowedPreview = isPreview && req.user &&
    (String(microsite.createdBy) === String(req.user._id) || await staffManages(req, microsite.createdBy));
  if (microsite.status !== 'published' && !allowedPreview) {
    throw new HttpError(404, 'This microsite is not published yet');
  }

  const [sections, hydrated] = await Promise.all([
    loadSections(microsite._id, { visibleOnly: true }),
    hydrateProject(microsite.project),
  ]);

  res.json({
    data: {
      microsite: shapeMicrosite(microsite),
      sections: sections.map(shapeSection),
      property: hydrated,
    },
  });
}));

module.exports = router;
