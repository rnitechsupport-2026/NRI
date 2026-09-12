const router = require('express').Router();
const { z } = require('zod');
const mongoose = require('mongoose');
const Property = require('../models/Property');
const Project = require('../models/Project');
const ServiceOffering = require('../models/ServiceOffering');
const Lead = require('../models/Lead');
const User = require('../models/User');
const SiteVisit = require('../models/SiteVisit');
const Favorite = require('../models/Favorite');
const SavedSearch = require('../models/SavedSearch');
const Notification = require('../models/Notification');
const Outbox = require('../models/Outbox');
const PriceHistory = require('../models/PriceHistory');
const LeadDocument = require('../models/LeadDocument');
const { requireAuth, optionalAuth } = require('../middleware/auth');
const { asyncHandler, nn, HttpError, objectId } = require('../utils/helpers');
const flows = require('../services/flows');
const leadEngine = require('../services/leadEngine');
const recommend = require('../services/recommend');
const notify = require('../services/notify');

router.get('/flows/:name', asyncHandler(async (req, res) => {
  const flow = flows.getFlow(req.params.name);
  if (!flow) throw new HttpError(404, 'Unknown flow');
  res.json({ data: flow });
}));

router.post('/qualify', optionalAuth, asyncHandler(async (req, res) => {
  const d = z.object({
    name: z.string().min(2, 'Enter your name').max(120),
    phone: z.string().regex(/^[0-9]{10}$/, 'Enter a valid 10 digit mobile number'),
    email: z.string().email().optional().or(z.literal('')),
    property_id: objectId('Invalid property').optional(),
    pref_purpose: z.enum(['sale', 'rent', 'pg', 'lease']).optional(),
    pref_bhk: z.string().max(20).optional().or(z.literal('')),
    pref_city: z.string().max(80).optional().or(z.literal('')),
    pref_locality: z.string().max(120).optional().or(z.literal('')),
    budget_min: z.coerce.number().int().min(0).optional(),
    budget_max: z.coerce.number().int().min(0).optional(),
    timeline: z.enum(['immediate', '1-3-months', '3-6-months', 'just-looking']).optional(),
    finance: z.enum(['loan', 'self', 'not-sure']).optional(),
    message: z.string().max(1000).optional().or(z.literal('')),
  }).parse(req.body);

  let receiver_id = null;
  let source = 'contact';
  if (d.property_id) {
    const p = await Property.findById(d.property_id).select('user').lean();
    if (!p) throw new HttpError(404, 'Property not found');
    receiver_id = p.user; source = 'property';
  } else {
    const admin = await User.findOne({ role: 'admin' }).select('_id').lean();
    if (!admin) throw new HttpError(400, 'No recipient available');
    receiver_id = admin._id;
  }

  const summary = [
    d.pref_bhk ? `${d.pref_bhk} BHK` : null,
    d.pref_purpose ? `to ${d.pref_purpose === 'sale' ? 'buy' : d.pref_purpose}` : null,
    d.pref_locality || d.pref_city ? `in ${[d.pref_locality, d.pref_city].filter(Boolean).join(', ')}` : null,
    d.budget_max ? `budget up to ${notify.money(d.budget_max)}` : null,
    d.timeline ? `timeline: ${d.timeline.replace(/-/g, ' ')}` : null,
  ].filter(Boolean).join(', ');

  const lead = await Lead.create({
    receiver: receiver_id,
    sender: req.user ? req.user._id : null,
    property: d.property_id ? new mongoose.Types.ObjectId(d.property_id) : null,
    name: d.name,
    email: nn(d.email),
    phone: d.phone,
    message: d.message || `Requirement: ${summary}`,
    source,
    prefPurpose: d.pref_purpose,
    prefBhk: nn(d.pref_bhk),
    prefCity: nn(d.pref_city),
    prefLocality: nn(d.pref_locality),
    budgetMin: nn(d.budget_min),
    budgetMax: nn(d.budget_max),
    timeline: d.timeline,
    finance: d.finance,
  });

  const scored = await leadEngine.processLead(lead._id.toString());

  await notify.notify({
    user_id: receiver_id, kind: 'system',
    title: `New ${scored?.temperature || ''} lead: ${d.name}`,
    body: summary || 'New enquiry received',
    link: '/dashboard/leads', property: d.property_id ? new mongoose.Types.ObjectId(d.property_id) : null,
  });

  const leadRow = await Lead.findById(lead._id).lean();
  const { items } = await recommend.forLead(leadRow, 4);

  res.status(201).json({
    data: {
      lead_id: lead._id,
      summary,
      temperature: scored?.temperature,
      matches: items,
      message: 'Thanks! Your requirement is with the right person — expect a call shortly.',
    },
  });
}));

router.post('/visit', optionalAuth, asyncHandler(async (req, res) => {
  const d = z.object({
    property_id: objectId('Invalid property'),
    name: z.string().min(2).max(120),
    phone: z.string().regex(/^[0-9]{10}$/, 'Enter a valid 10 digit mobile number'),
    email: z.string().email().optional().or(z.literal('')),
    visit_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Pick a date'),
    slot: z.enum(['morning', 'afternoon', 'evening']),
    notes: z.string().max(500).optional().or(z.literal('')),
  }).parse(req.body);

  const property = await Property.findById(d.property_id).select('id user title slug locality city').lean();
  if (!property) throw new HttpError(404, 'Property not found');

  const today = new Date().toISOString().slice(0, 10);
  if (d.visit_on < today) throw new HttpError(422, 'Pick a date in the future');

  const dupe = await SiteVisit.findOne({ property: property._id, phone: d.phone, visitOn: new Date(d.visit_on) }).select('_id').lean();
  if (dupe) throw new HttpError(409, 'You already have a visit booked for this property on that day');

  const leadRow = await Lead.create({
    receiver: property.user,
    sender: req.user ? req.user._id : null,
    property: property._id,
    name: d.name,
    email: nn(d.email),
    phone: d.phone,
    message: `Site visit requested for ${d.visit_on} (${d.slot}).${d.notes ? ` Note: ${d.notes}` : ''}`,
    source: 'property',
    status: 'visit-scheduled',
  });

  const visit = await SiteVisit.create({
    property: property._id,
    lead: leadRow._id,
    host: property.user,
    visitor: req.user ? req.user._id : null,
    name: d.name,
    phone: d.phone,
    email: nn(d.email),
    visitOn: new Date(d.visit_on),
    slot: d.slot,
    notes: nn(d.notes),
  });

  await leadEngine.processLead(leadRow._id.toString());

  await notify.notify({
    user_id: property.user, kind: 'visit',
    title: `Site visit requested — ${d.name}`,
    body: `${property.title} on ${d.visit_on} (${d.slot}). Confirm or suggest another time.`,
    link: '/dashboard/visits', property: property._id,
  });

  const body = `Hi ${d.name}, your site visit request for "${property.title}" on ${d.visit_on} (${d.slot}) `
    + `has been sent to the advertiser. You'll get a confirmation shortly. — RNI Realestate`;
  await notify.queueMessage({
    channel: 'whatsapp', to: d.phone, body, template: 'visit-request',
    lead_id: leadRow._id, property_id: property._id,
  });
  if (d.email) {
    await notify.queueMessage({
      channel: 'email', to: d.email, subject: `Site visit requested — ${property.title}`,
      body, template: 'visit-request', lead_id: leadRow._id, property_id: property._id,
    });
  }

  res.status(201).json({
    data: {
      visit_id: visit._id,
      status: 'requested',
      whatsapp_link: notify.whatsappLink(d.phone, body),
      message: `Visit requested for ${d.visit_on} (${d.slot}). The advertiser will confirm shortly.`,
    },
  });
}));

router.get('/visits', requireAuth, asyncHandler(async (req, res) => {
  const rows = await SiteVisit.find({
    $or: [{ host: req.user._id }, { visitor: req.user._id }],
  })
    .populate('property', 'title slug coverImage')
    .populate('lead')
    .lean();

  const visitIds = rows.map((v) => v._id);
  const feedbacks = await VisitFeedback.find({ visit: { $in: visitIds } }).lean();
  const fbMap = Object.fromEntries(feedbacks.map((f) => [String(f.visit), f]));

  res.json({ data: rows.map((v) => ({ ...v, feedback: fbMap[String(v._id)] || null })) });
}));

router.patch('/visits/:id', requireAuth, asyncHandler(async (req, res) => {
  const { status } = z.object({
    status: z.enum(['requested', 'confirmed', 'completed', 'cancelled', 'no-show']),
  }).parse(req.body);

  const visit = await SiteVisit.findById(req.params.id).lean();
  if (!visit) throw new HttpError(404, 'Visit not found');
  if (visit.host.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    throw new HttpError(403, 'Only the advertiser can update this visit');
  }

  await SiteVisit.findByIdAndUpdate(req.params.id, { status });

  if (status === 'confirmed') {
    const body = `Good news ${visit.name} — your site visit is confirmed for ${visit.visitOn.toISOString().slice(0, 10)} (${visit.slot}).`;
    await notify.queueMessage({
      channel: 'whatsapp', to: visit.phone, body, template: 'visit-confirmed',
      lead_id: visit.lead, property_id: visit.property, created_by: req.user._id,
    });
    if (visit.visitor) {
      await notify.notify({
        user_id: visit.visitor, kind: 'visit', title: 'Site visit confirmed',
        body, link: '/dashboard/visits', property: visit.property,
      });
    }
  }

  if (status === 'completed' && visit.visitor) {
    await notify.notify({
      user_id: visit.visitor, kind: 'feedback', title: 'How was the visit?',
      body: 'Tell us what you thought — it helps us send better matches.',
      link: '/dashboard/visits', property: visit.property,
    });
  }

  res.json({ data: { status } });
}));

router.post('/visits/:id/feedback', optionalAuth, asyncHandler(async (req, res) => {
  const d = z.object({
    rating: z.coerce.number().int().min(1).max(5),
    interested: z.enum(['yes', 'maybe', 'no']),
    liked: z.string().max(400).optional().or(z.literal('')),
    concerns: z.string().max(400).optional().or(z.literal('')),
    comments: z.string().max(2000).optional().or(z.literal('')),
  }).parse(req.body);

  const visit = await SiteVisit.findById(req.params.id).lean();
  if (!visit) throw new HttpError(404, 'Visit not found');

  await VisitFeedback.findOneAndUpdate(
    { visit: visit._id },
    { rating: d.rating, liked: nn(d.liked), concerns: nn(d.concerns), interested: d.interested, comments: nn(d.comments) },
    { upsert: true, new: true }
  );

  if (visit.lead) {
    if (d.interested === 'no') {
      await Lead.findByIdAndUpdate(visit.lead, { status: 'lost' });
    } else if (d.interested === 'yes') {
      await Lead.findByIdAndUpdate(visit.lead, { $set: { temperature: 'hot', score: Math.max(75, (await Lead.findById(visit.lead).select('score').lean())?.score || 75) } });
    }
  }

  await notify.notify({
    user_id: visit.host, kind: 'feedback',
    title: `Visit feedback: ${d.rating}★ from ${visit.name}`,
    body: `Interested: ${d.interested}.${d.concerns ? ` Concern: ${d.concerns}` : ''}`,
    link: '/dashboard/visits', property: visit.property,
  });

  res.status(201).json({ data: { message: 'Thanks — that helps a lot.' } });
}));

router.get('/recommend/property/:id', asyncHandler(async (req, res) => {
  const p = await Property.findById(req.params.id).select('id city locality purpose propertyType bhk price').lean();
  if (!p) throw new HttpError(404, 'Property not found');
  res.json({ data: await recommend.forProperty(p, 6) });
}));

router.get('/recommend/me', requireAuth, asyncHandler(async (req, res) => {
  res.json({ data: await recommend.forUser(req.user._id.toString(), 6) });
}));

router.get('/recommend/lead/:id', requireAuth, asyncHandler(async (req, res) => {
  const lead = await Lead.findById(req.params.id).lean();
  if (!lead) throw new HttpError(404, 'Lead not found');
  if (lead.receiver.toString() !== req.user._id.toString() && lead.assignedTo?.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    throw new HttpError(403, 'Not your lead');
  }
  res.json({ data: await recommend.forLead(lead, 6) });
}));

router.get('/documents/checklist', (req, res) => {
  const purpose = ['sale', 'rent', 'pg', 'lease'].includes(req.query.purpose) ? req.query.purpose : 'sale';
  res.json({ data: { purpose, ...flows.docChecklist(purpose) } });
});

router.get('/documents/lead/:id', requireAuth, asyncHandler(async (req, res) => {
  const lead = await Lead.findById(req.params.id).lean();
  if (!lead) throw new HttpError(404, 'Lead not found');
  if (lead.receiver.toString() !== req.user._id.toString() && lead.assignedTo?.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    throw new HttpError(403, 'Not your lead');
  }

  const saved = await LeadDocument.find({ lead: lead._id }).lean();
  const byKey = Object.fromEntries(saved.map((d) => [d.docKey, d]));
  const { buyer } = flows.docChecklist(lead.prefPurpose || 'sale');

  res.json({
    data: buyer.map((d) => ({
      ...d,
      status: byKey[d.key]?.status || 'pending',
      note: byKey[d.key]?.note || null,
    })),
  });
}));

router.put('/documents/lead/:id', requireAuth, asyncHandler(async (req, res) => {
  const d = z.object({
    doc_key: z.string().max(60),
    label: z.string().max(160),
    status: z.enum(['pending', 'received', 'verified', 'waived']),
    note: z.string().max(300).optional().or(z.literal('')),
  }).parse(req.body);

  const lead = await Lead.findById(req.params.id).lean();
  if (!lead) throw new HttpError(404, 'Lead not found');
  if (lead.receiver.toString() !== req.user._id.toString() && lead.assignedTo?.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    throw new HttpError(403, 'Not your lead');
  }

  await LeadDocument.findOneAndUpdate(
    { lead: lead._id, docKey: d.doc_key },
    { docKey: d.doc_key, label: d.label, status: d.status, note: nn(d.note) },
    { upsert: true, new: true }
  );

  res.json({ data: { doc_key: d.doc_key, status: d.status } });
}));

router.get('/contact/property/:id', asyncHandler(async (req, res) => {
  const p = await Property.findById(req.params.id)
    .populate('user', 'name phone role')
    .select('id title slug price locality city')
    .lean();
  if (!p) throw new HttpError(404, 'Property not found');

  const url = `${process.env.CLIENT_URL || ''}/property/${p.slug || p.id}`;
  const enquiry = `Hi ${p.user.name}, I saw "${p.title}" (${notify.money(p.price)}) `
    + `in ${p.locality}, ${p.city} on RNI Realestate. Is it still available?\n${url}`;
  const visitAsk = `Hi ${p.user.name}, I'd like to arrange a site visit for "${p.title}" in ${p.locality}. `
    + `Which day this week works for you?`;

  res.json({
    data: {
      phone: p.user.phone,
      call_link: `tel:${p.user.phone}`,
      templates: [
        { key: 'enquiry', label: 'Is it available?', link: notify.whatsappLink(p.user.phone, enquiry) },
        { key: 'visit', label: 'Arrange a site visit', link: notify.whatsappLink(p.user.phone, visitAsk) },
        { key: 'price', label: 'Is the price negotiable?', link: notify.whatsappLink(p.user.phone, `Hi ${p.user.name}, is the price for "${p.title}" negotiable?`) },
      ],
    },
  });
}));

router.get('/followups', requireAuth, asyncHandler(async (req, res) => {
  const rows = await Lead.find({
    receiver: req.user._id,
    status: { $in: ['new', 'contacted'] },
    followupCount: { $lt: 3 },
    $or: [
      { lastFollowupAt: { $lt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) } },
      { lastFollowupAt: null, createdAt: { $lt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) } },
    ],
  })
    .populate('property', 'title slug')
    .populate('receiver', 'name')
    .sort({ temperature: -1, score: -1 })
    .limit(50)
    .lean();

  res.json({
    data: rows.map((l) => ({
      lead_id: l._id, name: l.name, phone: l.phone, email: l.email,
      temperature: l.temperature, score: l.score,
      property_title: l.property?.title,
      draft: notify.followupText(l),
      whatsapp_link: notify.whatsappLink(l.phone, notify.followupText(l)),
    })),
  });
}));

router.post('/message', requireAuth, asyncHandler(async (req, res) => {
  const d = z.object({
    lead_id: objectId('Invalid lead'),
    channel: z.enum(['email', 'whatsapp']),
    subject: z.string().max(240).optional().or(z.literal('')),
    body: z.string().min(2).max(4000),
  }).parse(req.body);

  const lead = await Lead.findById(d.lead_id).lean();
  if (!lead) throw new HttpError(404, 'Lead not found');
  if (lead.receiver.toString() !== req.user._id.toString() && lead.assignedTo?.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    throw new HttpError(403, 'Not your lead');
  }
  const to = d.channel === 'email' ? lead.email : lead.phone;
  if (!to) throw new HttpError(422, `This lead has no ${d.channel === 'email' ? 'email address' : 'phone number'}`);

  const id = await notify.queueMessage({
    channel: d.channel, to, subject: nn(d.subject), body: d.body,
    template: 'manual', lead_id: lead._id, property_id: lead.property, created_by: req.user._id,
  });
  await Lead.findByIdAndUpdate(lead._id, { $inc: { followupCount: 1 }, lastFollowupAt: new Date() });

  const result = await notify.flushOutbox(5);
  const row = await Outbox.findById(id).lean();

  res.status(201).json({
    data: {
      outbox_id: id,
      status: row?.status,
      note: row?.error,
      whatsapp_link: d.channel === 'whatsapp' ? notify.whatsappLink(to, d.body) : null,
      delivery: result,
    },
  });
}));

router.get('/outbox', requireAuth, asyncHandler(async (req, res) => {
  const rows = await Outbox.find({
    $or: [{ createdBy: req.user._id }, { lead: { $in: await Lead.find({ receiver: req.user._id }).select('_id').lean().then((l) => l.map((x) => x._id)) } }],
  })
    .populate('lead', 'name')
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();

  res.json({
    data: rows,
    channels: { email: notify.smtpConfigured(), whatsapp: notify.whatsappConfigured() },
  });
}));

router.get('/saved-searches', requireAuth, asyncHandler(async (req, res) => {
  const rows = await SavedSearch.find({ user: req.user._id }).sort({ createdAt: -1 }).lean();
  res.json({ data: rows.map((r) => ({ ...r, params: typeof r.params === 'string' ? JSON.parse(r.params) : r.params })) });
}));

router.post('/saved-searches', requireAuth, asyncHandler(async (req, res) => {
  const d = z.object({
    label: z.string().min(2).max(160),
    params: z.record(z.union([z.string(), z.number(), z.boolean()])),
    alerts: z.boolean().optional(),
  }).parse(req.body);

  const c = await SavedSearch.countDocuments({ user: req.user._id });
  if (c >= 20) throw new HttpError(422, 'You can save up to 20 searches');

  const r = await SavedSearch.create({
    user: req.user._id,
    label: d.label,
    params: d.params,
    alerts: d.alerts !== false,
  });
  res.status(201).json({ data: { id: r._id } });
}));

router.delete('/saved-searches/:id', requireAuth, asyncHandler(async (req, res) => {
  await SavedSearch.findOneAndDelete({ _id: req.params.id, user: req.user._id });
  res.json({ message: 'Saved search removed' });
}));

router.get('/notifications', requireAuth, asyncHandler(async (req, res) => {
  const [rows, unreadAgg] = await Promise.all([
    Notification.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(60).lean(),
    Notification.aggregate([
      { $match: { user: req.user._id, readAt: null } },
      { $count: 'unread' },
    ]),
  ]);
  // aggregate() resolves to an array (empty when nothing matches) — index into
  // it rather than destructuring it directly as an object.
  const unread = unreadAgg[0]?.unread || 0;
  res.json({
    data: rows.map((n) => ({
      id: String(n._id),
      kind: n.kind,
      title: n.title,
      body: n.body,
      link: n.link,
      read_at: n.readAt,
      created_at: n.createdAt,
    })),
    unread,
  });
}));

router.post('/notifications/read', requireAuth, asyncHandler(async (req, res) => {
  await Notification.updateMany({ user: req.user._id, readAt: null }, { readAt: new Date() });
  res.json({ message: 'Marked as read' });
}));

router.post('/run/:job', requireAuth, asyncHandler(async (req, res) => {
  const dryRun = req.query.dry === '1';
  const jobs = {
    followup: notify.runFollowupBot,
    'price-alert': notify.runPriceAlertBot,
    'new-listing': notify.runNewListingBot,
  };
  const job = jobs[req.params.job];
  if (!job) throw new HttpError(404, 'Unknown job');
  res.json({ data: await job({ dryRun }) });
}));

module.exports = router;
