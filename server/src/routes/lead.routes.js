const router = require('express').Router();
const { z } = require('zod');
const mongoose = require('mongoose');
const Property = require('../models/Property');
const Project = require('../models/Project');
const ServiceOffering = require('../models/ServiceOffering');
const Lead = require('../models/Lead');
const User = require('../models/User');
const { requireAuth, optionalAuth } = require('../middleware/auth');
const { asyncHandler, nn, HttpError, objectId } = require('../utils/helpers');
const leadEngine = require('../services/leadEngine');
const notify = require('../services/notify');
const leadNotes = require('../services/leadNotes');

const STAGE_LABEL = {
  new: 'New', contacted: 'Contacted', 'visit-scheduled': 'Visit Scheduled',
  nurturing: 'Nurturing', negotiation: 'Negotiation', booked: 'Booked', lost: 'Lost',
};
// Forward-settable via PATCH /:id/stage — 'booked' goes through POST /:id/book
// instead (it needs an amount), and legacy 'closed' is never written by new code.
const STAGE_VALUES = ['new', 'contacted', 'visit-scheduled', 'nurturing', 'negotiation', 'lost'];

const leadSchema = z.object({
  name: z.string().min(2, 'Enter your name').max(120),
  phone: z.string().regex(/^[0-9]{10}$/, 'Enter a valid 10 digit mobile number'),
  email: z.string().email('Enter a valid email').optional().or(z.literal('')),
  message: z.string().max(1500).optional(),
  property_id: objectId('Invalid property').optional(),
  project_id: objectId('Invalid project').optional(),
  service_id: objectId('Invalid service').optional(),
});

function shapeLead(doc) {
  const obj = doc.toObject ? doc.toObject() : { ...doc };
  obj.id = String(obj._id);

  if (obj.property && typeof obj.property === 'object') {
    obj.property_id = String(obj.property._id);
    obj.property_slug = obj.property.slug;
    obj.property_title = obj.property.title;
    obj.property_cover_image = obj.property.coverImage;
  } else {
    obj.property_id = obj.property ? String(obj.property) : null;
  }
  if (obj.project && typeof obj.project === 'object') {
    obj.project_id = String(obj.project._id);
    obj.project_slug = obj.project.slug;
    obj.project_name = obj.project.name;
  } else {
    obj.project_id = obj.project ? String(obj.project) : null;
  }
  if (obj.service && typeof obj.service === 'object') {
    obj.service_id = String(obj.service._id);
    obj.service_title = obj.service.title;
  } else {
    obj.service_id = obj.service ? String(obj.service) : null;
  }
  delete obj.property; delete obj.project; delete obj.service;

  obj.score_reasons = obj.scoreReasons || [];
  obj.assigned_to = obj.assignedTo ? String(obj.assignedTo) : null;
  obj.assign_reason = obj.assignReason || null;
  obj.budget_min = obj.budgetMin ?? null;
  obj.budget_max = obj.budgetMax ?? null;
  obj.pref_bhk = obj.prefBhk || null;
  obj.pref_city = obj.prefCity || null;
  obj.pref_locality = obj.prefLocality || null;
  obj.pref_purpose = obj.prefPurpose || null;
  obj.last_followup_at = obj.lastFollowupAt || null;
  obj.followup_count = obj.followupCount || 0;
  obj.notes = (obj.notes || []).map(shapeNote).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  obj.booking_amount = obj.bookingAmount ?? null;
  obj.booking_date = obj.bookingDate || null;
  obj.booking_unit = obj.bookingUnit || null;
  obj.booking_notes = obj.bookingNotes || null;
  obj.booked_at = obj.bookedAt || null;
  obj.created_at = obj.createdAt;
  obj.updated_at = obj.updatedAt;

  return obj;
}

function shapeNote(n) {
  return {
    id: String(n._id),
    text: n.text,
    author_id: n.author?._id ? String(n.author._id) : (n.author ? String(n.author) : null),
    author_name: n.author?.name || null,
    temperature: n.temperature || null,
    status_after: n.statusAfter || null,
    created_at: n.createdAt,
  };
}

/** A lister can act on a lead addressed to them, or one assigned to them.
 *  Admin can act on any lead (mirrors the centralized /admin/leads access). */
function canAccessLead(lead, user) {
  if (user.role === 'admin') return true;
  const uid = String(user._id);
  return String(lead.receiver) === uid || (lead.assignedTo && String(lead.assignedTo) === uid);
}

router.post('/', optionalAuth, asyncHandler(async (req, res) => {
  const d = leadSchema.parse(req.body);

  let receiver_id = null;
  let source = 'contact';
  if (d.property_id) {
    const p = await Property.findById(d.property_id).select('user').lean();
    if (!p) throw new HttpError(404, 'Property not found');
    receiver_id = p.user; source = 'property';
  } else if (d.project_id) {
    const p = await Project.findById(d.project_id).select('builder').lean();
    if (!p) throw new HttpError(404, 'Project not found');
    receiver_id = p.builder; source = 'project';
  } else if (d.service_id) {
    const s = await ServiceOffering.findById(d.service_id).select('user').lean();
    if (!s) throw new HttpError(404, 'Service not found');
    receiver_id = s.user; source = 'service';
  } else {
    const admin = await User.findOne({ role: 'admin' }).select('_id').lean();
    if (!admin) throw new HttpError(400, 'No recipient available for this enquiry');
    receiver_id = admin._id;
  }

  const lead = await Lead.create({
    receiver: receiver_id,
    sender: req.user ? req.user._id : null,
    property: d.property_id ? new mongoose.Types.ObjectId(d.property_id) : null,
    project: d.project_id ? new mongoose.Types.ObjectId(d.project_id) : null,
    service: d.service_id ? new mongoose.Types.ObjectId(d.service_id) : null,
    name: d.name,
    email: nn(d.email),
    phone: d.phone,
    message: nn(d.message),
    source,
  });

  await leadEngine.processLead(lead._id.toString());
  // The lister now manages this lead themselves (GET /leads/mine) — give
  // them the enquirer's name/phone right in the notification and link
  // straight to the board, not a generic "we're reviewing it" placeholder.
  await notify.notify({
    user_id: receiver_id,
    kind: 'system',
    title: 'New enquiry on your listing',
    body: `${d.name} (${d.phone}) is interested — tap to follow up.`,
    link: '/dashboard/leads',
    property: d.property_id ? new mongoose.Types.ObjectId(d.property_id) : null,
  });

  res.status(201).json({ message: 'Thank you! Your enquiry has been sent. We will contact you shortly.' });
}));

router.get('/', requireAuth, asyncHandler(async (req, res) => {
  // Buyers see what they've sent — their own outbox. Listers get the
  // receiver-side equivalent at GET /mine below; admin's cross-portal view
  // stays at /admin/leads.
  if (req.user.role !== 'buyer') throw new HttpError(403, 'This is the buyer outbox — see your received enquiries at GET /leads/mine.');

  const filter = { sender: req.user._id };
  if (req.query.status) filter.status = req.query.status;
  if (req.query.source) filter.source = req.query.source;

  const rows = await Lead.find(filter)
    .populate('property', 'title slug coverImage')
    .populate('project', 'name slug')
    .populate('service', 'title')
    .sort({ createdAt: -1 })
    .limit(200)
    .lean();

  res.json({ data: rows.map(shapeLead) });
}));

/* ==================================================================== CRM
   Self-service lead management for the receiving lister (owner/agent/
   builder/service) or whoever a lead is assigned to. Admin can reach any
   lead here too, but their primary surface stays /admin/leads (cross-portal,
   audited). GET /mine is registered before GET /:id so Express doesn't try
   to match "mine" as an :id. */

router.get('/mine', requireAuth, asyncHandler(async (req, res) => {
  if (!['owner', 'agent', 'builder', 'service', 'admin'].includes(req.user.role)) {
    throw new HttpError(403, 'Only listers manage received enquiries here');
  }
  const rows = await Lead.find({ $or: [{ receiver: req.user._id }, { assignedTo: req.user._id }] })
    .populate('property', 'title slug coverImage')
    .populate('project', 'name slug')
    .populate('service', 'title')
    .populate({ path: 'notes.author', select: 'name' })
    .sort({ createdAt: -1 })
    .limit(300)
    .lean();
  res.json({ data: rows.map(shapeLead) });
}));

router.get('/:id', requireAuth, asyncHandler(async (req, res) => {
  const lead = await Lead.findById(req.params.id)
    .populate('property', 'title slug coverImage')
    .populate('project', 'name slug')
    .populate('service', 'title')
    .populate({ path: 'notes.author', select: 'name' })
    .lean();
  if (!lead) throw new HttpError(404, 'Lead not found');
  if (!canAccessLead(lead, req.user)) throw new HttpError(403, 'Not your lead');
  res.json({ data: shapeLead(lead) });
}));

router.post('/:id/notes', requireAuth, asyncHandler(async (req, res) => {
  const d = z.object({
    text: z.string().min(2, 'Add a note').max(1000),
    temperature: z.enum(['hot', 'warm', 'cold']).optional(),
  }).parse(req.body);

  const lead = await Lead.findById(req.params.id).select('receiver assignedTo').lean();
  if (!lead) throw new HttpError(404, 'Lead not found');
  if (!canAccessLead(lead, req.user)) throw new HttpError(403, 'Not your lead');

  const entry = await leadNotes.addNote(lead._id, { authorId: req.user._id, text: d.text, temperature: d.temperature });
  res.status(201).json({ data: { ...shapeNote(entry), author_name: req.user.name } });
}));

router.patch('/:id/stage', requireAuth, asyncHandler(async (req, res) => {
  const d = z.object({ status: z.enum(STAGE_VALUES) }).parse(req.body);

  const lead = await Lead.findById(req.params.id).select('receiver assignedTo status').lean();
  if (!lead) throw new HttpError(404, 'Lead not found');
  if (!canAccessLead(lead, req.user)) throw new HttpError(403, 'Not your lead');
  if (lead.status === 'booked') throw new HttpError(409, 'This lead is already booked');

  await Lead.findByIdAndUpdate(lead._id, { status: d.status });
  await leadNotes.addNote(lead._id, { authorId: req.user._id, text: `Moved to ${STAGE_LABEL[d.status]}`, statusAfter: d.status });

  res.json({ data: { status: d.status } });
}));

router.post('/:id/book', requireAuth, asyncHandler(async (req, res) => {
  const d = z.object({
    amount: z.coerce.number().min(0, 'Enter the booking amount'),
    booking_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal('')),
    unit: z.string().max(120).optional().or(z.literal('')),
    notes: z.string().max(500).optional().or(z.literal('')),
  }).parse(req.body);

  const lead = await Lead.findById(req.params.id).select('receiver assignedTo status').lean();
  if (!lead) throw new HttpError(404, 'Lead not found');
  if (!canAccessLead(lead, req.user)) throw new HttpError(403, 'Not your lead');
  if (lead.status === 'booked') throw new HttpError(409, 'This lead is already booked');

  await Lead.findByIdAndUpdate(lead._id, {
    status: 'booked',
    bookingAmount: d.amount,
    bookingDate: d.booking_date ? new Date(d.booking_date) : new Date(),
    bookingUnit: nn(d.unit),
    bookingNotes: nn(d.notes),
    bookedAt: new Date(),
  });
  await leadNotes.addNote(lead._id, {
    authorId: req.user._id,
    text: `Booked — ₹${Number(d.amount).toLocaleString('en-IN')}${d.unit ? ` (Unit ${d.unit})` : ''}`,
    statusAfter: 'booked',
  });

  res.json({ data: { status: 'booked' } });
}));

module.exports = router;
