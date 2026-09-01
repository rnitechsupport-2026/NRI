const router = require('express').Router();
const bcrypt = require('bcryptjs');
const { z } = require('zod');
const User = require('../models/User');
const { signToken, requireAuth } = require('../middleware/auth');
const { asyncHandler, makeSlug, nn, parseJson, paginate, HttpError } = require('../utils/helpers');

const ROLES = ['owner', 'agent', 'builder', 'service'];

const registerSchema = z.object({
  name: z.string().min(2, 'Name is too short').max(120),
  email: z.string().email('Enter a valid email'),
  phone: z.string().regex(/^[0-9]{10}$/, 'Enter a valid 10 digit mobile number'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(ROLES),
  company_name: z.string().max(160).optional(),
  rera_id: z.string().max(60).optional(),
  service_category: z.string().max(80).optional(),
  experience_years: z.coerce.number().int().min(0).max(70).optional(),
  city: z.string().max(80).optional(),
});

const PUBLIC_FIELDS = 'name email phone role companyName reraId serviceCategory experienceYears city locality about avatarUrl website isVerified status createdAt';

router.post('/register', asyncHandler(async (req, res) => {
  const data = registerSchema.parse(req.body);

  const exists = await User.findOne({ $or: [{ email: data.email }, { phone: data.phone }] }).select('_id').lean();
  if (exists) throw new HttpError(409, 'An account already exists with this email or mobile number');

  if (data.role === 'builder' && !data.company_name) {
    throw new HttpError(400, 'Company name is required for builder accounts');
  }
  if (data.role === 'service' && !data.service_category) {
    throw new HttpError(400, 'Please choose a service category');
  }

  const user = await User.create({
    name: data.name,
    email: data.email,
    phone: data.phone,
    password: data.password,
    role: data.role,
    companyName: nn(data.company_name),
    reraId: nn(data.rera_id),
    serviceCategory: nn(data.service_category),
    experienceYears: nn(data.experience_years),
    city: nn(data.city),
  });

  const safe = user.toObject();
  delete safe.passwordHash;
  res.status(201).json({ token: signToken(safe), user: safe });
}));

router.post('/login', asyncHandler(async (req, res) => {
  const { email, password, role } = z.object({
    email: z.string().min(3, 'Enter your email or mobile number'),
    password: z.string().min(1, 'Enter your password'),
    role: z.enum([...ROLES, 'admin']).optional(),
  }).parse(req.body);

  const user = await User.findOne({ $or: [{ email }, { phone: email }] }).select('+passwordHash').lean();
  if (!user) throw new HttpError(401, 'No account found with these credentials');

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) throw new HttpError(401, 'Incorrect password, please try again');
  if (user.status !== 'active') throw new HttpError(403, 'Your account has been suspended');

  if (role && role !== user.role) {
    throw new HttpError(403, `This account is registered as ${user.role}. Please use the ${user.role} tab.`);
  }

  await User.findByIdAndUpdate(user._id, { lastLoginAt: new Date() });
  const fresh = await User.findById(user._id).select('-passwordHash').lean();
  const safe = fresh || user;
  delete safe.passwordHash;
  res.json({ token: signToken(safe), user: safe });
}));

router.get('/me', requireAuth, asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('-passwordHash').lean();
  res.json({ user });
}));

router.put('/profile', requireAuth, asyncHandler(async (req, res) => {
  const data = z.object({
    name: z.string().min(2).max(120).optional(),
    phone: z.string().regex(/^[0-9]{10}$/).optional(),
    company_name: z.string().max(160).nullable().optional(),
    rera_id: z.string().max(60).nullable().optional(),
    service_category: z.string().max(80).nullable().optional(),
    experience_years: z.coerce.number().int().min(0).max(70).nullable().optional(),
    city: z.string().max(80).nullable().optional(),
    locality: z.string().max(120).nullable().optional(),
    about: z.string().max(2000).nullable().optional(),
    avatar_url: z.string().max(400).nullable().optional(),
    website: z.string().max(200).nullable().optional(),
  }).parse(req.body);

  const update = {};
  for (const [k, v] of Object.entries(data)) {
    if (v === undefined) continue;
    const mongoKey = k.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    update[mongoKey] = nn(v);
  }

  if (Object.keys(update).length) {
    await User.findByIdAndUpdate(req.user._id, { $set: update });
  }
  const user = await User.findById(req.user._id).select('-passwordHash').lean();
  res.json({ user });
}));

router.put('/password', requireAuth, asyncHandler(async (req, res) => {
  const { current_password, new_password } = z.object({
    current_password: z.string().min(1),
    new_password: z.string().min(6, 'New password must be at least 6 characters'),
  }).parse(req.body);

  const user = await User.findById(req.user._id).select('passwordHash').lean();
  if (!user) throw new HttpError(404, 'User not found');
  const ok = await bcrypt.compare(current_password, user.passwordHash);
  if (!ok) throw new HttpError(400, 'Current password is incorrect');

  await User.findByIdAndUpdate(req.user._id, { passwordHash: bcrypt.hashSync(new_password, 10) });
  res.json({ message: 'Password updated' });
}));

module.exports = router;
