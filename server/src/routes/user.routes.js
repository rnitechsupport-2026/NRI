const router = require('express').Router();
const User = require('../models/User');
const Property = require('../models/Property');
const Project = require('../models/Project');
const ServiceOffering = require('../models/ServiceOffering');
const { asyncHandler, paginate, HttpError, toSnakeCase } = require('../utils/helpers');

function shapePublicUser(doc) {
  if (!doc) return null;
  const obj = doc.toObject ? doc.toObject() : doc;
  obj.id = String(obj._id || doc._id || '');
  return toSnakeCase(obj);
}

router.get('/', asyncHandler(async (req, res) => {
  const { page, limit, offset } = paginate(req.query);
  const filter = { status: 'active', role: { $ne: 'admin' } };
  if (req.query.role) filter.role = req.query.role;
  if (req.query.city) filter.city = req.query.city;
  if (req.query.verified === 'true') filter.isVerified = true;
  if (req.query.q) {
    filter.$or = [
      { name: { $regex: req.query.q, $options: 'i' } },
      { companyName: { $regex: req.query.q, $options: 'i' } },
      { city: { $regex: req.query.q, $options: 'i' } },
    ];
  }

  const [items, total] = await Promise.all([
    User.find(filter)
      .select('name role companyName reraId serviceCategory experienceYears city locality about avatarUrl website isVerified createdAt')
      .sort({ isVerified: -1, createdAt: -1 })
      .skip(offset)
      .limit(limit)
      .lean(),
    User.countDocuments(filter),
  ]);

  const userIds = items.map((u) => u._id);
  const [propCounts, projectCounts] = await Promise.all([
    Property.aggregate([
      { $match: { user: { $in: userIds }, status: 'active' } },
      { $group: { _id: '$user', count: { $sum: 1 } } },
    ]),
    Project.aggregate([
      { $match: { builder: { $in: userIds } } },
      { $group: { _id: '$builder', count: { $sum: 1 } } },
    ]),
  ]);
  const propMap = Object.fromEntries(propCounts.map((c) => [String(c._id), c.count]));
  const projMap = Object.fromEntries(projectCounts.map((c) => [String(c._id), c.count]));

  res.json({
    data: items.map((u) => ({
      ...shapePublicUser(u),
      property_count: propMap[String(u._id)] || 0,
      project_count: projMap[String(u._id)] || 0,
    })),
    page, limit, total, pages: Math.ceil(total / limit),
  });
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const id = req.params.id;
  if (!/^[0-9a-fA-F]{24}$/.test(id)) throw new HttpError(404, 'Profile not found');
  const user = await User.findById(id)
    .select('name role companyName reraId serviceCategory experienceYears city locality about avatarUrl website isVerified status phone email createdAt')
    .lean();
  if (!user || user.status !== 'active') throw new HttpError(404, 'Profile not found');

  const properties = await Property.find({ user: id, status: 'active' })
    .select('title slug purpose propertyType bhk builtUpArea areaUnit price locality city coverImage isVerified createdAt')
    .sort({ createdAt: -1 })
    .limit(12)
    .lean();

  const projects = user.role === 'builder'
    ? await Project.find({ builder: id })
        .select('name slug tagline configuration minPrice maxPrice locality city coverImage status possessionOn')
        .sort({ createdAt: -1 })
        .limit(12)
        .lean()
    : [];

  const services = user.role === 'service'
    ? await ServiceOffering.find({ user: id, status: 'active' })
        .select('title slug category priceFrom priceUnit city coverImage rating')
        .limit(12)
        .lean()
    : [];

  res.json({
    data: {
      ...shapePublicUser(user),
      properties: properties.map(shapePublicUser),
      projects: projects.map(shapePublicUser),
      services: services.map(shapePublicUser),
    },
  });
}));

module.exports = router;
