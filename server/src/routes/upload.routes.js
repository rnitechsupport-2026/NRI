const path = require('path');
const fs = require('fs');
const router = require('express').Router();
const multer = require('multer');
const { requireAuth } = require('../middleware/auth');

const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e6)}-${safe}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 15 },
  fileFilter: (_req, file, cb) => {
    if (/^image\/(jpeg|png|webp|avif|gif)$/.test(file.mimetype)) return cb(null, true);
    cb(new Error('Only JPG, PNG, WEBP or GIF images are allowed'));
  },
});

router.post('/', requireAuth, upload.array('images', 15), (req, res) => {
  const base = `${req.protocol}://${req.get('host')}`;
  const urls = (req.files || []).map((f) => `${base}/uploads/${f.filename}`);
  res.status(201).json({ urls });
});

module.exports = router;
