const router = require('express').Router();
const Property = require('../models/Property');
const Project = require('../models/Project');
const ServiceOffering = require('../models/ServiceOffering');
const Lead = require('../models/Lead');
const Favorite = require('../models/Favorite');
const User = require('../models/User');
const { requireAuth } = require('../middleware/auth');
const { asyncHandler } = require('../utils/helpers');

router.get('/public', asyncHandler(async (_req, res) => {
  const [props, projects, agents, builders, services, cities] = await Promise.all([
    Property.countDocuments({ status: 'active' }),
    Project.countDocuments({}),
    User.countDocuments({ role: 'agent', status: 'active' }),
    User.countDocuments({ role: 'builder', status: 'active' }),
    ServiceOffering.countDocuments({ status: 'active' }),
    Property.distinct('city', { status: 'active' }),
  ]);
  res.json({
    data: {
      properties: props, projects: projects, agents: agents,
      builders: builders, services: services, cities: cities.length,
    },
  });
}));

router.get('/dashboard', requireAuth, asyncHandler(async (req, res) => {
  const uid = req.user._id;

  const [listings, active, views, leadsTotal, leadsNew, favs] = await Promise.all([
    Property.countDocuments({ user: uid }),
    Property.countDocuments({ user: uid, status: 'active' }),
    Property.aggregate([{ $match: { user: uid } }, { $group: { _id: null, total: { $sum: '$views' } } }]),
    Lead.countDocuments({ receiver: uid }),
    Lead.countDocuments({ receiver: uid, status: 'new' }),
    Favorite.countDocuments({ user: uid }),
  ]);

  const data = {
    listings: listings,
    active_listings: active,
    views: views[0]?.total || 0,
    leads: leadsTotal,
    new_leads: leadsNew,
    shortlisted: favs,
  };

  if (req.user.role === 'builder') {
    const [p, v] = await Promise.all([
      Project.countDocuments({ builder: uid }),
      Project.aggregate([{ $match: { builder: uid } }, { $group: { _id: null, total: { $sum: '$views' } } }]),
    ]);
    data.projects = p;
    data.project_views = v[0]?.total || 0;
  }
  if (req.user.role === 'service') {
    data.services = await ServiceOffering.countDocuments({ user: uid });
  }

  // These four are all independent of each other — only leadCounts below
  // actually depends on topListings, so it's the one query left sequential.
  // No name/phone-bearing lead list here — enquiries are managed centrally
  // now (see admin.routes.js), so listers only get aggregate counts.
  const [leadsByStatus, topListings, trend, weekRaw] = await Promise.all([
    Lead.aggregate([
      { $match: { receiver: uid } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    Property.find({ user: uid })
      .sort({ views: -1 })
      .limit(5)
      .lean(),
    Lead.aggregate([
      { $match: { receiver: uid, createdAt: { $gte: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000) } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    Lead.aggregate([
      { $match: { receiver: uid, createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } } },
      { $group: { _id: { $isoDayOfWeek: '$createdAt' }, count: { $sum: 1 } } },
    ]),
  ]);

  const leadCounts = await Lead.aggregate([
    { $match: { property: { $in: topListings.map((p) => p._id) } } },
    { $group: { _id: '$property', count: { $sum: 1 } } },
  ]);
  const leadCountMap = Object.fromEntries(leadCounts.map((c) => [String(c._id), c.count]));

  // Real month-over-month change on the one metric we actually have history
  // for — never fabricate a trend badge for metrics without a baseline.
  let leadsTrendPct = null;
  if (trend.length >= 2) {
    const current = trend[trend.length - 1].count;
    const previous = trend[trend.length - 2].count;
    if (previous > 0) leadsTrendPct = Math.round(((current - previous) / previous) * 100);
  }

  const DAY_LABEL = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const weekMap = Object.fromEntries(weekRaw.map((w) => [w._id, w.count]));
  const trendWeek = DAY_LABEL.map((day, i) => ({ day, count: weekMap[i + 1] || 0 }));

  res.json({
    data: {
      ...data,
      leads_by_status: leadsByStatus.map((s) => ({ status: s._id, count: s.count })),
      top_listings: topListings.map((p) => ({
        ...p,
        cover_image: p.coverImage,
        lead_count: leadCountMap[String(p._id)] || 0,
      })),
      trend: trend.map((t) => ({ month: t._id, count: t.count })),
      trend_week: trendWeek,
      leads_trend_pct: leadsTrendPct,
    },
  });
}));

module.exports = router;
