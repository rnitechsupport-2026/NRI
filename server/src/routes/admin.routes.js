const router = require('express').Router();
const { z } = require('zod');
const User = require('../models/User');
const Property = require('../models/Property');
const Project = require('../models/Project');
const ServiceOffering = require('../models/ServiceOffering');
const Microsite = require('../models/Microsite');
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
const leadNotes = require('../services/leadNotes');
const { requireAuth, requireRole } = require('../middleware/auth');
const { asyncHandler, nn, paginate, HttpError } = require('../utils/helpers');
const { decryptFromDisk, maskValue } = require('../utils/fileCrypto');

const {
  MANAGED_ROLES, DEFAULT_EMPLOYEE_PASSWORD,
  assertCanManage, assertCanManageId, managedUserQuery, managedUserIds, assertPortalAccess, scopePortals,
} = require('../services/staffScope');

router.use(requireAuth, requireRole('admin', 'employee'));

/**
 * Every route below is reachable by the super admin (full access) and by an
 * employee — who only ever reaches the users assigned to them, by type or by
 * name (services/staffScope.js). These three helpers are the only way a
 * route decides "may this staff member see / touch this":
 *
 *   scopedUserIds(req, portal?)  ids of every user they manage (lists)
 *   assertManages(req, userDoc)  one user, already loaded (single records)
 *   assertManagesRole(req, id, role)  a user id that must be theirs AND of that type
 *
 * Listings, leads, microsites and documents are always authorized through
 * the user they belong to — never by their own id alone.
 */
const scopedUserIds = (req, portal) => managedUserIds(req.user, portal);
const assertManages = (req, target) => assertCanManage(req.user, target);
async function assertManagesRole(req, userId, role) {
  const target = await assertCanManageId(req.user, userId, 'role');
  if (target.role !== role) throw new HttpError(404, 'Application not found');
  return target;
}

/** Authorizes + applies a moderation write on a listing owned via `ownerField`. */
async function moderateListing(req, Model, ownerField, id, patch, del = false) {
  const existing = await Model.findById(id).select(ownerField).lean();
  if (!existing) throw new HttpError(404, 'Not found');
  const owner = await User.findById(existing[ownerField]).select('role').lean();
  if (!owner) throw new HttpError(404, 'Owner not found');
  assertManages(req, owner);
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

/** Employees with the users individually assigned to them spelled out. */
async function shapeEmployee(doc) {
  const obj = shapeUser(doc);
  const assigned = (obj.assignedUsers || []).length
    ? await User.find({ _id: { $in: obj.assignedUsers } }).select('name email role').lean()
    : [];
  obj.assignedUsers = assigned.map((u) => ({ id: String(u._id), name: u.name, email: u.email, role: u.role }));
  return obj;
}

/** Ids of real, assignable users — an employee can only be given owners,
 *  agents, builders and service providers. */
async function validAssignees(ids = []) {
  const unique = [...new Set(ids.map(String))];
  if (!unique.length) return [];
  const rows = await User.find({ _id: { $in: unique }, role: { $in: MANAGED_ROLES } }).select('_id').lean();
  if (rows.length !== unique.length) throw new HttpError(422, 'One of the selected users cannot be assigned to an employee');
  return rows.map((u) => u._id);
}

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid user');

router.get('/employees', requireRole('admin'), asyncHandler(async (req, res) => {
  const rows = await User.find({ role: 'employee' }).sort({ createdAt: -1 }).lean();
  res.json({ data: await Promise.all(rows.map(shapeEmployee)), meta: { defaultPassword: DEFAULT_EMPLOYEE_PASSWORD } });
}));

/** GET /assignable-users?q=&role= — the picker behind "assign specific users". */
router.get('/assignable-users', requireRole('admin'), asyncHandler(async (req, res) => {
  const filter = { role: MANAGED_ROLES.includes(req.query.role) ? req.query.role : { $in: MANAGED_ROLES } };
  if (req.query.q) {
    const q = String(req.query.q).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.$or = [{ name: new RegExp(q, 'i') }, { email: new RegExp(q, 'i') }, { phone: new RegExp(q, 'i') }];
  }
  const rows = await User.find(filter).select('name email phone role companyName approvalStatus').sort({ createdAt: -1 }).limit(30).lean();
  res.json({ data: rows.map((u) => ({ id: String(u._id), name: u.name, email: u.email, phone: u.phone, role: u.role, companyName: u.companyName, approvalStatus: u.approvalStatus })) });
}));

router.post('/employees', requireRole('admin'), asyncHandler(async (req, res) => {
  const d = z.object({
    name: z.string().min(2, 'Enter a name').max(120),
    email: z.string().email('Enter a valid email'),
    phone: z.string().regex(/^[0-9]{10}$/, 'Enter a valid 10 digit mobile number'),
    managed_portals: z.array(z.enum(MANAGED_ROLES)).default([]),
    assigned_users: z.array(objectId).max(500).default([]),
  }).parse(req.body);
  if (!d.managed_portals.length && !d.assigned_users.length) {
    throw new HttpError(422, 'Assign at least one user type or one specific user');
  }

  const exists = await User.findOne({ $or: [{ email: d.email }, { phone: d.phone }] }).select('_id').lean();
  if (exists) throw new HttpError(409, 'An account already exists with this email or mobile number');

  // The login is the employee's email + the default password; they are asked
  // to change it after their first sign-in.
  const employee = await User.create({
    name: d.name,
    email: d.email,
    phone: d.phone,
    password: DEFAULT_EMPLOYEE_PASSWORD,
    mustChangePassword: true,
    role: 'employee',
    managedPortals: d.managed_portals,
    assignedUsers: await validAssignees(d.assigned_users),
  });

  res.status(201).json({ data: await shapeEmployee(employee.toObject()), meta: { defaultPassword: DEFAULT_EMPLOYEE_PASSWORD } });
}));

router.put('/employees/:id', requireRole('admin'), asyncHandler(async (req, res) => {
  const d = z.object({
    name: z.string().min(2).max(120).optional(),
    phone: z.string().regex(/^[0-9]{10}$/, 'Enter a valid 10 digit mobile number').optional(),
    managed_portals: z.array(z.enum(MANAGED_ROLES)).optional(),
    assigned_users: z.array(objectId).max(500).optional(),
    status: z.enum(['active', 'suspended']).optional(),
    reset_password: z.boolean().optional(),
  }).parse(req.body);

  const employee = await User.findOne({ _id: req.params.id, role: 'employee' });
  if (!employee) throw new HttpError(404, 'Employee not found');

  if (d.name !== undefined) employee.name = d.name;
  if (d.phone !== undefined) employee.phone = d.phone;
  if (d.managed_portals !== undefined) employee.managedPortals = d.managed_portals;
  if (d.assigned_users !== undefined) employee.assignedUsers = await validAssignees(d.assigned_users);
  if (d.status !== undefined) employee.status = d.status;
  if (d.reset_password) {
    employee.password = DEFAULT_EMPLOYEE_PASSWORD;
    employee.mustChangePassword = true;
  }
  if ((d.managed_portals !== undefined || d.assigned_users !== undefined)
      && !employee.managedPortals.length && !employee.assignedUsers.length) {
    throw new HttpError(422, 'Assign at least one user type or one specific user');
  }
  await employee.save();

  res.json({ data: await shapeEmployee(employee.toObject()), message: d.reset_password ? `Password reset to ${DEFAULT_EMPLOYEE_PASSWORD}` : undefined });
}));

router.delete('/employees/:id', requireRole('admin'), asyncHandler(async (req, res) => {
  const employee = await User.findOne({ _id: req.params.id, role: 'employee' }).select('_id').lean();
  if (!employee) throw new HttpError(404, 'Employee not found');
  await User.findByIdAndDelete(req.params.id);
  res.json({ message: 'Employee removed' });
}));

/* =================================================================== users */

const withApprover = (q) => q.populate({ path: 'approvedBy', select: 'name role' });
function shapeManagedUser(doc) {
  const obj = shapeUser(doc);
  const by = obj.approvedBy && typeof obj.approvedBy === 'object' ? obj.approvedBy : null;
  obj.approvedBy = by ? String(by._id) : null;
  obj.approvedByName = by?.name || null;
  obj.approvedByRole = by?.role || null;
  delete obj.managedPortals; delete obj.assignedUsers; delete obj.mustChangePassword;
  return obj;
}

router.get('/users', asyncHandler(async (req, res) => {
  const { page, limit, offset } = paginate(req.query);

  await assertPortalAccess(req.user, req.query.portal);
  const clauses = [managedUserQuery(req.user, req.query.portal)];
  if (req.query.q) {
    const q = String(req.query.q).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    clauses.push({ $or: [{ name: new RegExp(q, 'i') }, { email: new RegExp(q, 'i') }, { phone: new RegExp(q, 'i') }] });
  }
  if (req.query.approval) {
    if (!['pending', 'approved', 'rejected'].includes(req.query.approval)) throw new HttpError(400, 'Invalid approval filter');
    clauses.push({ approvalStatus: req.query.approval });
  }
  const filter = { $and: clauses };

  const [rows, total] = await Promise.all([
    withApprover(User.find(filter)).sort({ createdAt: -1 }).skip(offset).limit(limit).lean(),
    User.countDocuments(filter),
  ]);
  res.json({ data: rows.map(shapeManagedUser), meta: { page, limit, total } });
}));

const shapeHistory = (h) => ({
  id: String(h._id), action: h.action, previousStatus: h.previousStatus, newStatus: h.newStatus,
  reason: h.reason, adminName: h.admin?.name, adminRole: h.admin?.role, createdAt: h.createdAt,
});

/** GET /users/:id — one assigned user in full: profile, who approved them,
 *  their properties, their leads and the approval history. */
router.get('/users/:id', asyncHandler(async (req, res) => {
  await assertCanManageId(req.user, req.params.id);
  const user = await withApprover(User.findById(req.params.id)).lean();

  const [properties, leads, history, leadTotal] = await Promise.all([
    Property.find({ user: user._id }).populate({ path: 'reviewedBy', select: 'name role' }).sort({ createdAt: -1 }).limit(100).lean(),
    Lead.find({ receiver: user._id }).populate('property', 'title slug').populate('project', 'name').populate('service', 'title')
      .sort({ createdAt: -1 }).limit(100).lean(),
    AuditLog.find({ targetUser: user._id }).populate('admin', 'name role').sort({ createdAt: -1 }).limit(100).lean(),
    Lead.countDocuments({ receiver: user._id }),
  ]);

  res.json({
    data: {
      user: shapeManagedUser(user),
      properties: properties.map(shapeAdminProperty),
      leads: leads.map((l) => ({
        id: String(l._id), name: l.name, phone: l.phone, email: l.email, status: l.status, temperature: l.temperature,
        source: l.source, createdAt: l.createdAt, about: l.property?.title || l.project?.name || l.service?.title || null,
      })),
      leadTotal,
      history: history.map(shapeHistory),
    },
  });
}));

router.put('/users/:id/status', asyncHandler(async (req, res) => {
  const { status } = z.object({ status: z.enum(['active', 'suspended']) }).parse(req.body);
  const target = await User.findById(req.params.id).select('role status').lean();
  if (!target) throw new HttpError(404, 'User not found');
  assertManages(req, target);
  await User.findByIdAndUpdate(req.params.id, { status });
  await writeAudit(req, { targetUser: req.params.id, action: 'user_status', previousStatus: target.status, newStatus: status });
  res.json({ message: status === 'suspended' ? 'User suspended' : 'User reactivated' });
}));

/** PUT /users/:id/approval — the verification decision on a new account.
 *  Records who decided, when and why; the user is told either way. */
router.put('/users/:id/approval', asyncHandler(async (req, res) => {
  const { approval_status, reason } = z.object({
    approval_status: z.enum(['pending', 'approved', 'rejected']),
    reason: z.string().max(500).optional(),
  }).parse(req.body);
  const target = await User.findById(req.params.id).select('role approvalStatus name').lean();
  if (!target) throw new HttpError(404, 'User not found');
  assertManages(req, target);
  if (target.role === 'agent') {
    throw new HttpError(409, 'Agents go through KYC/RERA review — use Agent Applications to approve or reject them, not this generic action.');
  }
  if (target.role === 'builder') {
    throw new HttpError(409, 'Builders go through company/entity review — use Builder Applications to approve or reject them, not this generic action.');
  }
  if (target.role === 'service') {
    throw new HttpError(409, 'Service providers go through identity/qualification review — use Service Applications to approve or reject them, not this generic action.');
  }
  if (approval_status === 'rejected' && !reason) throw new HttpError(422, 'Add a reason so the user knows why');

  const decided = approval_status !== 'pending';
  await User.findByIdAndUpdate(req.params.id, {
    approvalStatus: approval_status,
    approvedBy: decided ? req.user._id : null,
    approvedAt: decided ? new Date() : null,
    approvalNote: nn(reason),
    ...(approval_status === 'approved' ? { isVerified: true } : {}),
  });
  await writeAudit(req, { targetUser: req.params.id, action: 'approval_status', previousStatus: target.approvalStatus, newStatus: approval_status, reason });
  if (decided) {
    await Notification.create({
      user: req.params.id, kind: 'system',
      title: approval_status === 'approved' ? 'Your account is approved' : 'Your account was not approved',
      body: approval_status === 'approved' ? 'Verification complete — you can post properties now.' : reason,
      link: '/dashboard',
    });
  }
  const messages = { approved: 'Account approved — they can post listings now', rejected: 'Application rejected', pending: 'Moved back to under verification' };
  res.json({ message: messages[approval_status] });
}));

router.put('/users/:id/verify', asyncHandler(async (req, res) => {
  const { is_verified } = z.object({ is_verified: z.boolean() }).parse(req.body);
  const target = await User.findById(req.params.id).select('role isVerified').lean();
  if (!target) throw new HttpError(404, 'User not found');
  assertManages(req, target);
  await User.findByIdAndUpdate(req.params.id, { isVerified: is_verified });
  await writeAudit(req, {
    targetUser: req.params.id, action: 'user_verify',
    previousStatus: String(!!target.isVerified), newStatus: String(is_verified),
  });
  res.json({ message: is_verified ? 'User verified' : 'Verification removed' });
}));

/* =============================================================== properties */

function shapeAdminProperty(p) {
  const by = p.reviewedBy && typeof p.reviewedBy === 'object' ? p.reviewedBy : null;
  return {
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
    ownerId: p.user?._id ? String(p.user._id) : (p.user ? String(p.user) : null),
    ownerName: p.user?.name,
    ownerRole: p.user?.role,
    ownerCompany: p.user?.companyName,
    reviewedByName: by?.name || null,
    reviewedAt: p.reviewedAt || null,
    reviewNote: p.reviewNote || null,
  };
}

const PROPERTY_STATUSES = ['pending', 'rejected', 'active', 'sold', 'rented', 'inactive'];

router.get('/properties', asyncHandler(async (req, res) => {
  const ownerIds = await scopedUserIds(req, req.query.portal);
  const { page, limit, offset } = paginate(req.query);

  const filter = { user: { $in: ownerIds } };
  if (req.query.status) {
    if (!PROPERTY_STATUSES.includes(req.query.status)) throw new HttpError(400, 'Invalid status filter');
    filter.status = req.query.status;
  }
  const [rows, total] = await Promise.all([
    Property.find(filter).populate({ path: 'user', select: 'name role companyName' }).populate({ path: 'reviewedBy', select: 'name role' })
      .sort({ createdAt: -1 }).skip(offset).limit(limit).lean(),
    Property.countDocuments(filter),
  ]);

  res.json({ data: rows.map(shapeAdminProperty), meta: { page, limit, total } });
}));

/** PUT /properties/:id/review — the verification decision on a listing.
 *  Approved = live; rejected = sent back to its lister with the reason. */
router.put('/properties/:id/review', asyncHandler(async (req, res) => {
  const { decision, reason } = z.object({
    decision: z.enum(['approved', 'rejected']),
    reason: z.string().max(500).optional(),
  }).parse(req.body);
  if (decision === 'rejected' && !reason) throw new HttpError(422, 'Add a reason so the lister knows what to fix');

  const property = await Property.findById(req.params.id).select('user status title').lean();
  if (!property) throw new HttpError(404, 'Not found');
  const owner = await User.findById(property.user).select('role approvalStatus').lean();
  if (!owner) throw new HttpError(404, 'Owner not found');
  assertManages(req, owner);
  if (decision === 'approved' && owner.approvalStatus !== 'approved') {
    throw new HttpError(409, 'Approve the user\'s account first — an unverified user cannot have a live property');
  }

  const status = decision === 'approved' ? 'active' : 'rejected';
  await Property.findByIdAndUpdate(property._id, { status, reviewedBy: req.user._id, reviewedAt: new Date(), reviewNote: nn(reason) });
  await writeAudit(req, {
    targetUser: property.user, action: 'property_review', previousStatus: property.status, newStatus: status,
    reason: [`"${property.title}"`, reason].filter(Boolean).join(' — ').slice(0, 500),
  });
  await Notification.create({
    user: property.user, kind: 'system',
    title: decision === 'approved' ? `"${property.title}" is approved and live` : `"${property.title}" was rejected`,
    body: reason || undefined,
    link: '/dashboard/properties',
  });

  res.json({ message: decision === 'approved' ? 'Property approved — it is live now' : 'Property rejected', data: { status } });
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

/* ================================================================ microsites */

router.get('/microsites', asyncHandler(async (req, res) => {
  const ownerIds = await scopedUserIds(req, req.query.portal);
  const { page, limit, offset } = paginate(req.query);

  const filter = { createdBy: { $in: ownerIds } };
  const [rows, total] = await Promise.all([
    Microsite.find(filter).populate('property', 'title slug').populate('project', 'name slug').populate('createdBy', 'name role companyName')
      .sort({ createdAt: -1 }).skip(offset).limit(limit).lean(),
    Microsite.countDocuments(filter),
  ]);

  res.json({
    data: rows.map((m) => ({
      id: String(m._id),
      slug: m.slug,
      status: m.status,
      templateId: m.templateId,
      propertyTitle: m.property?.title || m.project?.name,
      propertySlug: m.property?.slug || m.project?.slug,
      createdByName: m.createdBy?.name,
      createdByRole: m.createdBy?.role,
      publishedAt: m.publishedAt,
      createdAt: m.createdAt,
    })),
    meta: { page, limit, total },
  });
}));

router.put('/microsites/:id/status', asyncHandler(async (req, res) => {
  const { status } = z.object({ status: z.enum(['draft', 'published']) }).parse(req.body);
  await moderateListing(req, Microsite, 'createdBy', req.params.id, { status, publishedAt: status === 'published' ? new Date() : undefined });
  res.json({ message: status === 'published' ? 'Microsite published' : 'Microsite unpublished' });
}));

router.delete('/microsites/:id', asyncHandler(async (req, res) => {
  await moderateListing(req, Microsite, 'createdBy', req.params.id, null, true);
  res.json({ message: 'Microsite deleted' });
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
  const ownerIds = await scopedUserIds(req, req.query.portal);
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
  assertManages(req, project.builder);

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
  assertManages(req, owner);

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
  const ownerIds = await scopedUserIds(req, req.query.portal);
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
/* Admin/Employee (per their assigned portals) see every lead across a
   portal, change its status, and assign it to a specific lister. Listers
   now also get a self-service view of their OWN leads at GET /leads/mine
   in lead.routes.js — this stays the cross-portal, audited surface. */

const STAGE_LABEL = {
  new: 'New', contacted: 'Contacted', 'visit-scheduled': 'Visit Scheduled',
  nurturing: 'Nurturing', negotiation: 'Negotiation', booked: 'Booked', lost: 'Lost',
};

router.get('/leads', asyncHandler(async (req, res) => {
  const receiverIds = await scopedUserIds(req, req.query.portal);
  const { page, limit, offset } = paginate(req.query);

  const filter = { receiver: { $in: receiverIds } };
  if (req.query.receiver) {
    // one assigned user's leads — still only if that user is in scope
    if (!receiverIds.some((id) => String(id) === String(req.query.receiver))) throw new HttpError(403, 'This user is not assigned to you');
    filter.receiver = req.query.receiver;
  }
  const [rows, total] = await Promise.all([
    Lead.find(filter)
      .populate('property', 'title slug')
      .populate('project', 'name slug')
      .populate('service', 'title')
      .populate('receiver', 'name role companyName')
      .populate('assignedTo', 'name role')
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
      receiverId: l.receiver ? String(l.receiver._id) : null,
      receiverName: l.receiver?.name,
      receiverRole: l.receiver?.role,
      assignedTo: l.assignedTo ? String(l.assignedTo._id) : null,
      assignedToName: l.assignedTo?.name || null,
      about: l.property?.title || l.project?.name || l.service?.title || null,
      bookingAmount: l.bookingAmount ?? null,
      bookingDate: l.bookingDate || null,
      notesCount: (l.notes || []).length,
      lastNote: l.notes?.length ? l.notes[l.notes.length - 1].text : null,
    })),
    meta: { page, limit, total },
  });
}));

router.patch('/leads/:id', asyncHandler(async (req, res) => {
  const d = z.object({
    status: z.enum(['new', 'contacted', 'visit-scheduled', 'nurturing', 'negotiation', 'booked', 'closed', 'lost']).optional(),
    assigned_to: z.string().nullable().optional(),
  }).parse(req.body);
  if (d.status === undefined && d.assigned_to === undefined) throw new HttpError(400, 'Nothing to update');

  const lead = await Lead.findById(req.params.id).select('receiver status assignedTo').lean();
  if (!lead) throw new HttpError(404, 'Lead not found');
  const receiver = await User.findById(lead.receiver).select('role').lean();
  if (!receiver) throw new HttpError(404, 'Receiving user not found');
  assertManages(req, receiver);

  const patch = {};
  if (d.status !== undefined) patch.status = d.status;

  let assignee = null;
  if (d.assigned_to !== undefined) {
    if (d.assigned_to === null) {
      patch.assignedTo = null;
    } else {
      assignee = await User.findById(d.assigned_to).select('role name').lean();
      if (!assignee) throw new HttpError(404, 'Assignee not found');
      assertManages(req, assignee);
      patch.assignedTo = d.assigned_to;
    }
  }

  await Lead.findByIdAndUpdate(req.params.id, patch);
  if (d.status !== undefined) {
    await leadNotes.addNote(req.params.id, {
      authorId: req.user._id,
      text: `Moved to ${STAGE_LABEL[d.status] || d.status} (by admin)`,
      statusAfter: d.status,
    });
  }
  await writeAudit(req, {
    targetUser: lead.receiver,
    action: d.assigned_to !== undefined ? 'lead_assign' : 'lead_status',
    previousStatus: d.status !== undefined ? lead.status : (lead.assignedTo ? String(lead.assignedTo) : 'unassigned'),
    newStatus: d.status !== undefined ? d.status : (assignee ? assignee.name : 'unassigned'),
    reason: `lead ${req.params.id}`,
  });
  res.json({ message: 'Enquiry updated' });
}));

function shapeAdminNote(n) {
  return {
    id: String(n._id),
    text: n.text,
    authorId: n.author?._id ? String(n.author._id) : (n.author ? String(n.author) : null),
    authorName: n.author?.name || null,
    temperature: n.temperature || null,
    statusAfter: n.statusAfter || null,
    createdAt: n.createdAt,
  };
}

router.get('/leads/:id', asyncHandler(async (req, res) => {
  const lead = await Lead.findById(req.params.id)
    .populate('property', 'title slug')
    .populate('project', 'name slug')
    .populate('service', 'title')
    .populate('receiver', 'name role')
    .populate('assignedTo', 'name role')
    .populate({ path: 'notes.author', select: 'name' })
    .lean();
  if (!lead) throw new HttpError(404, 'Lead not found');
  const receiver = await User.findById(lead.receiver).select('role').lean();
  assertManages(req, receiver);

  res.json({
    data: {
      id: String(lead._id),
      name: lead.name,
      phone: lead.phone,
      email: lead.email,
      message: lead.message,
      status: lead.status,
      temperature: lead.temperature,
      score: lead.score,
      source: lead.source,
      createdAt: lead.createdAt,
      receiverId: lead.receiver ? String(lead.receiver._id) : null,
      receiverName: lead.receiver?.name,
      receiverRole: lead.receiver?.role,
      assignedTo: lead.assignedTo ? String(lead.assignedTo._id) : null,
      assignedToName: lead.assignedTo?.name || null,
      about: lead.property?.title || lead.project?.name || lead.service?.title || null,
      bookingAmount: lead.bookingAmount ?? null,
      bookingDate: lead.bookingDate || null,
      bookingUnit: lead.bookingUnit || null,
      bookingNotes: lead.bookingNotes || null,
      bookedAt: lead.bookedAt || null,
      notes: (lead.notes || []).map(shapeAdminNote).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
    },
  });
}));

router.post('/leads/:id/notes', asyncHandler(async (req, res) => {
  const d = z.object({
    text: z.string().min(2, 'Add a note').max(1000),
    temperature: z.enum(['hot', 'warm', 'cold']).optional(),
  }).parse(req.body);

  const lead = await Lead.findById(req.params.id).select('receiver').lean();
  if (!lead) throw new HttpError(404, 'Lead not found');
  const receiver = await User.findById(lead.receiver).select('role').lean();
  assertManages(req, receiver);

  await leadNotes.addNote(lead._id, { authorId: req.user._id, text: d.text, temperature: d.temperature });
  await writeAudit(req, { targetUser: lead.receiver, action: 'lead_note', reason: `lead ${req.params.id}` });
  res.status(201).json({ message: 'Note added' });
}));

router.post('/leads/:id/book', asyncHandler(async (req, res) => {
  const d = z.object({
    amount: z.coerce.number().min(0, 'Enter the booking amount'),
    booking_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal('')),
    unit: z.string().max(120).optional().or(z.literal('')),
    notes: z.string().max(500).optional().or(z.literal('')),
  }).parse(req.body);

  const lead = await Lead.findById(req.params.id).select('receiver status').lean();
  if (!lead) throw new HttpError(404, 'Lead not found');
  const receiver = await User.findById(lead.receiver).select('role').lean();
  assertManages(req, receiver);
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
  await writeAudit(req, { targetUser: lead.receiver, action: 'lead_book', newStatus: 'booked', reason: `lead ${req.params.id}` });
  res.json({ message: 'Lead marked as booked' });
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
  const { page, limit, offset } = paginate(req.query);

  // only the applications of users assigned to this staff member
  const filter = { user: { $in: await scopedUserIds(req, 'agent') } };
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
  await assertManagesRole(req, req.params.id, 'agent');

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

  await assertManagesRole(req, req.params.id, 'agent');
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
  await assertManagesRole(req, req.params.id, 'agent');
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
  await User.findByIdAndUpdate(req.params.id, { approvalStatus: 'approved', approvedBy: req.user._id, approvedAt: new Date(), approvalNote: null });

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
  assertManages(req, owner);

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
  assertManages(req, owner);

  await writeAudit(req, { targetUser: doc.agent, action: 'document_reveal', reason: doc.type });
  res.json({ data: { idNumber: doc.idNumber || null } });
}));

/* ===================================================== builder verification */
/* Company/entity review for builder applications. Portal is always 'builder'
   here — an employee needs 'builder' in their managedPortals. Per-project
   RERA/land/approvals review lives above, under /projects/:id/verification. */

router.get('/builder-applications', asyncHandler(async (req, res) => {
  const { page, limit, offset } = paginate(req.query);

  // only the applications of users assigned to this staff member
  const filter = { user: { $in: await scopedUserIds(req, 'builder') } };
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
  await assertManagesRole(req, req.params.id, 'builder');

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

  await assertManagesRole(req, req.params.id, 'builder');
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
  await assertManagesRole(req, req.params.id, 'builder');
  const profile = await BuilderProfile.findOne({ user: req.params.id });
  if (!profile) throw new HttpError(404, 'Builder application not found');

  if (profile.companyStatus !== 'verified') throw new HttpError(422, 'Company/entity details must be verified before approving');

  const previousStatus = profile.lifecycleStatus;
  profile.lifecycleStatus = 'active';
  profile.activatedAt = new Date();
  await profile.save();
  await User.findByIdAndUpdate(req.params.id, { approvalStatus: 'approved', approvedBy: req.user._id, approvedAt: new Date(), approvalNote: null });

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
  assertManages(req, owner);

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
  assertManages(req, owner);

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
  assertManages(req, owner);

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
  const { page, limit, offset } = paginate(req.query);

  // only the applications of users assigned to this staff member
  const filter = { user: { $in: await scopedUserIds(req, 'service') } };
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
  await assertManagesRole(req, req.params.id, 'service');

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

  await assertManagesRole(req, req.params.id, 'service');
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
  await assertManagesRole(req, req.params.id, 'service');
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
  await User.findByIdAndUpdate(req.params.id, { approvalStatus: 'approved', approvedBy: req.user._id, approvedAt: new Date(), approvalNote: null });

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
  assertManages(req, owner);

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
  assertManages(req, owner);

  await writeAudit(req, { targetUser: doc.provider, action: 'document_reveal', reason: doc.type });
  res.json({ data: { idNumber: doc.idNumber || null } });
}));

/* ==================================================================== audit */

router.get('/audit-logs', asyncHandler(async (req, res) => {
  const targetIds = await scopedUserIds(req, req.query.portal);
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
      adminRole: r.admin?.role,
      targetId: r.targetUser?._id ? String(r.targetUser._id) : null,
      targetName: r.targetUser?.name,
      targetRole: r.targetUser?.role,
      createdAt: r.createdAt,
    })),
    meta: { page, limit, total },
  });
}));

/* ================================================================= overview */

/* ========================================================= staff dashboard */
/* The Employee Portal's home (/staff): the numbers and short queues an
   employee works from — every one of them counted over their assigned users
   only (an admin gets the same view across everyone). */

const ACTIVE_LEAD_STATUSES = ['contacted', 'visit-scheduled', 'nurturing', 'negotiation'];
const APPROVAL_EVENTS = [
  { action: 'approval_status', newStatus: 'approved' },
  { action: 'property_review', newStatus: 'active' },
  { action: { $in: ['agent_approve', 'builder_approve', 'service_provider_approve'] } },
];

router.get('/staff-dashboard', asyncHandler(async (req, res) => {
  const ids = await scopedUserIds(req);
  const mine = { $in: ids };
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [byRole, pendingUsers, pendingProperties, activeLeads, pendingLeads, approvedThisWeek, recent, userQueue, propertyQueue] = await Promise.all([
    User.aggregate([{ $match: { _id: mine } }, { $group: { _id: '$role', count: { $sum: 1 } } }]),
    User.countDocuments({ _id: mine, approvalStatus: 'pending' }),
    Property.countDocuments({ user: mine, status: 'pending' }),
    Lead.countDocuments({ receiver: mine, status: { $in: ACTIVE_LEAD_STATUSES } }),
    Lead.countDocuments({ receiver: mine, status: 'new' }),
    AuditLog.countDocuments({ targetUser: mine, $or: APPROVAL_EVENTS, createdAt: { $gte: weekAgo } }),
    AuditLog.find({ targetUser: mine, $or: APPROVAL_EVENTS }).populate('admin', 'name role').populate('targetUser', 'name role')
      .sort({ createdAt: -1 }).limit(8).lean(),
    User.find({ _id: mine, approvalStatus: 'pending' }).select('name email role createdAt').sort({ createdAt: -1 }).limit(5).lean(),
    Property.find({ user: mine, status: 'pending' }).select('title slug locality city user createdAt').populate('user', 'name role')
      .sort({ createdAt: -1 }).limit(5).lean(),
  ]);

  res.json({
    data: {
      portals: await scopePortals(req.user),
      assignedUsers: ids.length,
      usersByRole: Object.fromEntries(byRole.map((r) => [r._id, r.count])),
      pendingUsers,
      pendingProperties,
      activeLeads,
      pendingLeads,
      approvedThisWeek,
      recentlyApproved: recent.map((r) => ({
        id: String(r._id), action: r.action, reason: r.reason, createdAt: r.createdAt,
        targetId: r.targetUser?._id ? String(r.targetUser._id) : null, targetName: r.targetUser?.name, targetRole: r.targetUser?.role,
        adminName: r.admin?.name, adminRole: r.admin?.role,
      })),
      userQueue: userQueue.map((u) => ({ id: String(u._id), name: u.name, email: u.email, role: u.role, createdAt: u.createdAt })),
      propertyQueue: propertyQueue.map((p) => ({
        id: String(p._id), title: p.title, slug: p.slug, place: [p.locality, p.city].filter(Boolean).join(', '),
        ownerId: p.user?._id ? String(p.user._id) : null, ownerName: p.user?.name, ownerRole: p.user?.role, createdAt: p.createdAt,
      })),
    },
  });
}));

router.get('/overview', asyncHandler(async (req, res) => {
  const ownerIds = await scopedUserIds(req, req.query.portal);
  // the user types this staff member has anyone in (all four for an admin)
  const scope = req.query.portal ? [req.query.portal] : await scopePortals(req.user);
  const mine = { $in: ownerIds };
  const inReview = { $in: ['submitted', 'under_review'] };

  const [users, properties, projects, services, leads, employees, pendingApprovals, pendingProperties, pendingAgentReview, pendingBuilderReview, pendingProjectVerification, pendingServiceReview] = await Promise.all([
    User.countDocuments({ _id: mine }),
    Property.countDocuments({ user: mine }),
    Project.countDocuments({ builder: mine }),
    ServiceOffering.countDocuments({ user: mine }),
    Lead.countDocuments({ receiver: mine }),
    req.user.role === 'admin' ? User.countDocuments({ role: 'employee' }) : null,
    User.countDocuments({ _id: mine, approvalStatus: 'pending' }),
    Property.countDocuments({ user: mine, status: 'pending' }),
    scope.includes('agent') ? AgentProfile.countDocuments({ user: mine, lifecycleStatus: inReview }) : 0,
    scope.includes('builder') ? BuilderProfile.countDocuments({ user: mine, lifecycleStatus: inReview }) : 0,
    scope.includes('builder') ? Project.countDocuments({ builder: mine, verificationStatus: inReview }) : 0,
    scope.includes('service') ? ServiceProviderProfile.countDocuments({ user: mine, lifecycleStatus: inReview }) : 0,
  ]);

  res.json({ data: { portals: scope, users, properties, projects, services, leads, employees, pendingApprovals, pendingProperties, pendingAgentReview, pendingBuilderReview, pendingProjectVerification, pendingServiceReview } });
}));

module.exports = router;
