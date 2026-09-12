const router = require('express').Router();
const { z } = require('zod');
const User = require('../models/User');
const Property = require('../models/Property');
const Project = require('../models/Project');
const ServiceOffering = require('../models/ServiceOffering');
const Lead = require('../models/Lead');
const AgentProfile = require('../models/AgentProfile');
const AgentDocument = require('../models/AgentDocument');
const BuilderProfile = require('../models/BuilderProfile');
const BuilderDocument = require('../models/BuilderDocument');
const ProjectDocument = require('../models/ProjectDocument');
const ServiceProviderProfile = require('../models/ServiceProviderProfile');
const ServiceProviderDocument = require('../models/ServiceProviderDocument');
const { getRule, qualificationRequired } = require('../config/serviceCategoryRules');
const AuditLog = require('../models/AuditLog');
const Notification = require('../models/Notification');
const { requireAuth, requireRole } = require('../middleware/auth');
const { asyncHandler, nn, paginate, HttpError } = require('../utils/helpers');
const { decryptFromDisk, maskValue } = require('../utils/fileCrypto');

const PORTALS = ['owner', 'buyer', 'agent', 'builder', 'service'];

router.use(requireAuth, requireRole('admin', 'employee'));

/**
 * Every route below is reachable by the super admin (full access to any
 * portal) and by a portal-incharge employee (restricted to the portals
 * they've been assigned). This is the single place that decides "am I
 * allowed to see/touch this portal's data" — everything else trusts it.
 */
function resolvePortalScope(req, requestedPortal) {
  if (requestedPortal && !PORTALS.includes(requestedPortal)) throw new HttpError(400, 'Invalid portal');
  if (req.user.role === 'admin') return requestedPortal ? [requestedPortal] : PORTALS;

  const allowed = req.user.managedPortals || [];
  if (requestedPortal) {
    if (!allowed.includes(requestedPortal)) throw new HttpError(403, 'You are not in charge of this portal');
    return [requestedPortal];
  }
  if (!allowed.length) throw new HttpError(403, 'No portal assigned to your account yet');
  return allowed;
}

async function userIdsForPortals(portals) {
  const rows = await User.find({ role: { $in: portals } }).select('_id').lean();
  return rows.map((u) => u._id);
}

/** Authorizes + applies a moderation write on a listing owned via `ownerField`. */
async function moderateListing(req, Model, ownerField, id, patch, del = false) {
  const existing = await Model.findById(id).select(ownerField).lean();
  if (!existing) throw new HttpError(404, 'Not found');
  const owner = await User.findById(existing[ownerField]).select('role').lean();
  if (!owner) throw new HttpError(404, 'Owner not found');
  resolvePortalScope(req, owner.role);
  if (del) { await Model.findByIdAndDelete(id); return; }
  await Model.findByIdAndUpdate(id, patch);
}

function shapeUser(doc) {
  const obj = { ...doc };
  obj.id = String(obj._id);
  delete obj._id;
  delete obj.__v;
  delete obj.passwordHash;
  return obj;
}

/** Every verification/status decision goes through here so nothing is logged inconsistently. */
async function writeAudit(req, { targetUser, action, previousStatus, newStatus, reason }) {
  await AuditLog.create({
    admin: req.user._id, targetUser, action,
    previousStatus: previousStatus ?? undefined,
    newStatus: newStatus ?? undefined,
    reason: nn(reason),
  });
}

/* ============================================================ employees */
/* Admin-only — employees can never manage other employees. */

router.get('/employees', requireRole('admin'), asyncHandler(async (req, res) => {
  const rows = await User.find({ role: 'employee' }).sort({ createdAt: -1 }).lean();
  res.json({ data: rows.map(shapeUser) });
}));

router.post('/employees', requireRole('admin'), asyncHandler(async (req, res) => {
  const d = z.object({
    name: z.string().min(2, 'Enter a name').max(120),
    email: z.string().email('Enter a valid email'),
    phone: z.string().regex(/^[0-9]{10}$/, 'Enter a valid 10 digit mobile number'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    managed_portals: z.array(z.enum(PORTALS)).min(1, 'Assign at least one portal'),
  }).parse(req.body);

  const exists = await User.findOne({ $or: [{ email: d.email }, { phone: d.phone }] }).select('_id').lean();
  if (exists) throw new HttpError(409, 'An account already exists with this email or mobile number');

  const employee = await User.create({
    name: d.name,
    email: d.email,
    phone: d.phone,
    password: d.password,
    role: 'employee',
    managedPortals: d.managed_portals,
  });

  res.status(201).json({ data: shapeUser(employee.toObject()) });
}));

router.put('/employees/:id', requireRole('admin'), asyncHandler(async (req, res) => {
  const d = z.object({
    name: z.string().min(2).max(120).optional(),
    phone: z.string().regex(/^[0-9]{10}$/, 'Enter a valid 10 digit mobile number').optional(),
    managed_portals: z.array(z.enum(PORTALS)).min(1).optional(),
    status: z.enum(['active', 'suspended']).optional(),
  }).parse(req.body);

  const employee = await User.findOne({ _id: req.params.id, role: 'employee' });
  if (!employee) throw new HttpError(404, 'Employee not found');

  if (d.name !== undefined) employee.name = d.name;
  if (d.phone !== undefined) employee.phone = d.phone;
  if (d.managed_portals !== undefined) employee.managedPortals = d.managed_portals;
  if (d.status !== undefined) employee.status = d.status;
  await employee.save();

  res.json({ data: shapeUser(employee.toObject()) });
}));

router.delete('/employees/:id', requireRole('admin'), asyncHandler(async (req, res) => {
  const employee = await User.findOne({ _id: req.params.id, role: 'employee' }).select('_id').lean();
  if (!employee) throw new HttpError(404, 'Employee not found');
  await User.findByIdAndDelete(req.params.id);
  res.json({ message: 'Employee removed' });
}));

/* =================================================================== users */

router.get('/users', asyncHandler(async (req, res) => {
  const scope = resolvePortalScope(req, req.query.portal);
  const { page, limit, offset } = paginate(req.query);

  const filter = { role: { $in: scope } };
  if (req.query.q) {
    const q = String(req.query.q).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.$or = [{ name: new RegExp(q, 'i') }, { email: new RegExp(q, 'i') }, { phone: new RegExp(q, 'i') }];
  }
  if (req.query.approval) {
    if (!['pending', 'approved', 'rejected'].includes(req.query.approval)) throw new HttpError(400, 'Invalid approval filter');
    filter.approvalStatus = req.query.approval;
  }

  const [rows, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip(offset).limit(limit).lean(),
    User.countDocuments(filter),
  ]);
  res.json({ data: rows.map(shapeUser), meta: { page, limit, total } });
}));

router.put('/users/:id/status', asyncHandler(async (req, res) => {
  const { status } = z.object({ status: z.enum(['active', 'suspended']) }).parse(req.body);
  const target = await User.findById(req.params.id).select('role status').lean();
  if (!target) throw new HttpError(404, 'User not found');
  resolvePortalScope(req, target.role);
  await User.findByIdAndUpdate(req.params.id, { status });
  await writeAudit(req, { targetUser: req.params.id, action: 'user_status', previousStatus: target.status, newStatus: status });
  res.json({ message: status === 'suspended' ? 'User suspended' : 'User reactivated' });
}));

router.put('/users/:id/approval', asyncHandler(async (req, res) => {
  const { approval_status } = z.object({ approval_status: z.enum(['pending', 'approved', 'rejected']) }).parse(req.body);
  const target = await User.findById(req.params.id).select('role approvalStatus').lean();
  if (!target) throw new HttpError(404, 'User not found');
  resolvePortalScope(req, target.role);
  if (target.role === 'agent') {
    throw new HttpError(409, 'Agents go through KYC/RERA review — use Agent Applications to approve or reject them, not this generic action.');
  }
  if (target.role === 'builder') {
    throw new HttpError(409, 'Builders go through company/entity review — use Builder Applications to approve or reject them, not this generic action.');
  }
  if (target.role === 'service') {
    throw new HttpError(409, 'Service providers go through identity/qualification review — use Service Applications to approve or reject them, not this generic action.');
  }
  await User.findByIdAndUpdate(req.params.id, { approvalStatus: approval_status });
  await writeAudit(req, { targetUser: req.params.id, action: 'approval_status', previousStatus: target.approvalStatus, newStatus: approval_status });
  const messages = { approved: 'Account approved — they can post listings now', rejected: 'Application rejected', pending: 'Moved back to pending' };
  res.json({ message: messages[approval_status] });
}));

router.put('/users/:id/verify', asyncHandler(async (req, res) => {
  const { is_verified } = z.object({ is_verified: z.boolean() }).parse(req.body);
  const target = await User.findById(req.params.id).select('role isVerified').lean();
  if (!target) throw new HttpError(404, 'User not found');
  resolvePortalScope(req, target.role);
  await User.findByIdAndUpdate(req.params.id, { isVerified: is_verified });
  await writeAudit(req, {
    targetUser: req.params.id, action: 'user_verify',
    previousStatus: String(!!target.isVerified), newStatus: String(is_verified),
  });
  res.json({ message: is_verified ? 'User verified' : 'Verification removed' });
}));

/* =============================================================== properties */

router.get('/properties', asyncHandler(async (req, res) => {
  const scope = resolvePortalScope(req, req.query.portal);
  const ownerIds = await userIdsForPortals(scope);
  const { page, limit, offset } = paginate(req.query);

  const filter = { user: { $in: ownerIds } };
  const [rows, total] = await Promise.all([
    Property.find(filter).populate({ path: 'user', select: 'name role companyName' })
      .sort({ createdAt: -1 }).skip(offset).limit(limit).lean(),
    Property.countDocuments(filter),
  ]);

  res.json({
    data: rows.map((p) => ({
      id: String(p._id),
      title: p.title,
      slug: p.slug,
      purpose: p.purpose,
      propertyType: p.propertyType,
      price: p.price,
      city: p.city,
      locality: p.locality,
      coverImage: p.coverImage,
      status: p.status,
      isFeatured: p.isFeatured,
      isVerified: p.isVerified,
      views: p.views,
      createdAt: p.createdAt,
      ownerName: p.user?.name,
      ownerRole: p.user?.role,
      ownerCompany: p.user?.companyName,
    })),
    meta: { page, limit, total },
  });
}));

router.put('/properties/:id/status', asyncHandler(async (req, res) => {
  const { status } = z.object({ status: z.enum(['pending', 'active', 'sold', 'rented', 'inactive']) }).parse(req.body);
  await moderateListing(req, Property, 'user', req.params.id, { status });
  res.json({ message: 'Listing updated' });
}));

router.put('/properties/:id/verify', asyncHandler(async (req, res) => {
  const { is_verified } = z.object({ is_verified: z.boolean() }).parse(req.body);
  await moderateListing(req, Property, 'user', req.params.id, { isVerified: is_verified });
  res.json({ message: is_verified ? 'Listing verified' : 'Verification removed' });
}));

router.put('/properties/:id/feature', asyncHandler(async (req, res) => {
  const { is_featured } = z.object({ is_featured: z.boolean() }).parse(req.body);
  await moderateListing(req, Property, 'user', req.params.id, { isFeatured: is_featured });
  res.json({ message: is_featured ? 'Listing featured' : 'Removed from featured' });
}));

router.delete('/properties/:id', asyncHandler(async (req, res) => {
  await moderateListing(req, Property, 'user', req.params.id, null, true);
  res.json({ message: 'Listing deleted' });
}));

/* ================================================================= projects */

/** Loose match so "ABC Pvt Ltd" vs "ABC Private Limited" doesn't false-flag. */
function normalizeEntityName(name) {
  if (!name) return '';
  return String(name).toLowerCase()
    .replace(/\bprivate limited\b/g, 'pvt ltd')
    .replace(/\bpvt\.?\s*ltd\.?\b/g, 'pvt ltd')
    .replace(/\blimited liability partnership\b/g, 'llp')
    .replace(/\bpublic limited\b/g, 'ltd')
    .replace(/[.,]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
/** Only flags when BOTH names are present and genuinely differ — a missing
 *  name is a "missing document" gap (§Missing Documents), not a mismatch. */
function namesMismatch(a, b) {
  if (!a || !b) return false;
  return normalizeEntityName(a) !== normalizeEntityName(b);
}

router.get('/projects', asyncHandler(async (req, res) => {
  const scope = resolvePortalScope(req, req.query.portal);
  const ownerIds = await userIdsForPortals(scope);
  const { page, limit, offset } = paginate(req.query);

  const filter = { builder: { $in: ownerIds } };
  const [rows, total] = await Promise.all([
    Project.find(filter).populate({ path: 'builder', select: 'name role companyName' })
      .sort({ createdAt: -1 }).skip(offset).limit(limit).lean(),
    Project.countDocuments(filter),
  ]);

  const builderIds = [...new Set(rows.map((p) => String(p.builder?._id)))];
  const profiles = await BuilderProfile.find({ user: { $in: builderIds } }).select('user legalEntityName').lean();
  const legalNameByBuilder = Object.fromEntries(profiles.map((bp) => [String(bp.user), bp.legalEntityName]));

  res.json({
    data: rows.map((p) => ({
      id: String(p._id),
      name: p.name,
      slug: p.slug,
      projectType: p.projectType,
      minPrice: p.minPrice,
      maxPrice: p.maxPrice,
      city: p.city,
      locality: p.locality,
      coverImage: p.coverImage,
      status: p.status,
      isFeatured: p.isFeatured,
      views: p.views,
      createdAt: p.createdAt,
      builderName: p.builder?.name,
      builderCompany: p.builder?.companyName,
      verificationStatus: p.verificationStatus,
      nameMismatch: namesMismatch(p.reraPromoterName, legalNameByBuilder[String(p.builder?._id)]),
    })),
    meta: { page, limit, total },
  });
}));

router.get('/projects/:id', asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id).populate('builder', 'name role companyName').lean();
  if (!project) throw new HttpError(404, 'Project not found');
  resolvePortalScope(req, project.builder?.role);

  const [builderProfile, documents, history] = await Promise.all([
    BuilderProfile.findOne({ user: project.builder._id }).select('legalEntityName entityType').lean(),
    ProjectDocument.find({ project: project._id }).sort({ createdAt: -1 }).lean(),
    AuditLog.find({ targetUser: project.builder._id, action: { $regex: '^project_' } })
      .populate('admin', 'name').sort({ createdAt: -1 }).limit(50).lean(),
  ]);

  res.json({
    data: {
      project: { ...project, id: String(project._id) },
      builderLegalName: builderProfile?.legalEntityName || null,
      nameMismatch: namesMismatch(project.reraPromoterName, builderProfile?.legalEntityName),
      documents: documents.map((d) => {
        const obj = { ...d };
        obj.id = String(obj._id);
        delete obj._id; delete obj.__v; delete obj.fileKey; delete obj.iv; delete obj.authTag;
        return obj;
      }),
      history: history.map((h) => ({
        id: String(h._id), action: h.action, previousStatus: h.previousStatus, newStatus: h.newStatus,
        reason: h.reason, adminName: h.admin?.name, createdAt: h.createdAt,
      })),
    },
  });
}));

router.put('/projects/:id/verification', asyncHandler(async (req, res) => {
  const { decision, reason } = z.object({
    decision: z.enum(['verified', 'rejected', 'under_review']),
    reason: z.string().max(500).optional(),
  }).parse(req.body);
  if (decision === 'rejected' && !reason) throw new HttpError(422, 'Add a reason so the builder knows what to fix');

  const existing = await Project.findById(req.params.id).select('builder verificationStatus name').lean();
  if (!existing) throw new HttpError(404, 'Project not found');
  const owner = await User.findById(existing.builder).select('role').lean();
  if (!owner) throw new HttpError(404, 'Owner not found');
  resolvePortalScope(req, owner.role);

  const previousStatus = existing.verificationStatus;
  await Project.findByIdAndUpdate(req.params.id, {
    verificationStatus: decision, reviewedBy: req.user._id, reviewedAt: new Date(), reviewNote: nn(reason),
  });
  await ProjectDocument.updateMany(
    { project: req.params.id },
    { status: decision === 'verified' ? 'verified' : decision === 'rejected' ? 'rejected' : 'reviewed',
      reviewedBy: req.user._id, reviewedAt: new Date(), reviewNote: nn(reason) }
  );

  await writeAudit(req, { targetUser: existing.builder, action: 'project_verification', previousStatus, newStatus: decision, reason });
  await Notification.create({
    user: existing.builder, kind: 'system',
    title: `Project "${existing.name}" ${decision === 'verified' ? 'verified' : decision === 'rejected' ? 'verification rejected' : 'is under review'}`,
    body: reason || undefined,
    link: '/dashboard/projects',
  });

  res.json({ message: 'Project verification updated', data: { verificationStatus: decision } });
}));

router.put('/projects/:id/status', asyncHandler(async (req, res) => {
  const { status } = z.object({ status: z.enum(['upcoming', 'ongoing', 'completed']) }).parse(req.body);
  await moderateListing(req, Project, 'builder', req.params.id, { status });
  res.json({ message: 'Project updated' });
}));

router.put('/projects/:id/feature', asyncHandler(async (req, res) => {
  const { is_featured } = z.object({ is_featured: z.boolean() }).parse(req.body);
  await moderateListing(req, Project, 'builder', req.params.id, { isFeatured: is_featured });
  res.json({ message: is_featured ? 'Project featured' : 'Removed from featured' });
}));

router.delete('/projects/:id', asyncHandler(async (req, res) => {
  await moderateListing(req, Project, 'builder', req.params.id, null, true);
  res.json({ message: 'Project deleted' });
}));

/* ================================================================= services */

router.get('/services', asyncHandler(async (req, res) => {
  const scope = resolvePortalScope(req, req.query.portal);
  const ownerIds = await userIdsForPortals(scope);
  const { page, limit, offset } = paginate(req.query);

  const filter = { user: { $in: ownerIds } };
  const [rows, total] = await Promise.all([
    ServiceOffering.find(filter).populate({ path: 'user', select: 'name role companyName' })
      .sort({ createdAt: -1 }).skip(offset).limit(limit).lean(),
    ServiceOffering.countDocuments(filter),
  ]);

  res.json({
    data: rows.map((s) => ({
      id: String(s._id),
      title: s.title,
      slug: s.slug,
      category: s.category,
      priceFrom: s.priceFrom,
      priceUnit: s.priceUnit,
      city: s.city,
      coverImage: s.coverImage,
      status: s.status,
      rating: s.rating,
      createdAt: s.createdAt,
      ownerName: s.user?.name,
      ownerCompany: s.user?.companyName,
    })),
    meta: { page, limit, total },
  });
}));

router.put('/services/:id/status', asyncHandler(async (req, res) => {
  const { status } = z.object({ status: z.enum(['active', 'inactive']) }).parse(req.body);
  await moderateListing(req, ServiceOffering, 'user', req.params.id, { status });
  res.json({ message: 'Service updated' });
}));

router.delete('/services/:id', asyncHandler(async (req, res) => {
  await moderateListing(req, ServiceOffering, 'user', req.params.id, null, true);
  res.json({ message: 'Service removed' });
}));

/* ==================================================================== leads */
/* Read-only oversight — no write actions here, only the receiving agent/
   owner/builder/service partner acts on their own leads. */

router.get('/leads', asyncHandler(async (req, res) => {
  const scope = resolvePortalScope(req, req.query.portal);
  const receiverIds = await userIdsForPortals(scope);
  const { page, limit, offset } = paginate(req.query);

  const filter = { receiver: { $in: receiverIds } };
  const [rows, total] = await Promise.all([
    Lead.find(filter)
      .populate('property', 'title slug')
      .populate('project', 'name slug')
      .populate('service', 'title')
      .populate('receiver', 'name role companyName')
      .sort({ createdAt: -1 }).skip(offset).limit(limit).lean(),
    Lead.countDocuments(filter),
  ]);

  res.json({
    data: rows.map((l) => ({
      id: String(l._id),
      name: l.name,
      phone: l.phone,
      email: l.email,
      status: l.status,
      temperature: l.temperature,
      score: l.score,
      source: l.source,
      createdAt: l.createdAt,
      receiverName: l.receiver?.name,
      receiverRole: l.receiver?.role,
      about: l.property?.title || l.project?.name || l.service?.title || null,
    })),
    meta: { page, limit, total },
  });
}));

/* ======================================================= agent verification */
/* KYC / RERA / business review for agent applications. Portal is always
   'agent' here — an employee needs 'agent' in their managedPortals. */

function shapeAdminDocument(doc) {
  const obj = { ...doc };
  obj.id = String(obj._id);
  delete obj._id;
  delete obj.__v;
  delete obj.fileKey;
  delete obj.iv;
  delete obj.authTag;
  obj.idNumber = maskValue(obj.idNumber); // full value only via /agent-documents/:id/reveal
  return obj;
}

router.get('/agent-applications', asyncHandler(async (req, res) => {
  resolvePortalScope(req, 'agent');
  const { page, limit, offset } = paginate(req.query);

  const filter = {};
  if (req.query.status) filter.lifecycleStatus = req.query.status;

  const [rows, total] = await Promise.all([
    AgentProfile.find(filter).populate('user', 'name email phone status approvalStatus createdAt')
      .sort({ updatedAt: -1 }).skip(offset).limit(limit).lean(),
    AgentProfile.countDocuments(filter),
  ]);

  res.json({
    data: rows.filter((p) => p.user).map((p) => ({
      id: String(p._id),
      userId: String(p.user._id),
      name: p.user.name,
      email: p.user.email,
      phone: p.user.phone,
      userStatus: p.user.status,
      approvalStatus: p.user.approvalStatus,
      agentType: p.agentType,
      companyName: p.companyName,
      lifecycleStatus: p.lifecycleStatus,
      kycStatus: p.kycStatus,
      reraStatus: p.reraStatus,
      businessStatus: p.businessStatus,
      submittedAt: p.submittedAt,
      createdAt: p.createdAt,
    })),
    meta: { page, limit, total },
  });
}));

router.get('/agent-applications/:id', asyncHandler(async (req, res) => {
  resolvePortalScope(req, 'agent');

  const [profile, user, documents, history] = await Promise.all([
    AgentProfile.findOne({ user: req.params.id }).lean(),
    User.findById(req.params.id).select('name email phone status approvalStatus isVerified createdAt').lean(),
    AgentDocument.find({ agent: req.params.id }).sort({ createdAt: -1 }).lean(),
    AuditLog.find({ targetUser: req.params.id }).populate('admin', 'name').sort({ createdAt: -1 }).limit(50).lean(),
  ]);
  if (!profile || !user) throw new HttpError(404, 'Agent application not found');

  res.json({
    data: {
      profile: { ...profile, id: String(profile._id) },
      user: { ...user, id: String(user._id) },
      documents: documents.map(shapeAdminDocument),
      history: history.map((h) => ({
        id: String(h._id), action: h.action, previousStatus: h.previousStatus, newStatus: h.newStatus,
        reason: h.reason, adminName: h.admin?.name, createdAt: h.createdAt,
      })),
    },
  });
}));

const TRACK_META = {
  kyc: { field: 'kycStatus', label: 'KYC', docTypes: ['gov_id', 'pan', 'selfie'] },
  rera: { field: 'reraStatus', label: 'RERA', docTypes: ['rera_certificate'] },
  business: { field: 'businessStatus', label: 'Business verification', docTypes: ['business_doc'] },
};

async function reviewTrack(req, res, track) {
  const meta = TRACK_META[track];
  const { decision, reason } = z.object({
    decision: z.enum(['verified', 'rejected', 'under_review']),
    reason: z.string().max(500).optional(),
  }).parse(req.body);

  resolvePortalScope(req, 'agent');
  const profile = await AgentProfile.findOne({ user: req.params.id });
  if (!profile) throw new HttpError(404, 'Agent application not found');
  if (decision === 'rejected' && !reason) throw new HttpError(422, 'Add a reason so the agent knows what to fix');

  const previousStatus = profile[meta.field];
  profile[meta.field] = decision;
  if (decision === 'rejected') profile.lifecycleStatus = 'resubmission_required';
  await profile.save();

  await AgentDocument.updateMany(
    { agent: req.params.id, type: { $in: meta.docTypes } },
    { status: decision === 'verified' ? 'verified' : decision === 'rejected' ? 'rejected' : 'reviewed',
      reviewedBy: req.user._id, reviewedAt: new Date(), reviewNote: nn(reason) }
  );

  await writeAudit(req, { targetUser: req.params.id, action: `${track}_review`, previousStatus, newStatus: decision, reason });
  await Notification.create({
    user: req.params.id, kind: 'system',
    title: `${meta.label} ${decision === 'verified' ? 'verified' : decision === 'rejected' ? 'rejected' : 'is under review'}`,
    body: reason || undefined,
    link: '/dashboard/agent/verification',
  });

  res.json({ message: `${meta.label} updated`, data: { [meta.field]: profile[meta.field], lifecycleStatus: profile.lifecycleStatus } });
}

router.put('/agent-applications/:id/kyc', asyncHandler((req, res) => reviewTrack(req, res, 'kyc')));
router.put('/agent-applications/:id/rera', asyncHandler((req, res) => reviewTrack(req, res, 'rera')));
router.put('/agent-applications/:id/business', asyncHandler((req, res) => reviewTrack(req, res, 'business')));

router.put('/agent-applications/:id/approve', asyncHandler(async (req, res) => {
  resolvePortalScope(req, 'agent');
  const profile = await AgentProfile.findOne({ user: req.params.id });
  if (!profile) throw new HttpError(404, 'Agent application not found');

  if (profile.kycStatus !== 'verified') throw new HttpError(422, 'KYC must be verified before approving');
  if (profile.reraStatus !== 'verified') throw new HttpError(422, 'RERA details must be verified before approving');
  if (profile.agentType !== 'individual' && profile.businessStatus !== 'verified') {
    throw new HttpError(422, 'Business verification must be completed before approving');
  }

  const previousStatus = profile.lifecycleStatus;
  profile.lifecycleStatus = 'active';
  profile.activatedAt = new Date();
  await profile.save();
  await User.findByIdAndUpdate(req.params.id, { approvalStatus: 'approved' });

  await writeAudit(req, { targetUser: req.params.id, action: 'agent_approve', previousStatus, newStatus: 'active' });
  await Notification.create({
    user: req.params.id, kind: 'system', title: 'You are now a Verified Agent',
    body: 'Your application was approved — you can post listings now.', link: '/dashboard',
  });

  res.json({ message: 'Agent approved' });
}));

router.get('/agent-documents/:id/file', asyncHandler(async (req, res) => {
  const doc = await AgentDocument.findById(req.params.id).lean();
  if (!doc) throw new HttpError(404, 'Document not found');
  const owner = await User.findById(doc.agent).select('role').lean();
  if (!owner) throw new HttpError(404, 'Document not found');
  resolvePortalScope(req, owner.role);

  const buffer = decryptFromDisk(doc.fileKey, doc.iv, doc.authTag);
  res.setHeader('Content-Type', doc.mimeType || 'application/octet-stream');
  res.setHeader('Content-Disposition', `inline; filename="${(doc.originalName || 'document').replace(/"/g, '')}"`);
  res.setHeader('Cache-Control', 'no-store');
  res.send(buffer);
}));

router.get('/agent-documents/:id/reveal', asyncHandler(async (req, res) => {
  const doc = await AgentDocument.findById(req.params.id).lean();
  if (!doc) throw new HttpError(404, 'Document not found');
  const owner = await User.findById(doc.agent).select('role').lean();
  if (!owner) throw new HttpError(404, 'Document not found');
  resolvePortalScope(req, owner.role);

  await writeAudit(req, { targetUser: doc.agent, action: 'document_reveal', reason: doc.type });
  res.json({ data: { idNumber: doc.idNumber || null } });
}));

/* ===================================================== builder verification */
/* Company/entity review for builder applications. Portal is always 'builder'
   here — an employee needs 'builder' in their managedPortals. Per-project
   RERA/land/approvals review lives above, under /projects/:id/verification. */

router.get('/builder-applications', asyncHandler(async (req, res) => {
  resolvePortalScope(req, 'builder');
  const { page, limit, offset } = paginate(req.query);

  const filter = {};
  if (req.query.status) filter.lifecycleStatus = req.query.status;

  const [rows, total] = await Promise.all([
    BuilderProfile.find(filter).populate('user', 'name email phone status approvalStatus createdAt')
      .sort({ updatedAt: -1 }).skip(offset).limit(limit).lean(),
    BuilderProfile.countDocuments(filter),
  ]);

  res.json({
    data: rows.filter((p) => p.user).map((p) => ({
      id: String(p._id),
      userId: String(p.user._id),
      name: p.user.name,
      email: p.user.email,
      phone: p.user.phone,
      userStatus: p.user.status,
      approvalStatus: p.user.approvalStatus,
      entityType: p.entityType,
      legalEntityName: p.legalEntityName,
      lifecycleStatus: p.lifecycleStatus,
      companyStatus: p.companyStatus,
      submittedAt: p.submittedAt,
      createdAt: p.createdAt,
    })),
    meta: { page, limit, total },
  });
}));

router.get('/builder-applications/:id', asyncHandler(async (req, res) => {
  resolvePortalScope(req, 'builder');

  const [profile, user, documents, history] = await Promise.all([
    BuilderProfile.findOne({ user: req.params.id }).lean(),
    User.findById(req.params.id).select('name email phone status approvalStatus isVerified createdAt').lean(),
    BuilderDocument.find({ builder: req.params.id }).sort({ createdAt: -1 }).lean(),
    AuditLog.find({ targetUser: req.params.id }).populate('admin', 'name').sort({ createdAt: -1 }).limit(50).lean(),
  ]);
  if (!profile || !user) throw new HttpError(404, 'Builder application not found');

  res.json({
    data: {
      profile: { ...profile, id: String(profile._id) },
      user: { ...user, id: String(user._id) },
      documents: documents.map(shapeAdminDocument),
      history: history.map((h) => ({
        id: String(h._id), action: h.action, previousStatus: h.previousStatus, newStatus: h.newStatus,
        reason: h.reason, adminName: h.admin?.name, createdAt: h.createdAt,
      })),
    },
  });
}));

router.put('/builder-applications/:id/company', asyncHandler(async (req, res) => {
  const { decision, reason } = z.object({
    decision: z.enum(['verified', 'rejected', 'under_review']),
    reason: z.string().max(500).optional(),
  }).parse(req.body);

  resolvePortalScope(req, 'builder');
  const profile = await BuilderProfile.findOne({ user: req.params.id });
  if (!profile) throw new HttpError(404, 'Builder application not found');
  if (decision === 'rejected' && !reason) throw new HttpError(422, 'Add a reason so the builder knows what to fix');

  const previousStatus = profile.companyStatus;
  profile.companyStatus = decision;
  if (decision === 'rejected') profile.lifecycleStatus = 'resubmission_required';
  await profile.save();

  await BuilderDocument.updateMany(
    { builder: req.params.id },
    { status: decision === 'verified' ? 'verified' : decision === 'rejected' ? 'rejected' : 'reviewed',
      reviewedBy: req.user._id, reviewedAt: new Date(), reviewNote: nn(reason) }
  );

  await writeAudit(req, { targetUser: req.params.id, action: 'company_review', previousStatus, newStatus: decision, reason });
  await Notification.create({
    user: req.params.id, kind: 'system',
    title: `Company verification ${decision === 'verified' ? 'verified' : decision === 'rejected' ? 'rejected' : 'is under review'}`,
    body: reason || undefined,
    link: '/dashboard/builder/verification',
  });

  res.json({ message: 'Company verification updated', data: { companyStatus: profile.companyStatus, lifecycleStatus: profile.lifecycleStatus } });
}));

router.put('/builder-applications/:id/approve', asyncHandler(async (req, res) => {
  resolvePortalScope(req, 'builder');
  const profile = await BuilderProfile.findOne({ user: req.params.id });
  if (!profile) throw new HttpError(404, 'Builder application not found');

  if (profile.companyStatus !== 'verified') throw new HttpError(422, 'Company/entity details must be verified before approving');

  const previousStatus = profile.lifecycleStatus;
  profile.lifecycleStatus = 'active';
  profile.activatedAt = new Date();
  await profile.save();
  await User.findByIdAndUpdate(req.params.id, { approvalStatus: 'approved' });

  await writeAudit(req, { targetUser: req.params.id, action: 'builder_approve', previousStatus, newStatus: 'active' });
  await Notification.create({
    user: req.params.id, kind: 'system', title: 'Your builder account is approved',
    body: 'Company verification approved — you can post projects now. Each project still needs its own RERA/land-rights verification before it goes live.',
    link: '/dashboard',
  });

  res.json({ message: 'Builder approved' });
}));

router.get('/builder-documents/:id/file', asyncHandler(async (req, res) => {
  const doc = await BuilderDocument.findById(req.params.id).lean();
  if (!doc) throw new HttpError(404, 'Document not found');
  const owner = await User.findById(doc.builder).select('role').lean();
  if (!owner) throw new HttpError(404, 'Document not found');
  resolvePortalScope(req, owner.role);

  const buffer = decryptFromDisk(doc.fileKey, doc.iv, doc.authTag);
  res.setHeader('Content-Type', doc.mimeType || 'application/octet-stream');
  res.setHeader('Content-Disposition', `inline; filename="${(doc.originalName || 'document').replace(/"/g, '')}"`);
  res.setHeader('Cache-Control', 'no-store');
  res.send(buffer);
}));

router.get('/builder-documents/:id/reveal', asyncHandler(async (req, res) => {
  const doc = await BuilderDocument.findById(req.params.id).lean();
  if (!doc) throw new HttpError(404, 'Document not found');
  const owner = await User.findById(doc.builder).select('role').lean();
  if (!owner) throw new HttpError(404, 'Document not found');
  resolvePortalScope(req, owner.role);

  await writeAudit(req, { targetUser: doc.builder, action: 'document_reveal', reason: doc.type });
  res.json({ data: { idNumber: doc.idNumber || null } });
}));

router.get('/project-documents/:id/file', asyncHandler(async (req, res) => {
  const doc = await ProjectDocument.findById(req.params.id).lean();
  if (!doc) throw new HttpError(404, 'Document not found');
  const project = await Project.findById(doc.project).select('builder').lean();
  if (!project) throw new HttpError(404, 'Document not found');
  const owner = await User.findById(project.builder).select('role').lean();
  if (!owner) throw new HttpError(404, 'Document not found');
  resolvePortalScope(req, owner.role);

  const buffer = decryptFromDisk(doc.fileKey, doc.iv, doc.authTag);
  res.setHeader('Content-Type', doc.mimeType || 'application/octet-stream');
  res.setHeader('Content-Disposition', `inline; filename="${(doc.originalName || 'document').replace(/"/g, '')}"`);
  res.setHeader('Cache-Control', 'no-store');
  res.send(buffer);
}));

/* =============================================== service provider verification */
/* Identity + category-specific qualification review. Portal is always
   'service' here. The qualification track's meaning is looked up from
   serviceCategoryRules per provider — never a fixed checklist. */

router.get('/service-applications', asyncHandler(async (req, res) => {
  resolvePortalScope(req, 'service');
  const { page, limit, offset } = paginate(req.query);

  const filter = {};
  if (req.query.status) filter.lifecycleStatus = req.query.status;

  const [rows, total] = await Promise.all([
    ServiceProviderProfile.find(filter).populate('user', 'name email phone status approvalStatus createdAt')
      .sort({ updatedAt: -1 }).skip(offset).limit(limit).lean(),
    ServiceProviderProfile.countDocuments(filter),
  ]);

  res.json({
    data: rows.filter((p) => p.user).map((p) => ({
      id: String(p._id),
      userId: String(p.user._id),
      name: p.user.name,
      email: p.user.email,
      phone: p.user.phone,
      userStatus: p.user.status,
      approvalStatus: p.user.approvalStatus,
      category: p.category,
      categoryLabel: getRule(p.category)?.label || p.category,
      legalEntityName: p.legalEntityName,
      lifecycleStatus: p.lifecycleStatus,
      identityStatus: p.identityStatus,
      qualificationStatus: p.qualificationStatus,
      qualificationApplicable: qualificationRequired(p.category),
      submittedAt: p.submittedAt,
      createdAt: p.createdAt,
    })),
    meta: { page, limit, total },
  });
}));

router.get('/service-applications/:id', asyncHandler(async (req, res) => {
  resolvePortalScope(req, 'service');

  const [profile, user, documents, history] = await Promise.all([
    ServiceProviderProfile.findOne({ user: req.params.id }).lean(),
    User.findById(req.params.id).select('name email phone status approvalStatus isVerified createdAt').lean(),
    ServiceProviderDocument.find({ provider: req.params.id }).sort({ createdAt: -1 }).lean(),
    AuditLog.find({ targetUser: req.params.id }).populate('admin', 'name').sort({ createdAt: -1 }).limit(50).lean(),
  ]);
  if (!profile || !user) throw new HttpError(404, 'Service provider application not found');

  res.json({
    data: {
      profile: { ...profile, id: String(profile._id) },
      categoryRule: getRule(profile.category),
      user: { ...user, id: String(user._id) },
      documents: documents.map(shapeAdminDocument),
      history: history.map((h) => ({
        id: String(h._id), action: h.action, previousStatus: h.previousStatus, newStatus: h.newStatus,
        reason: h.reason, adminName: h.admin?.name, createdAt: h.createdAt,
      })),
    },
  });
}));

const SERVICE_TRACK_FIELD = { identity: 'identityStatus', qualification: 'qualificationStatus' };

async function reviewServiceTrack(req, res, track) {
  const { decision, reason } = z.object({
    decision: z.enum(['verified', 'rejected', 'under_review']),
    reason: z.string().max(500).optional(),
  }).parse(req.body);

  resolvePortalScope(req, 'service');
  const profile = await ServiceProviderProfile.findOne({ user: req.params.id });
  if (!profile) throw new HttpError(404, 'Service provider application not found');
  if (track === 'qualification' && !qualificationRequired(profile.category)) {
    throw new HttpError(409, `${getRule(profile.category)?.label || 'This category'} has no statutory qualification to verify — nothing to review here.`);
  }
  if (decision === 'rejected' && !reason) throw new HttpError(422, 'Add a reason so the provider knows what to fix');

  const field = SERVICE_TRACK_FIELD[track];
  const previousStatus = profile[field];
  profile[field] = decision;
  if (decision === 'rejected') profile.lifecycleStatus = 'resubmission_required';
  await profile.save();

  await writeAudit(req, { targetUser: req.params.id, action: `service_${track}_review`, previousStatus, newStatus: decision, reason });
  await Notification.create({
    user: req.params.id, kind: 'system',
    title: `${track === 'identity' ? 'Identity' : 'Qualification'} verification ${decision === 'verified' ? 'verified' : decision === 'rejected' ? 'rejected' : 'is under review'}`,
    body: reason || undefined,
    link: '/dashboard/service/verification',
  });

  res.json({ message: `${track === 'identity' ? 'Identity' : 'Qualification'} verification updated`, data: { [field]: profile[field], lifecycleStatus: profile.lifecycleStatus } });
}

router.put('/service-applications/:id/identity', asyncHandler((req, res) => reviewServiceTrack(req, res, 'identity')));
router.put('/service-applications/:id/qualification', asyncHandler((req, res) => reviewServiceTrack(req, res, 'qualification')));

router.put('/service-applications/:id/approve', asyncHandler(async (req, res) => {
  resolvePortalScope(req, 'service');
  const profile = await ServiceProviderProfile.findOne({ user: req.params.id });
  if (!profile) throw new HttpError(404, 'Service provider application not found');

  if (profile.identityStatus !== 'verified') throw new HttpError(422, 'Identity must be verified before approving');
  if (qualificationRequired(profile.category) && profile.qualificationStatus !== 'verified') {
    throw new HttpError(422, `${getRule(profile.category)?.label}'s qualification must be verified before approving`);
  }

  const previousStatus = profile.lifecycleStatus;
  profile.lifecycleStatus = 'active';
  profile.activatedAt = new Date();
  await profile.save();
  await User.findByIdAndUpdate(req.params.id, { approvalStatus: 'approved' });

  await writeAudit(req, { targetUser: req.params.id, action: 'service_provider_approve', previousStatus, newStatus: 'active' });
  await Notification.create({
    user: req.params.id, kind: 'system', title: 'Your service provider account is approved',
    body: 'Verification approved — you can post service listings now.',
    link: '/dashboard',
  });

  res.json({ message: 'Service provider approved' });
}));

router.get('/service-documents/:id/file', asyncHandler(async (req, res) => {
  const doc = await ServiceProviderDocument.findById(req.params.id).lean();
  if (!doc) throw new HttpError(404, 'Document not found');
  const owner = await User.findById(doc.provider).select('role').lean();
  if (!owner) throw new HttpError(404, 'Document not found');
  resolvePortalScope(req, owner.role);

  const buffer = decryptFromDisk(doc.fileKey, doc.iv, doc.authTag);
  res.setHeader('Content-Type', doc.mimeType || 'application/octet-stream');
  res.setHeader('Content-Disposition', `inline; filename="${(doc.originalName || 'document').replace(/"/g, '')}"`);
  res.setHeader('Cache-Control', 'no-store');
  res.send(buffer);
}));

router.get('/service-documents/:id/reveal', asyncHandler(async (req, res) => {
  const doc = await ServiceProviderDocument.findById(req.params.id).lean();
  if (!doc) throw new HttpError(404, 'Document not found');
  const owner = await User.findById(doc.provider).select('role').lean();
  if (!owner) throw new HttpError(404, 'Document not found');
  resolvePortalScope(req, owner.role);

  await writeAudit(req, { targetUser: doc.provider, action: 'document_reveal', reason: doc.type });
  res.json({ data: { idNumber: doc.idNumber || null } });
}));

/* ==================================================================== audit */

router.get('/audit-logs', asyncHandler(async (req, res) => {
  const scope = resolvePortalScope(req, req.query.portal);
  const targetIds = await userIdsForPortals(scope);
  const { page, limit, offset } = paginate(req.query);

  const filter = { targetUser: { $in: targetIds } };
  const [rows, total] = await Promise.all([
    AuditLog.find(filter).populate('admin', 'name role').populate('targetUser', 'name role')
      .sort({ createdAt: -1 }).skip(offset).limit(limit).lean(),
    AuditLog.countDocuments(filter),
  ]);

  res.json({
    data: rows.map((r) => ({
      id: String(r._id),
      action: r.action,
      previousStatus: r.previousStatus,
      newStatus: r.newStatus,
      reason: r.reason,
      adminName: r.admin?.name,
      targetName: r.targetUser?.name,
      targetRole: r.targetUser?.role,
      createdAt: r.createdAt,
    })),
    meta: { page, limit, total },
  });
}));

/* ================================================================= overview */

router.get('/overview', asyncHandler(async (req, res) => {
  const scope = resolvePortalScope(req, req.query.portal);
  const ownerIds = await userIdsForPortals(scope);

  const [users, properties, projects, services, leads, employees, pendingApprovals, pendingAgentReview, pendingBuilderReview, pendingProjectVerification, pendingServiceReview] = await Promise.all([
    User.countDocuments({ role: { $in: scope } }),
    Property.countDocuments({ user: { $in: ownerIds } }),
    Project.countDocuments({ builder: { $in: ownerIds } }),
    ServiceOffering.countDocuments({ user: { $in: ownerIds } }),
    Lead.countDocuments({ receiver: { $in: ownerIds } }),
    req.user.role === 'admin' ? User.countDocuments({ role: 'employee' }) : null,
    User.countDocuments({ role: { $in: scope }, approvalStatus: 'pending' }),
    scope.includes('agent')
      ? AgentProfile.countDocuments({ lifecycleStatus: { $in: ['submitted', 'under_review'] } })
      : 0,
    scope.includes('builder')
      ? BuilderProfile.countDocuments({ lifecycleStatus: { $in: ['submitted', 'under_review'] } })
      : 0,
    scope.includes('builder')
      ? Project.countDocuments({ builder: { $in: ownerIds }, verificationStatus: { $in: ['submitted', 'under_review'] } })
      : 0,
    scope.includes('service')
      ? ServiceProviderProfile.countDocuments({ lifecycleStatus: { $in: ['submitted', 'under_review'] } })
      : 0,
  ]);

  res.json({ data: { portals: scope, users, properties, projects, services, leads, employees, pendingApprovals, pendingAgentReview, pendingBuilderReview, pendingProjectVerification, pendingServiceReview } });
}));

module.exports = router;
