const router = require('express').Router();
const { z } = require('zod');
const rateLimit = require('express-rate-limit');
const Property = require('../models/Property');
const PropertyImage = require('../models/PropertyImage');
const Favorite = require('../models/Favorite');
const Lead = require('../models/Lead');
const bot = require('../services/propertyBot');
const searchBot = require('../services/searchBot');
const { buildFilterFromParams: buildFilter, SORTS } = require('../services/filterUtil');
const { requireAuth, optionalAuth, requireRole } = require('../middleware/auth');
const { asyncHandler, makeSlug, nn, parseJson, paginate, HttpError } = require('../utils/helpers');
const { parseTourEmbed, allowedHosts } = require('../utils/embed');

const CARD_FIELDS = 'title slug purpose propertyType bhk bathrooms builtUpArea areaUnit price priceNegotiable furnishing possession locality city coverImage tourUrl isFeatured isVerified status views createdAt';

function shapeDoc(doc) {
  if (!doc) return null;
  const obj = doc.toObject ? doc.toObject() : doc;
  obj.id = String(obj._id || doc._id || '');
  obj.amenities = Array.isArray(obj.amenities) ? obj.amenities : (obj.amenities ? [obj.amenities] : []);
  obj.bathrooms = obj.bathrooms ?? null;
  obj.balconies = obj.balconies ?? null;
  if (obj.user && !obj.owner_id) {
    const u = obj.user;
    obj.owner_id = u._id || u.id;
    obj.owner_name = u.name;
    obj.owner_role = u.role;
    obj.owner_company = u.companyName;
    obj.owner_avatar = u.avatarUrl;
    obj.owner_verified = u.isVerified;
    obj.owner_experience = u.experienceYears;
    obj.owner_phone = u.phone;
    obj.owner_email = u.email;
    delete obj.user;
  }
  return obj;
}

router.get('/', asyncHandler(async (req, res) => {
  const { page, limit, offset } = paginate(req.query);
  const q = req.query;
  const { filter, sort } = buildFilter(q);
  const orderBy = SORTS[q.sort] || { isFeatured: -1, createdAt: -1 };

  const [items, total] = await Promise.all([
    Property.find(filter)
      .populate({ path: 'user', select: 'name role companyName avatarUrl isVerified' })
      .sort(orderBy)
      .skip(offset)
      .limit(limit)
      .lean(),
    Property.countDocuments(filter),
  ]);

  res.json({ data: items.map(shapeDoc), page, limit, total, pages: Math.ceil(total / limit) });
}));

router.get('/meta/cities', asyncHandler(async (_req, res) => {
  const data = await Property.aggregate([
    { $match: { status: 'active' } },
    { $group: { _id: '$city', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);
  res.json({ data: data.map((d) => ({ city: d._id, count: d.count })) });
}));

router.get('/meta/localities', asyncHandler(async (req, res) => {
  const match = { status: 'active' };
  if (req.query.city) match.city = req.query.city;
  const data = await Property.aggregate([
    { $match: match },
    { $group: { _id: '$locality', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 20 },
  ]);
  res.json({ data: data.map((d) => ({ locality: d._id, count: d.count })) });
}));

router.get('/mine/list', requireAuth, asyncHandler(async (req, res) => {
  const items = await Property.find({ user: req.user._id })
    .populate({ path: 'user', select: 'name role companyName avatarUrl isVerified' })
    .sort({ createdAt: -1 })
    .lean();

  const propIds = items.map((p) => p._id);
  const leadCounts = await Lead.aggregate([
    { $match: { property: { $in: propIds } } },
    { $group: { _id: '$property', count: { $sum: 1 } } },
  ]);
  const countMap = Object.fromEntries(leadCounts.map((c) => [String(c._id), c.count]));

  res.json({ data: items.map((p) => ({ ...shapeDoc(p), lead_count: countMap[String(p._id)] || 0 })) });
}));

router.get('/:idOrSlug', optionalAuth, asyncHandler(async (req, res) => {
  const key = req.params.idOrSlug;
  const byId = /^[0-9a-fA-F]{24}$/.test(key);
  const query = byId ? { _id: key } : { slug: key };

  const property = await Property.findOne(query)
    .populate({ path: 'user', select: 'name role phone email companyName avatarUrl isVerified experienceYears about' })
    .lean();

  if (!property) throw new HttpError(404, 'Property not found');

  await Property.findByIdAndUpdate(property._id, { $inc: { views: 1 } });
  property.views = (property.views || 0) + 1;

  const images = await PropertyImage.find({ property: property._id }).sort({ sortOrder: 1, _id: 1 }).lean();
  const owner = property.user || {};
  const flattened = {
    ...shapeDoc(property),
    owner_id: owner._id,
    owner_name: owner.name,
    owner_role: owner.role,
    owner_company: owner.companyName,
    owner_avatar: owner.avatarUrl,
    owner_verified: owner.isVerified,
    owner_experience: owner.experienceYears,
    owner_phone: owner.phone,
    owner_email: owner.email,
  };

  const similarDocs = await Property.find({
    status: 'active',
    city: property.city,
    _id: { $ne: property._id },
    purpose: property.purpose,
  })
    .populate({ path: 'user', select: 'name role companyName avatarUrl isVerified' })
    .sort({ isFeatured: -1, views: -1 })
    .limit(4)
    .lean();

  let is_favorite = false;
  if (req.user) {
    is_favorite = !!(await Favorite.findOne({ user: req.user._id, property: property._id }).select('_id').lean());
  }

  res.json({ data: { ...flattened, images, similar: similarDocs.map(shapeDoc), is_favorite } });
}));

router.post('/', requireAuth, requireRole('owner', 'agent', 'builder', 'admin'), asyncHandler(async (req, res) => {
  const d = z.object({
    title: z.string().min(8, 'Title should be at least 8 characters').max(200),
    description: z.string().max(5000).optional(),
    purpose: z.enum(['sale', 'rent', 'pg', 'lease']),
    property_type: z.enum(['apartment', 'villa', 'independent-house', 'plot', 'office', 'shop', 'warehouse', 'farmhouse']),
    bhk: z.coerce.number().int().min(0).max(20).optional(),
    bathrooms: z.coerce.number().int().min(0).max(20).optional(),
    balconies: z.coerce.number().int().min(0).max(20).optional(),
    furnishing: z.enum(['unfurnished', 'semi-furnished', 'fully-furnished']).optional(),
    facing: z.string().max(30).optional(),
    floor_no: z.coerce.number().int().min(-5).max(200).optional(),
    total_floors: z.coerce.number().int().min(0).max(200).optional(),
    age_years: z.coerce.number().int().min(0).max(100).optional(),
    possession: z.enum(['ready-to-move', 'under-construction']).optional(),
    built_up_area: z.coerce.number().int().min(1, 'Enter the area'),
    carpet_area: z.coerce.number().int().min(0).optional(),
    area_unit: z.enum(['sqft', 'sqyd', 'acre', 'cent']).default('sqft'),
    price: z.coerce.number().int().min(1, 'Enter the price'),
    price_negotiable: z.coerce.boolean().optional(),
    maintenance: z.coerce.number().int().min(0).optional(),
    address: z.string().max(255).optional(),
    locality: z.string().min(2, 'Enter the locality').max(120),
    city: z.string().min(2, 'Enter the city').max(80),
    state: z.string().max(80).optional(),
    pincode: z.string().max(10).optional(),
    amenities: z.array(z.string()).optional(),
    cover_image: z.string().max(400).optional(),
    images: z.array(z.string().max(400)).max(15).optional(),
    status: z.enum(['active', 'sold', 'rented', 'inactive']).optional(),
    tour_embed: z.string().max(4000).optional().or(z.literal('')),
    video_url: z.string().max(600).optional().or(z.literal('')),
    floor_plan_url: z.string().max(400).optional().or(z.literal('')),
  }).parse(req.body);

function tourColumns(tour_embed) {
  if (tour_embed === undefined) return null;
  if (!tour_embed.trim()) return { tour_url: null, tour_provider: null };
  const parsed = parseTourEmbed(tour_embed);
  if (!parsed) {
    throw new HttpError(422,
      `That 3D tour link could not be embedded. Supported providers: ${allowedHosts().slice(0, 8).join(', ')}…`);
  }
  return { tour_url: parsed.url, tour_provider: parsed.provider };
}

  const slug = await makeSlug('properties', d.title);
  const images = d.images && d.images.length ? d.images : (d.cover_image ? [d.cover_image] : []);
  const cover = d.cover_image || images[0] || null;
  const tour = tourColumns(d.tour_embed) || { tour_url: null, tour_provider: null };

  const property = await Property.create({
    user: req.user._id,
    title: d.title,
    slug,
    description: d.description,
    purpose: d.purpose,
    propertyType: d.property_type,
    bhk: nn(d.bhk),
    bathrooms: nn(d.bathrooms),
    balconies: nn(d.balconies),
    furnishing: d.furnishing,
    facing: d.facing,
    floorNo: nn(d.floor_no),
    totalFloors: nn(d.total_floors),
    ageYears: nn(d.age_years),
    possession: d.possession,
    builtUpArea: d.built_up_area,
    carpetArea: nn(d.carpet_area),
    areaUnit: d.area_unit,
    price: d.price,
    priceNegotiable: d.price_negotiable || false,
    maintenance: nn(d.maintenance),
    address: d.address,
    locality: d.locality,
    city: d.city,
    state: d.state,
    pincode: d.pincode,
    amenities: d.amenities || [],
    coverImage: cover,
    videoUrl: d.video_url,
    floorPlanUrl: d.floor_plan_url,
    tourUrl: tour.tour_url,
    tourProvider: tour.tour_provider,
    status: d.status || 'active',
  });

  if (images.length) {
    await PropertyImage.insertMany(images.map((url, i) => ({ property: property._id, url, sortOrder: i })));
  }

  await PriceHistory.create({ property: property._id, price: d.price, alerted: true });

  const row = await Property.findById(property._id)
    .populate({ path: 'user', select: 'name role companyName avatarUrl isVerified' })
    .lean();
  res.status(201).json({ data: shapeDoc(row) });
}));

router.put('/:id', requireAuth, asyncHandler(async (req, res) => {
  const id = req.params.id;
  const existing = await Property.findById(id).select('user price').lean();
  if (!existing) throw new HttpError(404, 'Property not found');
  if (existing.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    throw new HttpError(403, 'You can only edit your own listings');
  }

  const d = z.object({
    title: z.string().min(8).max(200).optional(),
    description: z.string().max(5000).optional().or(z.literal('')),
    purpose: z.enum(['sale', 'rent', 'pg', 'lease']).optional(),
    property_type: z.enum(['apartment', 'villa', 'independent-house', 'plot', 'office', 'shop', 'warehouse', 'farmhouse']).optional(),
    bhk: z.coerce.number().int().min(0).max(20).optional(),
    bathrooms: z.coerce.number().int().min(0).max(20).optional(),
    balconies: z.coerce.number().int().min(0).max(20).optional(),
    furnishing: z.enum(['unfurnished', 'semi-furnished', 'fully-furnished']).optional(),
    facing: z.string().max(30).optional().or(z.literal('')),
    floor_no: z.coerce.number().int().min(-5).max(200).optional(),
    total_floors: z.coerce.number().int().min(0).max(200).optional(),
    age_years: z.coerce.number().int().min(0).max(100).optional(),
    possession: z.enum(['ready-to-move', 'under-construction']).optional(),
    built_up_area: z.coerce.number().int().min(1).optional(),
    carpet_area: z.coerce.number().int().min(0).optional(),
    area_unit: z.enum(['sqft', 'sqyd', 'acre', 'cent']).optional(),
    price: z.coerce.number().int().min(1).optional(),
    price_negotiable: z.coerce.boolean().optional(),
    maintenance: z.coerce.number().int().min(0).optional(),
    address: z.string().max(255).optional().or(z.literal('')),
    locality: z.string().min(2).max(120).optional(),
    city: z.string().min(2).max(80).optional(),
    state: z.string().max(80).optional().or(z.literal('')),
    pincode: z.string().max(10).optional().or(z.literal('')),
    amenities: z.array(z.string()).optional(),
    cover_image: z.string().max(400).optional().or(z.literal('')),
    status: z.enum(['active', 'sold', 'rented', 'inactive']).optional(),
    tour_embed: z.string().max(4000).optional().or(z.literal('')),
    video_url: z.string().max(600).optional().or(z.literal('')),
    floor_plan_url: z.string().max(400).optional().or(z.literal('')),
    images: z.array(z.string().max(400)).max(15).optional(),
  }).partial().parse(req.body);

  const update = {};
  const map = {
    title: 'title', description: 'description', purpose: 'purpose', property_type: 'propertyType',
    bhk: 'bhk', bathrooms: 'bathrooms', balconies: 'balconies', furnishing: 'furnishing',
    facing: 'facing', floor_no: 'floorNo', total_floors: 'totalFloors', age_years: 'ageYears',
    possession: 'possession', built_up_area: 'builtUpArea', carpet_area: 'carpetArea',
    area_unit: 'areaUnit', price: 'price', price_negotiable: 'priceNegotiable',
    maintenance: 'maintenance', address: 'address', locality: 'locality', city: 'city',
    state: 'state', pincode: 'pincode', status: 'status', video_url: 'videoUrl',
    floor_plan_url: 'floorPlanUrl',
  };

  for (const [k, v] of Object.entries(d)) {
    if (v === undefined) continue;
    if (k === 'images') continue;
    if (k === 'cover_image') {
      update.coverImage = nn(v);
      continue;
    }
    if (k === 'tour_embed') {
      const tour = tourColumns(nn(v));
      if (tour) { update.tourUrl = tour.tour_url; update.tourProvider = tour.tour_provider; }
      continue;
    }
    const mongoKey = map[k];
    if (mongoKey) update[mongoKey] = nn(v);
  }
  if (d.amenities) update.amenities = d.amenities;

  if (Object.keys(update).length) {
    update.aiSummary = null;
    update.aiSummaryAt = null;
    update.aiSummarySource = null;
    await Property.findByIdAndUpdate(id, { $set: update });
  }

  if (d.price !== undefined && Number(d.price) !== Number(existing.price)) {
    await PriceHistory.create({ property: id, price: Number(d.price) });
  }

  if (d.images) {
    await PropertyImage.deleteMany({ property: id });
    await PropertyImage.insertMany(d.images.map((url, i) => ({ property: id, url, sortOrder: i })));
    if (!d.cover_image && d.images[0]) {
      await Property.findByIdAndUpdate(id, { $set: { coverImage: d.images[0] } });
    }
  }

  const row = await Property.findById(id)
    .populate({ path: 'user', select: 'name role companyName avatarUrl isVerified' })
    .lean();
  res.json({ data: shapeDoc(row) });
}));

router.delete('/:id', requireAuth, asyncHandler(async (req, res) => {
  const id = req.params.id;
  const existing = await Property.findById(id).select('user').lean();
  if (!existing) throw new HttpError(404, 'Property not found');
  if (existing.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    throw new HttpError(403, 'You can only delete your own listings');
  }
  await Property.findByIdAndDelete(id);
  res.json({ message: 'Listing deleted' });
}));

router.post('/:id/favorite', requireAuth, asyncHandler(async (req, res) => {
  const id = req.params.id;
  const existing = await Favorite.findOne({ user: req.user._id, property: id }).select('_id').lean();
  if (existing) {
    await Favorite.findByIdAndDelete(existing._id);
    return res.json({ is_favorite: false });
  }
  await Favorite.create({ user: req.user._id, property: id });
  res.json({ is_favorite: true });
}));

router.get('/favorites/mine', requireAuth, asyncHandler(async (req, res) => {
  const favs = await Favorite.find({ user: req.user._id }).populate({
    path: 'property',
    populate: { path: 'user', select: 'name role companyName avatarUrl isVerified' },
  }).lean();

  const items = favs.map((f) => shapeDoc(f.property)).filter(Boolean);
  res.json({ data: items });
}));

router.get('/meta/tour-providers', (_req, res) => {
  res.json({ data: allowedHosts() });
});

router.get('/meta/assistant', (_req, res) => {
  res.json({ data: { enabled: bot.hasKey(), suggestions: bot.SUGGESTED } });
});

const botLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many assistant requests. Please try again in a few minutes.' },
});

router.get('/:id/summary', botLimiter, asyncHandler(async (req, res) => {
  const property = await Property.findById(req.params.id)
    .populate({ path: 'user', select: 'name role companyName reraId experienceYears isVerified' })
    .lean();
  if (!property) throw new HttpError(404, 'Property not found');
  const imageCount = await PropertyImage.countDocuments({ property: property._id });

  const enriched = { ...property, image_count: imageCount };
  if (property.aiSummary && req.query.refresh !== '1') {
    return res.json({
      data: {
        summary: property.aiSummary,
        cached: true,
        source: property.aiSummarySource,
        generated_at: property.aiSummaryAt,
      },
    });
  }

  try {
    const { summary, source } = await bot.summarise(enriched);
    await Property.findByIdAndUpdate(property._id, { aiSummary: summary, aiSummaryAt: new Date(), aiSummarySource: source });
    res.json({ data: { summary, cached: false, source } });
  } catch (e) {
    if (e.code === 'REFUSAL') throw new HttpError(422, 'The assistant could not summarise this listing.');
    console.error('[bot] summary failed:', e.message);
    res.json({ data: { summary: bot.templateSummary(enriched), cached: false, source: 'template' } });
  }
}));

router.post('/:id/ask', botLimiter, asyncHandler(async (req, res) => {
  const { question, history } = z.object({
    question: z.string().min(2, 'Please type a question').max(500),
    history: z.array(z.object({
      role: z.enum(['user', 'assistant']),
      content: z.string().max(4000),
    })).max(20).optional(),
  }).parse(req.body);

  const property = await Property.findById(req.params.id)
    .populate({ path: 'user', select: 'name role companyName reraId experienceYears isVerified' })
    .lean();
  if (!property) throw new HttpError(404, 'Property not found');
  const imageCount = await PropertyImage.countDocuments({ property: property._id });
  const enriched = { ...property, image_count: imageCount };

  try {
    const { answer } = await bot.ask(enriched, question, history || []);
    res.json({ data: { answer } });
  } catch (e) {
    if (e.code === 'NO_API_KEY') {
      throw new HttpError(503, 'The AI assistant is not configured on this server. Add ANTHROPIC_API_KEY to server/.env to enable it.');
    }
    if (e.code === 'REFUSAL') throw new HttpError(422, 'The assistant could not answer that. Try rephrasing.');
    console.error('[bot] ask failed:', e.message);
    throw new HttpError(502, 'The assistant is temporarily unavailable. Please try again.');
  }
}));

router.post('/search-assistant', botLimiter, asyncHandler(async (req, res) => {
  const { query: text } = z.object({
    query: z.string().min(2, 'Tell us what you are looking for').max(300),
  }).parse(req.body);

  const [cityRows, localityRows] = await Promise.all([
    Property.distinct('city', { status: 'active' }),
    Property.distinct('locality', { status: 'active' }),
  ]);

  const { filters, interpretation, source } = await searchBot.parseQuery(text, {
    cities: cityRows,
    localities: localityRows,
  });

  const params = searchBot.toQueryParams(filters);
  const understood = !searchBot.isEmpty(filters);
  const effective = understood ? params : { q: text };

  const { filter, sort } = buildFilter(effective);
  const orderBy = /\bcheap|affordable|budget|lowest\b/i.test(text) && !filters.maxPrice
    ? { price: 1 }
    : { isFeatured: -1, price: 1 };

  const [rows, total] = await Promise.all([
    Property.find(filter)
      .populate({ path: 'user', select: 'name role companyName avatarUrl isVerified' })
      .sort(orderBy)
      .limit(6)
      .lean(),
    Property.countDocuments(filter),
  ]);

  res.json({
    data: {
      interpretation: understood ? interpretation : `We couldn't pin that down to filters, so here's a text search for "${text}".`,
      understood,
      filters,
      params: effective,
      results: rows.map(shapeDoc),
      total,
      source,
    },
  });
}));

module.exports = router;



// trigger restart
