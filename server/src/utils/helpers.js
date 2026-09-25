const slugify = require('slugify');
const { z } = require('zod');
const Property = require('../models/Property');
const Project = require('../models/Project');
const ServiceOffering = require('../models/ServiceOffering');
const Microsite = require('../models/Microsite');

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

async function makeSlug(table, text) {
  const base = slugify(String(text || 'listing'), { lower: true, strict: true }).slice(0, 200) || 'listing';
  let slug = base;
  let n = 1;
  while (true) {
    let existing;
    if (table === 'properties') existing = await Property.findOne({ slug }).select('_id').lean();
    else if (table === 'projects') existing = await Project.findOne({ slug }).select('_id').lean();
    else if (table === 'service_offerings') existing = await ServiceOffering.findOne({ slug }).select('_id').lean();
    else if (table === 'microsites') existing = await Microsite.findOne({ slug }).select('_id').lean();
    else break;
    if (!existing) break;
    n += 1;
    slug = `${base}-${n}`;
  }
  return slug;
}

const nn = (v) => (v === undefined || v === '' || Number.isNaN(v) ? null : v);

/** Every client page was written against a snake_case API (this app's
 *  original schema, see db/schema.sql), but the Mongoose models use
 *  camelCase fields and most routes return lean docs unmodified — so things
 *  like `coverImage`/`builtUpArea`/`isVerified` never matched what the page
 *  reads (`cover_image`/`built_up_area`/`is_verified`), silently rendering
 *  as missing images and blank specs. This is a one-level key rename applied
 *  at each route's response boundary — never touch nested feature-specific
 *  objects (e.g. a microsite's `theme`/`navbar`) that were deliberately
 *  designed camelCase; only apply it to flat entity docs (property/project/
 *  service/user) on their way out. */
function toSnakeCase(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    const snake = k.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();
    out[snake] = v;
  }
  return out;
}

function parseJson(value, fallback = []) {
  if (value == null) return fallback;
  if (typeof value === 'object') return value;
  try { return JSON.parse(value); } catch { return fallback; }
}

function paginate(q) {
  const page = Math.max(1, parseInt(q.page, 10) || 1);
  const limit = Math.min(60, Math.max(1, parseInt(q.limit, 10) || 12));
  return { page, limit, offset: (page - 1) * limit };
}

class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

const objectId = (msg = 'Invalid id') => z.string().regex(/^[0-9a-fA-F]{24}$/, msg);

module.exports = { asyncHandler, makeSlug, nn, parseJson, paginate, HttpError, objectId, toSnakeCase };
