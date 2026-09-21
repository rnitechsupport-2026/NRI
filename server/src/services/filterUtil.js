const mongoose = require('mongoose');
const Property = require('../models/Property');
const User = require('../models/User');

const POSTED_BY_ROLES = ['owner', 'agent', 'builder', 'service'];

async function buildFilterFromParams(q = {}) {
  const filter = { status: 'active' };

  if (q.purpose) filter.purpose = q.purpose;
  if (q.type) {
    const types = String(q.type).split(',').filter(Boolean);
    if (types.length) filter.propertyType = { $in: types };
  }
  if (q.city) filter.city = q.city;
  if (q.locality) filter.locality = new RegExp(q.locality.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  if (q.bhk) {
    const bhks = String(q.bhk).split(',').map(Number).filter(Boolean);
    if (bhks.length) filter.bhk = { $in: bhks };
  }
  if (q.minPrice) filter.price = { ...filter.price, $gte: Number(q.minPrice) };
  if (q.maxPrice) filter.price = { ...filter.price, $lte: Number(q.maxPrice) };
  if (q.minArea) filter.builtUpArea = { $gte: Number(q.minArea) };
  if (q.furnishing) filter.furnishing = q.furnishing;
  if (q.possession) filter.possession = q.possession;
  if (q.postedBy && POSTED_BY_ROLES.includes(q.postedBy)) {
    const posters = await User.find({ role: q.postedBy }).select('_id').lean();
    filter.user = { $in: posters.map((u) => u._id) };
  }
  if (q.owner && mongoose.Types.ObjectId.isValid(q.owner)) filter.user = q.owner;
  if (q.featured === 'true' || q.featured === true) filter.isFeatured = true;
  if (q.verified === 'true' || q.verified === true) filter.isVerified = true;
  if (q.hasTour === 'true' || q.hasTour === true) filter.tourUrl = { $ne: null, $exists: true };
  if (q.amenities) {
    const amens = String(q.amenities).split(',').filter(Boolean);
    if (amens.length) filter.amenities = { $all: amens };
  }
  if (q.q) {
    filter.$or = [
      { title: new RegExp(q.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') },
      { locality: new RegExp(q.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') },
      { city: new RegExp(q.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') },
      { description: new RegExp(q.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') },
    ];
  }

  return { filter };
}

const SORTS = {
  newest: { createdAt: -1 },
  'price-low': { price: 1 },
  'price-high': { price: -1 },
  'area-high': { builtUpArea: -1 },
  popular: { views: -1 },
};

module.exports = { buildFilterFromParams, SORTS };
