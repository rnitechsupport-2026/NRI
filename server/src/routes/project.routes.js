const router = require('express').Router();
const { z } = require('zod');
const multer = require('multer');
const Project = require('../models/Project');
const ProjectImage = require('../models/ProjectImage');
const ProjectDocument = require('../models/ProjectDocument');
const Lead = require('../models/Lead');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { requireAuth, requireRole, requireApproved } = require('../middleware/auth');
const { asyncHandler, makeSlug, nn, paginate, HttpError } = require('../utils/helpers');
const { encryptToDisk, decryptFromDisk } = require('../utils/fileCrypto');

router.get('/', asyncHandler(async (req, res) => {
  const { page, limit, offset } = paginate(req.query);
  const filter = {};
  if (req.query.city) filter.city = req.query.city;
  if (req.query.status) filter.status = req.query.status;
  if (req.query.type) filter.projectType = req.query.type;
  if (req.query.builder) filter.builder = req.query.builder;
  if (req.query.featured === 'true') filter.isFeatured = true;
  if (req.query.q) {
    filter.$or = [
      { name: { $regex: req.query.q, $options: 'i' } },
      { locality: { $regex: req.query.q, $options: 'i' } },
      { city: { $regex: req.query.q, $options: 'i' } },
    ];
  }

  const [items, total] = await Promise.all([
    Project.find(filter)
      .populate({ path: 'builder', select: 'name companyName avatarUrl isVerified' })
      .sort({ isFeatured: -1, createdAt: -1 })
      .skip(offset)
      .limit(limit)
      .lean(),
    Project.countDocuments(filter),
  ]);

  res.json({ data: items, page, limit, total, pages: Math.ceil(total / limit) });
}));

router.get('/mine/list', requireAuth, requireRole('builder', 'admin'), asyncHandler(async (req, res) => {
  const items = await Project.find({ builder: req.user._id })
    .populate({ path: 'builder', select: 'name companyName avatarUrl isVerified' })
    .sort({ createdAt: -1 })
    .lean();

  const projectIds = items.map((p) => p._id);
  const leadCounts = await Lead.aggregate([
    { $match: { project: { $in: projectIds } } },
    { $group: { _id: '$project', count: { $sum: 1 } } },
  ]);
  const countMap = Object.fromEntries(leadCounts.map((c) => [String(c._id), c.count]));

  res.json({ data: items.map((p) => ({ ...p, lead_count: countMap[String(p._id)] || 0 })) });
}));

router.get('/:idOrSlug', asyncHandler(async (req, res) => {
  const key = req.params.idOrSlug;
  const byId = /^[0-9a-fA-F]{24}$/.test(key);
  const query = byId ? { _id: key } : { slug: key };

  const project = await Project.findOne(query)
    .populate({ path: 'builder', select: 'name phone email companyName avatarUrl about experienceYears isVerified' })
    .lean();
  if (!project) throw new HttpError(404, 'Project not found');

  await Project.findByIdAndUpdate(project._id, { $inc: { views: 1 } });
  project.views = (project.views || 0) + 1;

  const images = await ProjectImage.find({ project: project._id }).sort({ sortOrder: 1, _id: 1 }).lean();
  const more = await Project.find({ builder: project.builder._id || project.builder, _id: { $ne: project._id } })
    .populate({ path: 'builder', select: 'name companyName avatarUrl isVerified' })
    .limit(3)
    .lean();

  res.json({ data: { ...project, amenities: project.amenities || [], images, more_from_builder: more } });
}));

router.post('/', requireAuth, requireRole('builder', 'admin'), requireApproved, asyncHandler(async (req, res) => {
  const d = z.object({
    name: z.string().min(3).max(200),
    tagline: z.string().max(200).optional(),
    description: z.string().max(6000).optional(),
    project_type: z.enum(['apartment', 'villa', 'plot', 'commercial', 'township']),
    configuration: z.string().max(120).optional(),
    min_price: z.coerce.number().int().min(0).optional(),
    max_price: z.coerce.number().int().min(0).optional(),
    min_area: z.coerce.number().int().min(0).optional(),
    max_area: z.coerce.number().int().min(0).optional(),
    total_units: z.coerce.number().int().min(0).optional(),
    towers: z.coerce.number().int().min(0).optional(),
    locality: z.string().min(2).max(120),
    city: z.string().min(2).max(80),
    address: z.string().max(255).optional(),
    rera_no: z.string().max(80).optional(),
    possession_on: z.string().max(20).optional(),
    amenities: z.array(z.string()).optional(),
    cover_image: z.string().max(400).optional(),
    images: z.array(z.string().max(400)).max(15).optional(),
    status: z.enum(['upcoming', 'ongoing', 'completed']).optional(),
  }).parse(req.body);

  const slug = await makeSlug('projects', d.name);
  const images = d.images && d.images.length ? d.images : (d.cover_image ? [d.cover_image] : []);
  const cover = d.cover_image || images[0] || null;

  const project = await Project.create({
    builder: req.user._id,
    name: d.name,
    slug,
    tagline: d.tagline,
    description: d.description,
    projectType: d.project_type,
    configuration: d.configuration,
    minPrice: nn(d.min_price),
    maxPrice: nn(d.max_price),
    minArea: nn(d.min_area),
    maxArea: nn(d.max_area),
    totalUnits: nn(d.total_units),
    towers: nn(d.towers),
    locality: d.locality,
    city: d.city,
    address: d.address,
    reraNo: d.rera_no,
    possessionOn: d.possession_on ? new Date(d.possession_on) : null,
    amenities: d.amenities || [],
    coverImage: cover,
    status: d.status || 'ongoing',
  });

  if (images.length) {
    await ProjectImage.insertMany(images.map((url, i) => ({ project: project._id, url, sortOrder: i })));
  }

  const row = await Project.findById(project._id)
    .populate({ path: 'builder', select: 'name companyName avatarUrl isVerified' })
    .lean();
  res.status(201).json({ data: row });
}));

router.put('/:id', requireAuth, requireRole('builder', 'admin'), asyncHandler(async (req, res) => {
  const id = req.params.id;
  const existing = await Project.findById(id).select('builder').lean();
  if (!existing) throw new HttpError(404, 'Project not found');
  if (existing.builder.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    throw new HttpError(403, 'You can only edit your own projects');
  }

  const d = z.object({
    name: z.string().min(3).max(200).optional(),
    tagline: z.string().max(200).optional().or(z.literal('')),
    description: z.string().max(6000).optional().or(z.literal('')),
    project_type: z.enum(['apartment', 'villa', 'plot', 'commercial', 'township']).optional(),
    configuration: z.string().max(120).optional().or(z.literal('')),
    min_price: z.coerce.number().int().min(0).optional(),
    max_price: z.coerce.number().int().min(0).optional(),
    min_area: z.coerce.number().int().min(0).optional(),
    max_area: z.coerce.number().int().min(0).optional(),
    total_units: z.coerce.number().int().min(0).optional(),
    towers: z.coerce.number().int().min(0).optional(),
    locality: z.string().min(2).max(120).optional(),
    city: z.string().min(2).max(80).optional(),
    address: z.string().max(255).optional().or(z.literal('')),
    rera_no: z.string().max(80).optional().or(z.literal('')),
    possession_on: z.string().max(20).optional().or(z.literal('')),
    amenities: z.array(z.string()).optional(),
    cover_image: z.string().max(400).optional().or(z.literal('')),
    images: z.array(z.string().max(400)).max(15).optional(),
    status: z.enum(['upcoming', 'ongoing', 'completed']).optional(),
  }).partial().parse(req.body);

  const update = {};
  const map = {
    name: 'name', tagline: 'tagline', description: 'description', project_type: 'projectType',
    configuration: 'configuration', min_price: 'minPrice', max_price: 'maxPrice',
    min_area: 'minArea', max_area: 'maxArea', total_units: 'totalUnits', towers: 'towers',
    locality: 'locality', city: 'city', address: 'address', rera_no: 'reraNo', status: 'status',
  };

  for (const [k, v] of Object.entries(d)) {
    if (v === undefined) continue;
    if (k === 'images') continue;
    if (k === 'cover_image') { update.coverImage = nn(v); continue; }
    if (k === 'possession_on') { update.possessionOn = v ? new Date(v) : null; continue; }
    const mongoKey = map[k];
    if (mongoKey) update[mongoKey] = nn(v);
  }
  if (d.amenities) update.amenities = d.amenities;

  if (Object.keys(update).length) {
    await Project.findByIdAndUpdate(id, { $set: update });
  }

  if (d.images) {
    await ProjectImage.deleteMany({ project: id });
    await ProjectImage.insertMany(d.images.map((url, i) => ({ project: id, url, sortOrder: i })));
  }

  const row = await Project.findById(id)
    .populate({ path: 'builder', select: 'name companyName avatarUrl isVerified' })
    .lean();
  res.json({ data: row });
}));

router.delete('/:id', requireAuth, requireRole('builder', 'admin'), asyncHandler(async (req, res) => {
  const id = req.params.id;
  const existing = await Project.findById(id).select('builder').lean();
  if (!existing) throw new HttpError(404, 'Project not found');
  if (existing.builder.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    throw new HttpError(403, 'You can only delete your own projects');
  }
  await Project.findByIdAndDelete(id);
  res.json({ message: 'Project deleted' });
}));

/* ===================================================== compliance verification
   RERA / land-rights / approvals for one specific project — separate from the
   builder's own account-level identity review (see builder.routes.js). Only
   the owning builder (or admin) can edit these; only an admin can decide them. */

async function ownedProjectOrThrow(req) {
  const project = await Project.findById(req.params.id);
  if (!project) throw new HttpError(404, 'Project not found');
  if (project.builder.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    throw new HttpError(403, 'You can only manage your own projects');
  }
  return project;
}

router.put('/:id/verification-details', requireAuth, requireRole('builder', 'admin'), asyncHandler(async (req, res) => {
  const project = await ownedProjectOrThrow(req);
  if (!['not_submitted', 'rejected'].includes(project.verificationStatus)) {
    throw new HttpError(409, 'Verification is already submitted — contact support to make changes');
  }

  const d = z.object({
    rera_promoter_name: z.string().max(200).optional(),
    survey_numbers: z.array(z.string().max(40)).max(30).optional(),
    village: z.string().max(120).optional(),
    taluk: z.string().max(120).optional(),
    district: z.string().max(120).optional(),
    land_ownership_type: z.enum(['owned', 'jda_poa']).optional(),
    landowner_name: z.string().max(200).optional(),
  }).parse(req.body);

  if (d.rera_promoter_name !== undefined) project.reraPromoterName = nn(d.rera_promoter_name);
  if (d.survey_numbers !== undefined) project.surveyNumbers = d.survey_numbers;
  if (d.village !== undefined) project.village = nn(d.village);
  if (d.taluk !== undefined) project.taluk = nn(d.taluk);
  if (d.district !== undefined) project.district = nn(d.district);
  if (d.land_ownership_type !== undefined) project.landOwnershipType = d.land_ownership_type;
  if (d.landowner_name !== undefined) project.landownerName = nn(d.landowner_name);

  await project.save();
  res.json({ data: project.toObject() });
}));

const docUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (/^(image\/(jpeg|png|webp)|application\/pdf)$/.test(file.mimetype)) return cb(null, true);
    cb(new Error('Only JPG, PNG, WEBP images or PDF documents are allowed'));
  },
});

function shapeProjectDocument(doc) {
  const obj = { ...doc };
  obj.id = String(obj._id);
  delete obj._id;
  delete obj.__v;
  delete obj.fileKey;
  delete obj.iv;
  delete obj.authTag;
  return obj;
}

router.post('/:id/documents', requireAuth, requireRole('builder', 'admin'), docUpload.single('file'), asyncHandler(async (req, res) => {
  const project = await ownedProjectOrThrow(req);
  if (!req.file) throw new HttpError(400, 'No file uploaded');
  const d = z.object({
    type: z.enum(['rera_certificate', 'jda_poa', 'encumbrance_certificate', 'approval_doc', 'other']),
  }).parse(req.body);

  const { fileKey, iv, authTag } = encryptToDisk(req.file.buffer, req.file.originalname);
  const doc = await ProjectDocument.create({
    project: project._id,
    type: d.type,
    fileKey, iv, authTag,
    originalName: req.file.originalname,
    mimeType: req.file.mimetype,
    sizeBytes: req.file.size,
    status: 'submitted',
  });

  res.status(201).json({ data: shapeProjectDocument(doc.toObject()) });
}));

router.get('/:id/documents', requireAuth, requireRole('builder', 'admin'), asyncHandler(async (req, res) => {
  await ownedProjectOrThrow(req);
  const rows = await ProjectDocument.find({ project: req.params.id }).sort({ createdAt: -1 }).lean();
  res.json({ data: rows.map(shapeProjectDocument) });
}));

router.get('/:id/documents/:docId/file', requireAuth, requireRole('builder', 'admin'), asyncHandler(async (req, res) => {
  await ownedProjectOrThrow(req);
  const doc = await ProjectDocument.findOne({ _id: req.params.docId, project: req.params.id }).lean();
  if (!doc) throw new HttpError(404, 'Document not found');

  const buffer = decryptFromDisk(doc.fileKey, doc.iv, doc.authTag);
  res.setHeader('Content-Type', doc.mimeType || 'application/octet-stream');
  res.setHeader('Content-Disposition', `inline; filename="${(doc.originalName || 'document').replace(/"/g, '')}"`);
  res.setHeader('Cache-Control', 'no-store');
  res.send(buffer);
}));

router.post('/:id/submit-verification', requireAuth, requireRole('builder', 'admin'), asyncHandler(async (req, res) => {
  const project = await ownedProjectOrThrow(req);
  if (!['not_submitted', 'rejected'].includes(project.verificationStatus)) {
    throw new HttpError(409, 'Verification already submitted');
  }
  if (!project.reraNo) throw new HttpError(422, 'Add the RERA registration number before submitting');
  if (!project.reraPromoterName) throw new HttpError(422, 'Add the RERA promoter name before submitting');
  if (!project.surveyNumbers?.length) throw new HttpError(422, 'Add at least one survey number before submitting');
  if (!project.village || !project.taluk || !project.district) throw new HttpError(422, 'Add village, taluk and district before submitting');
  if (!project.landOwnershipType) throw new HttpError(422, 'Specify whether the promoter owns the land or holds a JDA/POA');

  const docs = await ProjectDocument.find({ project: project._id }).select('type').lean();
  const types = docs.map((d) => d.type);
  if (!types.includes('rera_certificate')) throw new HttpError(422, 'Upload the RERA registration certificate before submitting');
  if (project.landOwnershipType === 'jda_poa') {
    if (!project.landownerName) throw new HttpError(422, 'Add the landowner name for a JDA/POA project');
    if (!types.includes('jda_poa')) throw new HttpError(422, 'Upload the JDA / POA document before submitting');
  }

  project.verificationStatus = 'submitted';
  await project.save();

  const reviewers = await User.find({
    $or: [{ role: 'admin' }, { role: 'employee', managedPortals: 'builder' }],
  }).select('_id').lean();
  for (const r of reviewers) {
    await Notification.create({
      user: r._id, kind: 'system',
      title: `Project submitted for verification: ${project.name}`,
      body: 'RERA / land-rights / approvals review requested.',
      link: `/dashboard/admin/projects/${project._id}/verification`,
    });
  }

  res.json({ message: 'Submitted for verification', data: { verificationStatus: project.verificationStatus } });
}));

module.exports = router;
