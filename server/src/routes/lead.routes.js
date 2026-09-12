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
  obj.created_at = obj.createdAt;
  obj.updated_at = obj.updatedAt;

  return obj;
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

  const scored = await leadEngine.processLead(lead._id.toString());
  await notify.notify({
    user_id: receiver_id,
    kind: 'system',
    title: `New ${scored?.temperature || ''} enquiry from ${d.name}`.replace('  ', ' '),
    body: d.message ? String(d.message).slice(0, 160) : 'New enquiry received',
    link: '/dashboard/leads',
    property: d.property_id ? new mongoose.Types.ObjectId(d.property_id) : null,
  });

  res.status(201).json({ message: 'Thank you! Your enquiry has been sent. We will contact you shortly.' });
}));

router.get('/', requireAuth, asyncHandler(async (req, res) => {
  // Buyers never receive leads (nothing of theirs is listed) — they send
  // them. Every other role still sees what was sent to them, as before.
  const filter = { [req.user.role === 'buyer' ? 'sender' : 'receiver']: req.user._id };
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

router.patch('/:id', requireAuth, asyncHandler(async (req, res) => {
  const { status } = z.object({
    status: z.enum(['new', 'contacted', 'visit-scheduled', 'closed', 'lost']),
  }).parse(req.body);

  const lead = await Lead.findById(req.params.id).select('receiver').lean();
  if (!lead) throw new HttpError(404, 'Lead not found');
  if (lead.receiver.toString() !== req.user._id.toString() && req.user.role !== 'admin') throw new HttpError(403, 'Not allowed');

  await Lead.findByIdAndUpdate(req.params.id, { status });
  res.json({ message: 'Lead updated' });
}));

router.delete('/:id', requireAuth, asyncHandler(async (req, res) => {
  const lead = await Lead.findById(req.params.id).select('receiver').lean();
  if (!lead) throw new HttpError(404, 'Lead not found');
  if (lead.receiver.toString() !== req.user._id.toString() && req.user.role !== 'admin') throw new HttpError(403, 'Not allowed');
  await Lead.findByIdAndDelete(req.params.id);
  res.json({ message: 'Lead deleted' });
}));

module.exports = router;
