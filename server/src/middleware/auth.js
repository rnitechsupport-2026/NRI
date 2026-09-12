const jwt = require('jsonwebtoken');
const User = require('../models/User');

const SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

function signToken(user) {
  return jwt.sign(
    { id: user._id.toString(), role: user.role, email: user.email },
    SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

function readToken(req) {
  const header = req.headers.authorization || '';
  if (header.startsWith('Bearer ')) return header.slice(7);
  return null;
}

async function requireAuth(req, res, next) {
  const token = readToken(req);
  if (!token) return res.status(401).json({ message: 'Login required' });
  try {
    const payload = jwt.verify(token, SECRET);
    const user = await User.findById(payload.id).select('-passwordHash');
    if (!user) return res.status(401).json({ message: 'Account not found' });
    if (user.status !== 'active') return res.status(403).json({ message: 'Account suspended' });
    req.user = user.toObject();
    next();
  } catch {
    return res.status(401).json({ message: 'Session expired, please login again' });
  }
}

async function optionalAuth(req, _res, next) {
  const token = readToken(req);
  if (!token) return next();
  try {
    const payload = jwt.verify(token, SECRET);
    const user = await User.findById(payload.id).select('name email role');
    if (user) req.user = user.toObject();
  } catch { /* ignore bad token */ }
  next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: 'Login required' });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: `Only ${roles.join(' / ')} accounts can do this` });
    }
    next();
  };
}

/** Blocks posting listings until an admin has approved the account. */
function requireApproved(req, res, next) {
  if (req.user?.approvalStatus === 'pending') {
    return res.status(403).json({ message: 'Your account is pending admin approval. You can post listings once approved.' });
  }
  if (req.user?.approvalStatus === 'rejected') {
    return res.status(403).json({ message: 'Your account application was not approved. Contact support for details.' });
  }
  next();
}

module.exports = { signToken, requireAuth, optionalAuth, requireRole, requireApproved };
