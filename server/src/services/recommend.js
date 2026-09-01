const mongoose = require('mongoose');
const Property = require('../models/Property');
const User = require('../models/User');
const Favorite = require('../models/Favorite');
const Lead = require('../models/Lead');

const CARD = 'title slug purpose propertyType bhk bathrooms builtUpArea areaUnit price locality city coverImage tourUrl isFeatured isVerified status views createdAt';

function scoreExpr({ city, locality, purpose, type, bhk, price }) {
  const parts = [];
  if (locality) parts.push({ $cond: [{ $eq: ['$locality', locality] }, 30, 0] });
  if (city) parts.push({ $cond: [{ $eq: ['$city', city] }, 20, 0] });
  if (purpose) parts.push({ $cond: [{ $eq: ['$purpose', purpose] }, 15, 0] });
  if (type) parts.push({ $cond: [{ $eq: ['$propertyType', type] }, 12, 0] });
  if (bhk) parts.push({ $cond: [{ $eq: ['$bhk', Number(bhk)] }, 15, 0] });
  if (price) {
    parts.push({
      $cond: [
        { $gt: [price, 0] },
        { $max: [0, { $subtract: [25, { $multiply: [{ $divide: [{ $abs: { $subtract: ['$price', price] } }, price] }, 50] }] }] },
        0,
      ],
    });
  }
  parts.push({ $cond: [{ $eq: ['$isVerified', true] }, 5, 0] });
  parts.push({ $cond: [{ $ne: ['$tourUrl', null] }, 3, 0] });
  return { $sum: parts };
}

function why(item, ref) {
  const bits = [];
  if (ref.locality && item.locality === ref.locality) bits.push(`same locality (${item.locality})`);
  else if (ref.city && item.city === ref.city) bits.push(`same city`);
  if (ref.bhk && item.bhk === ref.bhk) bits.push(`${item.bhk} BHK like yours`);
  if (ref.price) {
    const diff = (Number(item.price) - Number(ref.price)) / Number(ref.price);
    if (Math.abs(diff) <= 0.15) bits.push('similar budget');
    else if (diff < 0) bits.push(`${Math.round(Math.abs(diff) * 100)}% cheaper`);
  }
  if (item.isVerified) bits.push('verified');
  if (item.tourUrl) bits.push('has a 3D tour');
  return bits.length ? bits.slice(0, 3).join(' · ') : 'Popular in this area';
}

async function run(ref, { exclude = [], limit = 6 } = {}) {
  const match = { status: 'active' };
  if (exclude.length) match._id = { $nin: exclude.map((id) => new mongoose.Types.ObjectId(id)) };

  const scoreExprVal = scoreExpr(ref);

  const rows = await Property.aggregate([
    { $match: match },
    {
      $lookup: {
        from: 'users',
        localField: 'user',
        foreignField: '_id',
        as: 'owner',
      },
    },
    { $unwind: '$owner' },
    {
      $addFields: {
        match_score: scoreExprVal,
      },
    },
    { $match: { match_score: { $gt: 0 } } },
    { $sort: { match_score: -1, isFeatured: -1, views: -1 } },
    { $limit: Number(limit) },
    {
      $project: {
        title: 1, slug: 1, purpose: 1, propertyType: 1, bhk: 1, bathrooms: 1,
        builtUpArea: 1, areaUnit: 1, price: 1, locality: 1, city: 1, coverImage: 1,
        tourUrl: 1, isFeatured: 1, isVerified: 1, status: 1, views: 1, createdAt: 1,
        'owner._id': 1, 'owner.name': 1, 'owner.role': 1, 'owner.companyName': 1,
        'owner.avatarUrl': 1, 'owner.isVerified': 1, match_score: 1,
      },
    },
  ]);

  return rows.map((r) => {
    const owner = r.owner || {};
    return {
      ...r,
      owner_id: owner._id,
      owner_name: owner.name,
      owner_role: owner.role,
      owner_company: owner.companyName,
      owner_avatar: owner.avatarUrl,
      owner_verified: owner.isVerified,
      why: why(r, ref),
    };
  });
}

async function forProperty(p, limit = 6) {
  return run(
    { city: p.city, locality: p.locality, purpose: p.purpose, type: p.propertyType, bhk: p.bhk, price: p.price },
    { exclude: [p._id || p.id], limit }
  );
}

async function forUser(userId, limit = 6) {
  const pipeline = [
    {
      $facet: {
        favs: [
          { $match: { user: new mongoose.Types.ObjectId(userId) } },
          { $lookup: { from: 'properties', localField: 'property', foreignField: '_id', as: 'p' } },
          { $unwind: '$p' },
          { $project: { 'p.city': 1, 'p.locality': 1, 'p.purpose': 1, 'p.propertyType': 1, 'p.bhk': 1, 'p.price': 1 } },
        ],
        leads: [
          { $match: { sender: new mongoose.Types.ObjectId(userId), property: { $ne: null } } },
          { $lookup: { from: 'properties', localField: 'property', foreignField: '_id', as: 'p' } },
          { $unwind: '$p' },
          { $project: { 'p.city': 1, 'p.locality': 1, 'p.purpose': 1, 'p.propertyType': 1, 'p.bhk': 1, 'p.price': 1 } },
        ],
      },
    },
    {
      $project: {
        signals: { $concatArrays: ['$favs', '$leads'] },
      },
    },
  ];

  const [agg] = await Property.aggregate(pipeline);
  const signals = agg?.signals || [];

  if (!signals.length) {
    const rows = await Property.aggregate([
      { $match: { status: 'active' } },
      { $lookup: { from: 'users', localField: 'user', foreignField: '_id', as: 'owner' } },
      { $unwind: '$owner' },
      { $sort: { isFeatured: -1, views: -1 } },
      { $limit: Number(limit) },
      {
        $project: {
          title: 1, slug: 1, purpose: 1, propertyType: 1, bhk: 1, bathrooms: 1,
          builtUpArea: 1, areaUnit: 1, price: 1, locality: 1, city: 1, coverImage: 1,
          tourUrl: 1, isFeatured: 1, isVerified: 1, status: 1, views: 1, createdAt: 1,
          'owner._id': 1, 'owner.name': 1, 'owner.role': 1, 'owner.companyName': 1,
          'owner.avatarUrl': 1, 'owner.isVerified': 1,
        },
      },
    ]);
    return { basis: 'popular', items: rows.map((r) => ({ ...r, why: 'Popular right now' })) };
  }

  const mode = (key) => {
    const counts = {};
    signals.forEach((s) => { if (s[key] != null) counts[s[key]] = (counts[s[key]] || 0) + 1; });
    const best = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    return best ? best[0] : null;
  };
  const avgPrice = Math.round(signals.reduce((a, s) => a + Number(s.price), 0) / signals.length);

  const ref = {
    city: mode('city'), locality: mode('locality'), purpose: mode('purpose'),
    type: mode('propertyType'), bhk: mode('bhk') ? Number(mode('bhk')) : null, price: avgPrice,
  };

  const seen = await Favorite.find({ user: userId }).select('property').lean();
  const seenLeads = await Lead.find({ sender: userId, property: { $ne: null } }).select('property').lean();
  const exclude = [...seen.map((s) => s.property), ...seenLeads.map((s) => s.property)];

  const items = await run(ref, { exclude: exclude.map((id) => id.toString()), limit });
  return { basis: 'history', ref, items };
}

async function forLead(lead, limit = 6) {
  const ref = {
    city: lead.prefCity, locality: lead.prefLocality, purpose: lead.prefPurpose,
    bhk: lead.prefBhk ? Number(lead.prefBhk) : null,
    price: lead.budgetMax ? Number(lead.budgetMax) : null,
  };
  const exclude = [lead.property].filter(Boolean).map((id) => id.toString());
  const items = await run(ref, { exclude, limit });
  const affordable = lead.budgetMax
    ? items.filter((i) => Number(i.price) <= Number(lead.budgetMax) * 1.1)
    : items;
  return { ref, items: affordable };
}

module.exports = { forProperty, forUser, forLead };
