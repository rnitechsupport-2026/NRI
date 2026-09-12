const router = require('express').Router();
const { z } = require('zod');
const multer = require('multer');
const User = require('../models/User');
const AgentProfile = require('../models/AgentProfile');
const AgentDocument = require('../models/AgentDocument');
const Notification = require('../models/Notification');
const { requireAuth, requireRole } = require('../middleware/auth');
const { asyncHandler, nn, HttpError } = require('../utils/helpers');
const { encryptToDisk, decryptFromDisk, maskValue } = require('../utils/fileCrypto');

router.use(requireAuth, requireRole('agent'));

async function getOrCreateProfile(userId) {
  let profile = await AgentProfile.findOne({ user: userId });
  if (!profile) profile = await AgentProfile.create({ user: userId });
  return profile;
}

function shapeProfile(profile) {
  const obj = profile.toObject();
  obj.id = String(obj._id);
  obj.completionPct = profile.completionPct();
  return obj;
}

router.get('/profile', asyncHandler(async (req, res) => {
  const profile = await getOrCreateProfile(req.user._id);
  res.json({ data: shapeProfile(profile) });
}));

router.put('/profile', asyncHandler(async (req, res) => {
  const d = z.object({
    agent_type: z.enum(['individual', 'agency', 'company']).optional(),
    company_name: z.string().max(160).optional(),
    office_address: z.string().max(400).optional(),
    operating_areas: z.array(z.string().max(80)).max(30).optional(),
    property_types_handled: z.array(
      z.enum(['residential', 'commercial', 'land', 'rental', 'industrial', 'other'])
    ).optional(),
    photo_url: z.string().max(400).optional(),
    dob: z.string().optional(),
    preferred_language: z.string().max(40).optional(),
    rera_number: z.string().max(80).optional(),
    rera_registered_name: z.string().max(160).optional(),
    rera_authority: z.string().max(120).optional(),
    rera_expiry_date: z.string().optional(),
    business_reg_no: z.string().max(80).optional(),
    authorized_rep_name: z.string().max(160).optional(),
  }).parse(req.body);

  const profile = await getOrCreateProfile(req.user._id);
  if (!['draft', 'resubmission_required'].includes(profile.lifecycleStatus)) {
    throw new HttpError(409, 'Your application is already submitted — contact support to make changes');
  }

  if (d.agent_type !== undefined) profile.agentType = d.agent_type;
  if (d.company_name !== undefined) profile.companyName = nn(d.company_name);
  if (d.office_address !== undefined) profile.officeAddress = nn(d.office_address);
  if (d.operating_areas !== undefined) profile.operatingAreas = d.operating_areas;
  if (d.property_types_handled !== undefined) profile.propertyTypesHandled = d.property_types_handled;
  if (d.photo_url !== undefined) profile.photoUrl = nn(d.photo_url);
  if (d.dob !== undefined) profile.dob = d.dob ? new Date(d.dob) : null;
  if (d.preferred_language !== undefined) profile.preferredLanguage = nn(d.preferred_language);
  if (d.rera_number !== undefined) profile.reraNumber = nn(d.rera_number);
  if (d.rera_registered_name !== undefined) profile.reraRegisteredName = nn(d.rera_registered_name);
  if (d.rera_authority !== undefined) profile.reraAuthority = nn(d.rera_authority);
  if (d.rera_expiry_date !== undefined) profile.reraExpiryDate = d.rera_expiry_date ? new Date(d.rera_expiry_date) : null;
  if (d.business_reg_no !== undefined) profile.businessRegNo = nn(d.business_reg_no);
  if (d.authorized_rep_name !== undefined) profile.authorizedRepName = nn(d.authorized_rep_name);

  await profile.save();
  res.json({ data: shapeProfile(profile) });
}));

/* -------------------------------------------------------------- documents */

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    // Type/size allow-list only — this is NOT malware scanning. A real AV
    // check (e.g. ClamAV, a cloud scanning API) should run here before a
    // file is accepted in a production deployment; none is configured yet.
    if (/^(image\/(jpeg|png|webp)|application\/pdf)$/.test(file.mimetype)) return cb(null, true);
    cb(new Error('Only JPG, PNG, WEBP images or PDF documents are allowed'));
  },
});

function shapeDocument(doc, { reveal = false } = {}) {
  const obj = { ...doc };
  obj.id = String(obj._id);
  delete obj._id;
  delete obj.__v;
  delete obj.fileKey;
  delete obj.iv;
  delete obj.authTag;
  obj.idNumber = reveal ? obj.idNumber || null : maskValue(obj.idNumber);
  return obj;
}

router.post('/documents', upload.single('file'), asyncHandler(async (req, res) => {
  if (!req.file) throw new HttpError(400, 'No file uploaded');
  const d = z.object({
    type: z.enum(['gov_id', 'pan', 'selfie', 'rera_certificate', 'business_doc']),
    id_number: z.string().max(40).optional(),
  }).parse(req.body);

  const { fileKey, iv, authTag } = encryptToDisk(req.file.buffer, req.file.originalname);

  const doc = await AgentDocument.create({
    agent: req.user._id,
    type: d.type,
    fileKey, iv, authTag,
    originalName: req.file.originalname,
    mimeType: req.file.mimetype,
    sizeBytes: req.file.size,
    idNumber: nn(d.id_number),
    status: 'submitted',
  });

  // First document for a track flips that track's status from "not submitted"
  // to "submitted" so progress shows up without a separate profile call.
  const profile = await getOrCreateProfile(req.user._id);
  const trackField = d.type === 'rera_certificate' ? 'reraStatus'
    : d.type === 'business_doc' ? 'businessStatus' : 'kycStatus';
  if (profile[trackField] === 'not_submitted') {
    profile[trackField] = 'submitted';
    await profile.save();
  }

  res.status(201).json({ data: shapeDocument(doc.toObject(), { reveal: true }) });
}));

router.get('/documents', asyncHandler(async (req, res) => {
  const rows = await AgentDocument.find({ agent: req.user._id }).sort({ createdAt: -1 }).lean();
  // Agents see their own numbers in full — masking is for the admin list view.
  res.json({ data: rows.map((d) => shapeDocument(d, { reveal: true })) });
}));

router.get('/documents/:id/file', asyncHandler(async (req, res) => {
  const doc = await AgentDocument.findById(req.params.id).lean();
  if (!doc) throw new HttpError(404, 'Document not found');
  if (doc.agent.toString() !== req.user._id.toString()) throw new HttpError(403, 'Not your document');

  const buffer = decryptFromDisk(doc.fileKey, doc.iv, doc.authTag);
  res.setHeader('Content-Type', doc.mimeType || 'application/octet-stream');
  res.setHeader('Content-Disposition', `inline; filename="${(doc.originalName || 'document').replace(/"/g, '')}"`);
  res.setHeader('Cache-Control', 'no-store');
  res.send(buffer);
}));

/* ---------------------------------------------------------- submit review */

router.post('/submit-for-review', asyncHandler(async (req, res) => {
  const profile = await getOrCreateProfile(req.user._id);
  if (!['draft', 'resubmission_required'].includes(profile.lifecycleStatus)) {
    throw new HttpError(409, 'Application already submitted');
  }
  if (profile.kycStatus === 'not_submitted') throw new HttpError(422, 'Upload your KYC documents before submitting');
  if (profile.reraStatus === 'not_submitted') throw new HttpError(422, 'Add your RERA details before submitting');
  if (profile.agentType !== 'individual' && profile.businessStatus === 'not_submitted') {
    throw new HttpError(422, 'Add your business verification details before submitting');
  }

  profile.lifecycleStatus = 'submitted';
  profile.submittedAt = new Date();
  if (profile.kycStatus === 'submitted') profile.kycStatus = 'under_review';
  if (profile.reraStatus === 'submitted') profile.reraStatus = 'under_review';
  if (profile.agentType !== 'individual' && profile.businessStatus === 'submitted') profile.businessStatus = 'under_review';
  await profile.save();

  const reviewers = await User.find({
    $or: [{ role: 'admin' }, { role: 'employee', managedPortals: 'agent' }],
  }).select('_id').lean();
  for (const r of reviewers) {
    await Notification.create({
      user: r._id, kind: 'system',
      title: `New agent application: ${req.user.name}`,
      body: 'Submitted for KYC/RERA review.',
      link: '/dashboard/admin/agents',
    });
  }

  res.json({ message: 'Submitted for review', data: { lifecycleStatus: profile.lifecycleStatus } });
}));

module.exports = router;
