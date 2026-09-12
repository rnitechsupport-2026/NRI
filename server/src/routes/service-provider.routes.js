const router = require('express').Router();
const { z } = require('zod');
const multer = require('multer');
const User = require('../models/User');
const ServiceProviderProfile = require('../models/ServiceProviderProfile');
const ServiceProviderDocument = require('../models/ServiceProviderDocument');
const Notification = require('../models/Notification');
const { requireAuth, requireRole } = require('../middleware/auth');
const { asyncHandler, nn, HttpError } = require('../utils/helpers');
const { encryptToDisk, decryptFromDisk, maskValue } = require('../utils/fileCrypto');
const { RULES, CATEGORY_KEYS, getRule, qualificationRequired } = require('../config/serviceCategoryRules');

router.use(requireAuth, requireRole('service'));

router.get('/category-rules', asyncHandler(async (_req, res) => {
  // Public-safe subset only — nothing internal to the rule engine leaks.
  const data = Object.fromEntries(CATEGORY_KEYS.map((key) => {
    const r = RULES[key];
    return [key, {
      label: r.label,
      qualificationRequirement: r.qualificationRequirement,
      authority: r.authority,
      registrationLabel: r.registrationLabel,
      docTypes: r.docTypes,
      requiredDocTypes: r.requiredDocTypes,
      note: r.note || null,
    }];
  }));
  res.json({ data });
}));

async function getOrCreateProfile(userId) {
  let profile = await ServiceProviderProfile.findOne({ user: userId });
  if (!profile) profile = await ServiceProviderProfile.create({ user: userId });
  return profile;
}

function shapeProfile(profile) {
  const obj = profile.toObject();
  obj.id = String(obj._id);
  obj.completionPct = profile.completionPct();
  obj.qualificationApplicable = profile.needsQualification();
  return obj;
}

router.get('/profile', asyncHandler(async (req, res) => {
  const profile = await getOrCreateProfile(req.user._id);
  res.json({ data: shapeProfile(profile) });
}));

router.put('/profile', asyncHandler(async (req, res) => {
  const d = z.object({
    category: z.enum(CATEGORY_KEYS).optional(),
    entity_type: z.enum(['individual', 'proprietorship', 'partnership', 'llp', 'private_limited', 'public_limited']).optional(),
    legal_entity_name: z.string().max(200).optional(),
    trade_name: z.string().max(160).optional(),
    cin: z.string().max(40).optional(),
    llpin: z.string().max(40).optional(),
    pan: z.string().max(20).optional(),
    gstin: z.string().max(20).optional(),
    registered_address: z.string().max(400).optional(),
    degree: z.string().max(160).optional(),
    professional_registration_number: z.string().max(80).optional(),
    license_number: z.string().max(80).optional(),
    membership_number: z.string().max(80).optional(),
    has_certificate_of_practice: z.boolean().optional(),
    issuing_authority: z.string().max(160).optional(),
    registration_date: z.string().optional(),
    expiry_date: z.string().optional(),
  }).parse(req.body);

  const profile = await getOrCreateProfile(req.user._id);
  if (!['draft', 'resubmission_required'].includes(profile.lifecycleStatus)) {
    throw new HttpError(409, 'Your application is already submitted — contact support to make changes');
  }
  if (d.category !== undefined && profile.category && d.category !== profile.category) {
    throw new HttpError(409, 'Category can\'t be changed after it\'s set — contact support if this was chosen in error');
  }

  if (d.category !== undefined) profile.category = d.category;
  if (d.entity_type !== undefined) profile.entityType = d.entity_type;
  if (d.legal_entity_name !== undefined) profile.legalEntityName = nn(d.legal_entity_name);
  if (d.trade_name !== undefined) profile.tradeName = nn(d.trade_name);
  if (d.cin !== undefined) profile.cin = nn(d.cin);
  if (d.llpin !== undefined) profile.llpin = nn(d.llpin);
  if (d.pan !== undefined) profile.pan = nn(d.pan);
  if (d.gstin !== undefined) profile.gstin = nn(d.gstin);
  if (d.registered_address !== undefined) profile.registeredAddress = nn(d.registered_address);
  if (d.degree !== undefined) profile.degree = nn(d.degree);
  if (d.professional_registration_number !== undefined) profile.professionalRegistrationNumber = nn(d.professional_registration_number);
  if (d.license_number !== undefined) profile.licenseNumber = nn(d.license_number);
  if (d.membership_number !== undefined) profile.membershipNumber = nn(d.membership_number);
  if (d.has_certificate_of_practice !== undefined) profile.hasCertificateOfPractice = d.has_certificate_of_practice;
  if (d.issuing_authority !== undefined) profile.issuingAuthority = nn(d.issuing_authority);
  if (d.registration_date !== undefined) profile.registrationDate = d.registration_date ? new Date(d.registration_date) : null;
  if (d.expiry_date !== undefined) profile.expiryDate = d.expiry_date ? new Date(d.expiry_date) : null;

  await profile.save();
  res.json({ data: shapeProfile(profile) });
}));

/* -------------------------------------------------------------- documents */

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (/^(image\/(jpeg|png|webp)|application\/pdf)$/.test(file.mimetype)) return cb(null, true);
    cb(new Error('Only JPG, PNG, WEBP images or PDF documents are allowed'));
  },
});

const IDENTITY_DOC_TYPES = ['pan', 'coi_incorporation', 'gst_certificate', 'partnership_deed'];

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
  const profile = await getOrCreateProfile(req.user._id);
  const rule = getRule(profile.category);
  const allowedTypes = [...IDENTITY_DOC_TYPES, ...(rule?.docTypes || []), 'other'];

  const d = z.object({
    type: z.enum([...new Set([...IDENTITY_DOC_TYPES,
      'degree_certificate', 'registration_certificate', 'license_certificate', 'membership_certificate', 'cop_certificate', 'other'])]),
    id_number: z.string().max(40).optional(),
  }).parse(req.body);
  if (!allowedTypes.includes(d.type)) throw new HttpError(422, 'This document type does not apply to your category');

  const { fileKey, iv, authTag } = encryptToDisk(req.file.buffer, req.file.originalname);
  const doc = await ServiceProviderDocument.create({
    provider: req.user._id,
    type: d.type,
    fileKey, iv, authTag,
    originalName: req.file.originalname,
    mimeType: req.file.mimetype,
    sizeBytes: req.file.size,
    idNumber: nn(d.id_number),
    status: 'submitted',
  });

  const isIdentityDoc = IDENTITY_DOC_TYPES.includes(d.type);
  const trackField = isIdentityDoc ? 'identityStatus' : 'qualificationStatus';
  if (profile[trackField] === 'not_submitted') {
    profile[trackField] = 'submitted';
    await profile.save();
  }

  res.status(201).json({ data: shapeDocument(doc.toObject(), { reveal: true }) });
}));

router.get('/documents', asyncHandler(async (req, res) => {
  const rows = await ServiceProviderDocument.find({ provider: req.user._id }).sort({ createdAt: -1 }).lean();
  res.json({ data: rows.map((d) => shapeDocument(d, { reveal: true })) });
}));

router.get('/documents/:id/file', asyncHandler(async (req, res) => {
  const doc = await ServiceProviderDocument.findById(req.params.id).lean();
  if (!doc) throw new HttpError(404, 'Document not found');
  if (doc.provider.toString() !== req.user._id.toString()) throw new HttpError(403, 'Not your document');

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
  if (!profile.category) throw new HttpError(422, 'Choose your service category before submitting');
  if (!profile.legalEntityName) throw new HttpError(422, 'Add your legal name before submitting');
  if (profile.identityStatus === 'not_submitted') throw new HttpError(422, 'Upload your identity documents before submitting');
  if (qualificationRequired(profile.category) && profile.qualificationStatus === 'not_submitted') {
    throw new HttpError(422, `Upload your ${getRule(profile.category).registrationLabel || 'qualification'} documents before submitting`);
  }

  profile.lifecycleStatus = 'submitted';
  profile.submittedAt = new Date();
  if (profile.identityStatus === 'submitted') profile.identityStatus = 'under_review';
  if (qualificationRequired(profile.category) && profile.qualificationStatus === 'submitted') profile.qualificationStatus = 'under_review';
  await profile.save();

  const reviewers = await User.find({
    $or: [{ role: 'admin' }, { role: 'employee', managedPortals: 'service' }],
  }).select('_id').lean();
  for (const r of reviewers) {
    await Notification.create({
      user: r._id, kind: 'system',
      title: `New service provider application: ${req.user.name}`,
      body: `Category: ${getRule(profile.category)?.label || profile.category}`,
      link: '/dashboard/admin/service-providers',
    });
  }

  res.json({ message: 'Submitted for review', data: { lifecycleStatus: profile.lifecycleStatus } });
}));

module.exports = router;
