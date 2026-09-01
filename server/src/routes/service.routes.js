const router = require('express').Router();
const { z } = require('zod');
const ServiceOffering = require('../models/ServiceOffering');
const Lead = require('../models/Lead');
const { requireAuth, requireRole } = require('../middleware/auth');
const { asyncHandler, makeSlug, nn, paginate, HttpError } = require('../utils/helpers');

router.get('/', asyncHandler(async (req, res) => {
  const { page, limit, offset } = paginate(req.query);
  const filter = { status: 'active' };
  if (req.query.category) filter.category = req.query.category;
  if (req.query.city) filter.city = req.query.city;
  if (req.query.provider) filter.user = req.query.provider;
  if (req.query.q) {
    filter.$or = [
      { title: { $regex: req.query.q, $options: 'i' } },
      { category: { $regex: req.query.q, $options: 'i' } },
      { description: { $regex: req.query.q, $options: 'i' } },
    ];
  }

  const [items, total] = await Promise.all([
    ServiceOffering.find(filter)
      .populate({ path: 'user', select: 'name companyName phone avatarUrl experienceYears isVerified' })
      .sort({ rating: -1, createdAt: -1 })
      .skip(offset)
      .limit(limit)
      .lean(),
    ServiceOffering.countDocuments(filter),
  ]);

  res.json({ data: items, page, limit, total, pages: Math.ceil(total / limit) });
}));

router.get('/meta/categories', asyncHandler(async (_req, res) => {
  const data = await ServiceOffering.aggregate([
    { $match: { status: 'active' } },
    { $group: { _id: '$category', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);
  res.json({ data: data.map((d) => ({ category: d._id, count: d.count })) });
}));

router.get('/mine/list', requireAuth, requireRole('service', 'admin'), asyncHandler(async (req, res) => {
  const items = await ServiceOffering.find({ user: req.user._id })
    .populate({ path: 'user', select: 'name companyName phone avatarUrl experienceYears isVerified' })
    .sort({ createdAt: -1 })
    .lean();

  const svcIds = items.map((s) => s._id);
  const leadCounts = await Lead.aggregate([
    { $match: { service: { $in: svcIds } } },
    { $group: { _id: '$service', count: { $sum: 1 } } },
  ]);
  const countMap = Object.fromEntries(leadCounts.map((c) => [String(c._id), c.count]));

  res.json({ data: items.map((s) => ({ ...s, lead_count: countMap[String(s._id)] || 0 })) });
}));

router.get('/:idOrSlug', asyncHandler(async (req, res) => {
  const key = req.params.idOrSlug;
  const byId = /^[0-9a-fA-F]{24}$/.test(key);
  const query = byId ? { _id: key } : { slug: key };

  const service = await ServiceOffering.findOne(query)
    .populate({ path: 'user', select: 'name email about phone avatarUrl experienceYears isVerified' })
    .lean();
  if (!service) throw new HttpError(404, 'Service not found');

  const related = await ServiceOffering.find({
    category: service.category,
    _id: { $ne: service._id },
    status: 'active',
  })
    .populate({ path: 'user', select: 'name companyName phone avatarUrl isVerified' })
    .limit(3)
    .lean();

  res.json({ data: { ...service, related } });
}));

router.post('/', requireAuth, requireRole('service', 'admin'), asyncHandler(async (req, res) => {
  const d = z.object({
    title: z.string().min(5).max(180),
    category: z.string().min(2).max(80),
    description: z.string().max(4000).optional(),
    price_from: z.coerce.number().int().min(0).optional(),
    price_unit: z.string().max(40).optional(),
    city: z.string().max(80).optional(),
    cover_image: z.string().max(400).optional(),
    status: z.enum(['active', 'inactive']).optional(),
  }).parse(req.body);

  const slug = await makeSlug('service_offerings', d.title);
  const service = await ServiceOffering.create({
    user: req.user._id,
    title: d.title,
    slug,
    category: d.category,
    description: d.description,
    priceFrom: nn(d.price_from),
    priceUnit: nn(d.price_unit),
    city: nn(d.city),
    coverImage: nn(d.cover_image),
    status: d.status || 'active',
  });

  res.status(201).json({ data: await ServiceOffering.findById(service._id)
    .populate({ path: 'user', select: 'name companyName phone avatarUrl isVerified' }).lean() });
}));

router.put('/:id', requireAuth, requireRole('service', 'admin'), asyncHandler(async (req, res) => {
  const id = req.params.id;
  const existing = await ServiceOffering.findById(id).select('user').lean();
  if (!existing) throw new HttpError(404, 'Service not found');
  if (existing.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') throw new HttpError(403, 'Not allowed');

  const d = z.object({
    title: z.string().min(5).max(180).optional(),
    category: z.string().min(2).max(80).optional(),
    description: z.string().max(4000).optional().or(z.literal('')),
    price_from: z.coerce.number().int().min(0).optional(),
    price_unit: z.string().max(40).optional().or(z.literal('')),
    city: z.string().max(80).optional().or(z.literal('')),
    cover_image: z.string().max(400).optional().or(z.literal('')),
    status: z.enum(['active', 'inactive']).optional(),
  }).partial().parse(req.body);

  const update = {};
  const map = { title: 'title', category: 'category', description: 'description', price_from: 'priceFrom', price_unit: 'priceUnit', city: 'city', status: 'status' };
  for (const [k, v] of Object.entries(d)) {
    if (v === undefined) continue;
    const mongoKey = map[k];
    if (mongoKey) update[mongoKey] = nn(v);
  }
  if (d.cover_image !== undefined) update.coverImage = nn(d.cover_image);

  if (Object.keys(update).length) {
    await ServiceOffering.findByIdAndUpdate(id, { $set: update });
  }
  res.json({ data: await ServiceOffering.findById(id)
    .populate({ path: 'user', select: 'name companyName phone avatarUrl isVerified' }).lean() });
}));

router.delete('/:id', requireAuth, requireRole('service', 'admin'), asyncHandler(async (req, res) => {
  const id = req.params.id;
  const existing = await ServiceOffering.findById(id).select('user').lean();
  if (!existing) throw new HttpError(404, 'Service not found');
  if (existing.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') throw new HttpError(403, 'Not allowed');
  await ServiceOffering.findByIdAndDelete(id);
  res.json({ message: 'Service removed' });
}));

module.exports = router;
