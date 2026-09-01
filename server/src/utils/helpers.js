const slugify = require('slugify');
const { z } = require('zod');
const Property = require('../models/Property');
const Project = require('../models/Project');
const ServiceOffering = require('../models/ServiceOffering');

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
    else break;
    if (!existing) break;
    n += 1;
    slug = `${base}-${n}`;
  }
  return slug;
}

const nn = (v) => (v === undefined || v === '' || Number.isNaN(v) ? null : v);

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

module.exports = { asyncHandler, makeSlug, nn, parseJson, paginate, HttpError, objectId };
