// Interactive image mapping for a property listing — PlotMapper's project /
// floor / property / publish / public controllers, ported onto NRI's auth and
// keyed to the listing. Responses use this API's usual `{ data }` envelope.
const router = require('express').Router();
const mongoose = require('mongoose');
const PlotMap = require('../models/PlotMap');
const PlotMapUnit = require('../models/PlotMapUnit');
const PublishedMap = require('../models/PublishedMap');
const Property = require('../models/Property');
const { requireAuth } = require('../middleware/auth');
const { asyncHandler, HttpError } = require('../utils/helpers');
const C = require('../config/plotMapConstants');
const {
  emptyCounts, addCount, validatePolygon, sortFloors, publishMap, unpublishMap, publishedView,
} = require('../services/plotMap');

const { managesUserId } = require('../services/staffScope');
const isId = (id) => mongoose.Types.ObjectId.isValid(id) && String(id).length === 24;

/* ---------------------------------------------------------------- access */
async function loadOwnedListing(req, propertyId) {
  if (!isId(propertyId)) throw new HttpError(400, 'Invalid property ID');
  const property = await Property.findById(propertyId).select('user title slug propertyType totalFloors').lean();
  if (!property) throw new HttpError(404, 'Property not found');
  // staff only through the owner: an admin always, an employee when that owner is assigned to them
  if (String(property.user) !== String(req.user._id) && !(await managesUserId(req.user, property.user))) {
    throw new HttpError(403, 'You can only map your own listing');
  }
  return property;
}

/** Loads a map and makes sure the logged-in user owns the listing behind it. */
async function loadOwnedMap(req, mapId) {
  if (!isId(mapId)) throw new HttpError(400, 'Invalid map ID');
  const map = await PlotMap.findById(mapId);
  if (!map) throw new HttpError(404, 'Map not found');
  const property = await loadOwnedListing(req, map.property);
  return { map, property };
}

async function loadOwnedUnit(req, unitId) {
  if (!isId(unitId)) throw new HttpError(400, 'Invalid ID');
  const unit = await PlotMapUnit.findById(unitId);
  if (!unit) throw new HttpError(404, 'Not found');
  const { map } = await loadOwnedMap(req, unit.map);
  return { unit, map };
}

// Any change to a map means the public version is now out of date.
const markChanged = (mapId) => PlotMap.updateOne({ _id: mapId }, { $set: { hasUnpublishedChanges: true } });

/* ----------------------------------------------------------------- shape */
/** The editor's "project" object — the shape PlotMapper's ImageMapper and
 *  MapViewer already take. `map` may be null when nothing is saved yet. */
function shapeProject(map, property) {
  return {
    _id: map ? String(map._id) : null,
    propertyId: String(property._id),
    name: property.title,
    slug: property.slug,
    type: map ? map.type : C.mapTypeFor(property.propertyType),
    layoutImage: map?.layoutImage?.url ? { url: map.layoutImage.url, publicId: map.layoutImage.publicId || '' } : null,
    mapStyle: map?.mapStyle || 'ALWAYS',
    publishStatus: map?.publishStatus || 'DRAFT',
    hasUnpublishedChanges: map ? map.hasUnpublishedChanges : true,
    publishedAt: map?.publishedAt || null,
    totalFloors: property.totalFloors ?? null,
  };
}

/** Floors with per-status flat counts, in display order. */
async function shapeFloors(map) {
  if (!map) return [];
  const stats = await PlotMapUnit.aggregate([
    { $match: { map: map._id } },
    { $group: { _id: { floorId: '$floorId', status: '$status' }, count: { $sum: 1 } } },
  ]);
  return sortFloors(map.floors).map((floor) => {
    const counts = emptyCounts();
    stats
      .filter((s) => String(s._id.floorId) === String(floor._id))
      .forEach((s) => addCount(counts, s._id.status, s.count));
    return { _id: String(floor._id), floorName: floor.floorName, floorNumber: floor.floorNumber, order: floor.order, stats: counts };
  });
}

/* ---------------------------------------------------------------- public */
/** GET /public/property/:idOrSlug — no auth; the published snapshot only. */
router.get('/public/property/:idOrSlug', asyncHandler(async (req, res) => {
  const key = String(req.params.idOrSlug || '').trim();
  const property = await Property.findOne(isId(key) ? { _id: key } : { slug: key }).select('_id status').lean();
  // a listing under verification (or rejected) has no public map either
  if (!property || ['pending', 'rejected'].includes(property.status)) throw new HttpError(404, 'Property not found');
  const view = await publishedView(property._id);
  if (!view) throw new HttpError(404, 'This property map is currently unavailable');
  // Browsers and CDNs may reuse the response briefly; status changes still show within a minute.
  res.set('Cache-Control', 'public, max-age=30, stale-while-revalidate=30');
  res.json({ data: view });
}));

/* --------------------------------------------------------- map (project) */
/** GET /property/:propertyId — the listing's map for the editor (never creates one). */
router.get('/property/:propertyId', requireAuth, asyncHandler(async (req, res) => {
  const property = await loadOwnedListing(req, req.params.propertyId);
  const map = await PlotMap.findOne({ property: property._id });
  res.json({ data: { project: shapeProject(map, property), floors: await shapeFloors(map) } });
}));

/** PUT /property/:propertyId — create/update the map: its ONE image and display style. */
router.put('/property/:propertyId', requireAuth, asyncHandler(async (req, res) => {
  const property = await loadOwnedListing(req, req.params.propertyId);
  const { layoutImage, mapStyle } = req.body || {};

  if (mapStyle !== undefined && !C.MAP_STYLES.includes(mapStyle)) throw new HttpError(400, 'Invalid shape display option');
  let image;
  if (layoutImage !== undefined && layoutImage !== null) {
    const url = typeof layoutImage === 'string' ? layoutImage : layoutImage?.url;
    if (typeof url !== 'string' || !/^https?:\/\//i.test(url) || url.length > 600) {
      throw new HttpError(400, 'The map image must be an image URL');
    }
    image = { url, publicId: (typeof layoutImage === 'object' && layoutImage.publicId) || '' };
  }

  let map = await PlotMap.findOne({ property: property._id });
  if (!map) {
    // Nothing to save yet — don't leave an empty map behind for every listing.
    if (!image) return res.json({ data: { project: shapeProject(null, property), floors: [] } });
    map = new PlotMap({ property: property._id, createdBy: property.user, type: C.mapTypeFor(property.propertyType) });
  }

  // The map follows the listing's type until something has been mapped on it.
  const wanted = C.mapTypeFor(property.propertyType);
  if (map.type !== wanted && !(await PlotMapUnit.exists({ map: map._id }))) {
    map.type = wanted;
    if (wanted === 'LAND') map.floors = [];
  }

  if (layoutImage === null) map.layoutImage = null;
  else if (image) map.layoutImage = image;
  if (mapStyle !== undefined) map.mapStyle = mapStyle;
  map.hasUnpublishedChanges = true;
  await map.save();

  res.json({ data: { project: shapeProject(map, property), floors: await shapeFloors(map) } });
}));

router.post('/:mapId/publish', requireAuth, asyncHandler(async (req, res) => {
  const { map, property } = await loadOwnedMap(req, req.params.mapId);
  const snapshot = await publishMap(map);
  res.json({
    data: {
      project: shapeProject(map, property),
      publishedAt: snapshot.publishedAt,
      version: snapshot.version,
      propertyCount: snapshot.properties.length,
    },
  });
}));

router.post('/:mapId/unpublish', requireAuth, asyncHandler(async (req, res) => {
  const { map, property } = await loadOwnedMap(req, req.params.mapId);
  await unpublishMap(map);
  res.json({ data: { project: shapeProject(map, property) } });
}));

/* ---------------------------------------------------------------- floors */
function readFloor(body) {
  const floorName = String(body?.floorName || '').trim();
  if (!floorName) throw new HttpError(400, 'Floor name is required');
  if (floorName.length > 60) throw new HttpError(400, 'Floor name is too long');
  const raw = body?.floorNumber;
  const floorNumber = raw === '' || raw === null || raw === undefined ? NaN : Number(raw);
  if (!Number.isFinite(floorNumber)) throw new HttpError(400, 'Floor number is required');
  return { floorName, floorNumber };
}

/** POST /:mapId/floors — one floor `{ floorName, floorNumber }`, or several `{ floors: [...] }`. */
router.post('/:mapId/floors', requireAuth, asyncHandler(async (req, res) => {
  const { map } = await loadOwnedMap(req, req.params.mapId);
  if (map.type !== 'APARTMENT') throw new HttpError(400, 'Floors can only be added to apartment listings');

  const incoming = (Array.isArray(req.body?.floors) ? req.body.floors : [req.body]).map(readFloor);
  if (map.floors.length + incoming.length > C.MAX_FLOORS) throw new HttpError(400, `A map can have at most ${C.MAX_FLOORS} floors`);
  for (const floor of incoming) {
    if (map.floors.some((f) => f.floorNumber === floor.floorNumber)) {
      throw new HttpError(409, `Floor number ${floor.floorNumber} already exists`);
    }
    map.floors.push({ ...floor, order: floor.floorNumber });
  }
  map.hasUnpublishedChanges = true;
  await map.save();
  res.status(201).json({ data: { floors: await shapeFloors(map) } });
}));

router.put('/:mapId/floors/:floorId', requireAuth, asyncHandler(async (req, res) => {
  const { map } = await loadOwnedMap(req, req.params.mapId);
  const floor = map.floors.id(req.params.floorId);
  if (!floor) throw new HttpError(404, 'Floor not found');

  const next = readFloor({ floorName: req.body?.floorName ?? floor.floorName, floorNumber: req.body?.floorNumber ?? floor.floorNumber });
  if (map.floors.some((f) => String(f._id) !== String(floor._id) && f.floorNumber === next.floorNumber)) {
    throw new HttpError(409, `Floor number ${next.floorNumber} already exists`);
  }
  Object.assign(floor, next, { order: next.floorNumber });
  map.hasUnpublishedChanges = true;
  await map.save();
  // Every flat carries its floor's number/name — keep those copies in step.
  await PlotMapUnit.updateMany({ map: map._id, floorId: floor._id }, { $set: { floorNumber: floor.floorNumber, floorName: floor.floorName } });
  res.json({ data: { floors: await shapeFloors(map) } });
}));

/** DELETE /:mapId/floors/:floorId — also deletes the floor's flats. */
router.delete('/:mapId/floors/:floorId', requireAuth, asyncHandler(async (req, res) => {
  const { map } = await loadOwnedMap(req, req.params.mapId);
  const floor = map.floors.id(req.params.floorId);
  if (!floor) throw new HttpError(404, 'Floor not found');

  const { deletedCount } = await PlotMapUnit.deleteMany({ map: map._id, floorId: floor._id });
  floor.deleteOne();
  map.hasUnpublishedChanges = true;
  await map.save();
  res.json({ data: { floors: await shapeFloors(map), deletedFlats: deletedCount } });
}));

/* ----------------------------------------------------- units (plots/flats) */
const EDITABLE_FIELDS = [
  'floorId', 'propertyNumber', 'name', 'dimensions', 'area', 'areaUnit', 'flatType', 'bhk', 'facing', 'price',
  'priceType', 'status', 'description', 'contactName', 'contactPhone', 'images', 'polygon',
];

// Copies only allowed keys from the request body (prevents mass assignment).
const pick = (source = {}, keys = []) => {
  const result = {};
  keys.forEach((key) => { if (source[key] !== undefined) result[key] = source[key]; });
  return result;
};

function toOptionalNumber(value, label, errors) {
  if (value === null || value === '' || value === undefined) return null;
  const num = Number(value);
  if (!Number.isFinite(num) || num < 0) {
    errors.push(`${label} must be a positive number`);
    return null;
  }
  return num;
}

function buildUnitData(body, { isUpdate = false } = {}) {
  const data = pick(body, EDITABLE_FIELDS);
  const errors = [];

  if (!isUpdate || data.propertyNumber !== undefined) {
    data.propertyNumber = String(data.propertyNumber || '').trim();
    if (!data.propertyNumber) errors.push('Number is required');
  }
  if (data.area !== undefined) data.area = toOptionalNumber(data.area, 'Area', errors);
  if (data.price !== undefined) data.price = toOptionalNumber(data.price, 'Price', errors);
  if (data.status !== undefined && !C.UNIT_STATUSES.includes(data.status)) errors.push('Invalid status');
  if (data.areaUnit !== undefined && !C.AREA_UNITS.includes(data.areaUnit)) errors.push('Invalid area unit');
  if (data.priceType !== undefined && !C.PRICE_TYPES.includes(data.priceType)) errors.push('Invalid price type');
  if (data.flatType !== undefined) {
    data.flatType = data.flatType || '';
    if (data.flatType && !C.FLAT_TYPES.includes(data.flatType)) errors.push('Invalid flat type');
  }
  if (data.bhk === '') data.bhk = null;
  if (data.bhk !== undefined && data.bhk !== null && !C.BHK_OPTIONS.includes(data.bhk)) errors.push('Invalid BHK value');
  for (const key of ['name', 'dimensions', 'facing', 'description', 'contactName', 'contactPhone']) {
    if (data[key] !== undefined) data[key] = String(data[key] ?? '');
  }
  if (data.images !== undefined) {
    if (!Array.isArray(data.images)) errors.push('Images must be an array');
    else if (data.images.length > C.MAX_UNIT_IMAGES) errors.push(`Maximum ${C.MAX_UNIT_IMAGES} images allowed`);
  }
  if (errors.length) throw new HttpError(400, errors.join('. '));

  if (data.images !== undefined) {
    data.images = data.images.map((image) => {
      const url = typeof image === 'string' ? image : image?.url;
      if (typeof url !== 'string' || !url) throw new HttpError(400, 'Image must have a url');
      return { url, publicId: (typeof image === 'object' && image.publicId) || '' };
    });
  }
  if (!isUpdate || data.polygon !== undefined) data.polygon = validatePolygon(data.polygon);
  return data;
}

/** The floor a flat sits on (apartments), or nothing (land). Returns the
 *  floor number/name to store alongside the flat's mapping. */
function resolveFloor(map, floorId) {
  if (map.type === 'LAND') return { floorId: null, floorNumber: null, floorName: '' };
  const floor = floorId && isId(String(floorId)) ? map.floors.id(floorId) : null;
  if (!floor) throw new HttpError(400, 'Select the floor this flat is on');
  return { floorId: floor._id, floorNumber: floor.floorNumber, floorName: floor.floorName };
}

const duplicateNumber = (e, map) => (e?.code === 11000
  ? new HttpError(409, `That number is already used on this ${map.type === 'APARTMENT' ? 'floor' : 'layout'}`)
  : e);

/** GET /:mapId/units?floorId=&status= */
router.get('/:mapId/units', requireAuth, asyncHandler(async (req, res) => {
  const { map } = await loadOwnedMap(req, req.params.mapId);
  const filter = { map: map._id };
  if (req.query.floorId && isId(String(req.query.floorId))) filter.floorId = req.query.floorId;
  if (C.UNIT_STATUSES.includes(req.query.status)) filter.status = req.query.status;

  // Numeric-aware sort so "Plot 2" comes before "Plot 10".
  const units = await PlotMapUnit.find(filter)
    .collation({ locale: 'en', numericOrdering: true })
    .sort({ propertyNumber: 1 })
    .lean();
  res.json({ data: units });
}));

router.post('/:mapId/units', requireAuth, asyncHandler(async (req, res) => {
  const { map } = await loadOwnedMap(req, req.params.mapId);
  const data = buildUnitData(req.body);

  Object.assign(data, resolveFloor(map, data.floorId));
  data.type = map.type === 'LAND' ? 'PLOT' : 'FLAT';
  if (data.type === 'PLOT') Object.assign(data, { bhk: null, flatType: '' });

  let unit;
  try { unit = await PlotMapUnit.create({ ...data, map: map._id }); } catch (e) { throw duplicateNumber(e, map); }
  await markChanged(map._id);
  res.status(201).json({ data: unit });
}));

/** PUT /units/:id — partial updates allowed, e.g. only { status } or only { polygon }. */
router.put('/units/:id', requireAuth, asyncHandler(async (req, res) => {
  const { unit, map } = await loadOwnedUnit(req, req.params.id);
  const data = buildUnitData(req.body, { isUpdate: true });

  if (data.floorId !== undefined) Object.assign(data, resolveFloor(map, data.floorId));
  if (unit.type === 'PLOT') Object.assign(data, { bhk: null, flatType: '' });

  Object.assign(unit, data);
  try { await unit.save(); } catch (e) { throw duplicateNumber(e, map); }
  await markChanged(map._id);
  res.json({ data: unit });
}));

router.delete('/units/:id', requireAuth, asyncHandler(async (req, res) => {
  const { unit, map } = await loadOwnedUnit(req, req.params.id);
  await unit.deleteOne();
  await markChanged(map._id);
  res.json({ data: { id: unit._id } });
}));

/** DELETE /property/:propertyId — remove the listing's map entirely. */
router.delete('/property/:propertyId', requireAuth, asyncHandler(async (req, res) => {
  const property = await loadOwnedListing(req, req.params.propertyId);
  const map = await PlotMap.findOne({ property: property._id });
  if (map) {
    // Remove the public snapshot first so the microsite stops serving it immediately.
    await PublishedMap.deleteOne({ map: map._id });
    await PlotMapUnit.deleteMany({ map: map._id });
    await map.deleteOne();
  }
  res.json({ data: { project: shapeProject(null, property), floors: [] } });
}));

module.exports = router;
