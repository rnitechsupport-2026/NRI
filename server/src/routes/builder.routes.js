const router = require('express').Router();
const { z } = require('zod');
const multer = require('multer');
const User = require('../models/User');
const BuilderProfile = require('../models/BuilderProfile');
const BuilderDocument = require('../models/BuilderDocument');
const Notification = require('../models/Notification');
const { requireAuth, requireRole } = require('../middleware/auth');
const { asyncHandler, nn, HttpError } = require('../utils/helpers');
const { encryptToDisk, decryptFromDisk, maskValue } = require('../utils/fileCrypto');

router.use(requireAuth, requireRole('builder'));

async function getOrCreateProfile(userId) {
  let profile = await BuilderProfile.findOne({ user: userId });
  if (!profile) profile = await BuilderProfile.create({ user: userId });
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
    entity_type: z.enum(['individual', 'proprietorship', 'partnership', 'llp', 'private_limited', 'public_limited']).optional(),
    legal_entity_name: z.string().max(200).optional(),
    trade_name: z.string().max(160).optional(),
    cin: z.string().max(40).optional(),
    llpin: z.string().max(40).optional(),
    pan: z.string().max(20).optional(),
    gstin: z.string().max(20).optional(),
    registered_address: z.string().max(400).optional(),
    directors: z.array(z.object({ name: z.string().max(120), din: z.string().max(20).optional() })).max(20).optional(),
    incorporation_date: z.string().optional(),
    previous_projects_note: z.string().max(2000).optional(),
  }).parse(req.body);

  const profile = await getOrCreateProfile(req.user._id);
  if (!['draft', 'resubmission_required'].includes(profile.lifecycleStatus)) {
    throw new HttpError(409, 'Your application is already submitted — contact support to make changes');
  }

  if (d.entity_type !== undefined) profile.entityType = d.entity_type;
  if (d.legal_entity_name !== undefined) profile.legalEntityName = nn(d.legal_entity_name);
  if (d.trade_name !== undefined) profile.tradeName = nn(d.trade_name);
  if (d.cin !== undefined) profile.cin = nn(d.cin);
  if (d.llpin !== undefined) profile.llpin = nn(d.llpin);
  if (d.pan !== undefined) profile.pan = nn(d.pan);
  if (d.gstin !== undefined) profile.gstin = nn(d.gstin);
  if (d.registered_address !== undefined) profile.registeredAddress = nn(d.registered_address);
  if (d.directors !== undefined) profile.directors = d.directors;
  if (d.incorporation_date !== undefined) profile.incorporationDate = d.incorporation_date ? new Date(d.incorporation_date) : null;
  if (d.previous_projects_note !== undefined) profile.previousProjectsNote = nn(d.previous_projects_note);

  await profile.save();
  res.json({ data: shapeProfile(profile) });
}));

/* -------------------------------------------------------------- documents */

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    // Type/size allow-list only — this is NOT malware scanning. A real AV
    // check should run here before a file is accepted in production; none
    // is configured yet.
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
    type: z.enum(['pan', 'coi_incorporation', 'gst_certificate', 'partnership_deed', 'director_id', 'other']),
    id_number: z.string().max(40).optional(),
  }).parse(req.body);

  const { fileKey, iv, authTag } = encryptToDisk(req.file.buffer, req.file.originalname);

  const doc = await BuilderDocument.create({
    builder: req.user._id,
    type: d.type,
    fileKey, iv, authTag,
    originalName: req.file.originalname,
    mimeType: req.file.mimetype,
    sizeBytes: req.file.size,
    idNumber: nn(d.id_number),
    status: 'submitted',
  });

  // First document flips the single company-identity track from "not
  // submitted" to "submitted" so progress shows up without a separate call.
  const profile = await getOrCreateProfile(req.user._id);
  if (profile.companyStatus === 'not_submitted') {
    profile.companyStatus = 'submitted';
    await profile.save();
  }

  res.status(201).json({ data: shapeDocument(doc.toObject(), { reveal: true }) });
}));

router.get('/documents', asyncHandler(async (req, res) => {
  const rows = await BuilderDocument.find({ builder: req.user._id }).sort({ createdAt: -1 }).lean();
  // Builders see their own numbers in full — masking is for the admin list view.
  res.json({ data: rows.map((d) => shapeDocument(d, { reveal: true })) });
}));

router.get('/documents/:id/file', asyncHandler(async (req, res) => {
  const doc = await BuilderDocument.findById(req.params.id).lean();
  if (!doc) throw new HttpError(404, 'Document not found');
  if (doc.builder.toString() !== req.user._id.toString()) throw new HttpError(403, 'Not your document');

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
  if (profile.companyStatus === 'not_submitted') throw new HttpError(422, 'Upload your identity/entity documents before submitting');
  if (!profile.legalEntityName) throw new HttpError(422, 'Add your legal entity name before submitting');

  profile.lifecycleStatus = 'submitted';
  profile.submittedAt = new Date();
  if (profile.companyStatus === 'submitted') profile.companyStatus = 'under_review';
  await profile.save();

  const reviewers = await User.find({
    $or: [{ role: 'admin' }, { role: 'employee', managedPortals: 'builder' }],
  }).select('_id').lean();
  for (const r of reviewers) {
    await Notification.create({
      user: r._id, kind: 'system',
      title: `New builder application: ${req.user.name}`,
      body: 'Submitted for company/entity review.',
      link: '/dashboard/admin/builders',
    });
  }

  res.json({ message: 'Submitted for review', data: { lifecycleStatus: profile.lifecycleStatus } });
}));

module.exports = router;
