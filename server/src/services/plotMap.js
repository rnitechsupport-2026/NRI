// Publish/snapshot logic for interactive image maps — ported from PlotMapper
// (services/publishService.js, controllers/publicController.js,
// utils/statistics.js, utils/validators.js) and keyed to an NRI property
// listing instead of a standalone project.
const PlotMap = require('../models/PlotMap');
const PlotMapUnit = require('../models/PlotMapUnit');
const PublishedMap = require('../models/PublishedMap');
const Property = require('../models/Property');
const { HttpError } = require('../utils/helpers');
const { UNIT_STATUSES, MIN_POLYGON_POINTS, MAX_POLYGON_POINTS } = require('../config/plotMapConstants');

/* ------------------------------------------------------------ statistics */
// Status counts are never stored. They are always counted from the units
// themselves, so they cannot drift from the real plot/flat statuses.
const emptyCounts = () => UNIT_STATUSES.reduce((counts, status) => ({ ...counts, [status]: 0 }), { total: 0 });

const addCount = (counts, status, amount = 1) => {
  if (status in counts) counts[status] += amount;
  counts.total += amount;
  return counts;
};

const countByStatus = (units = []) => units.reduce((counts, unit) => addCount(counts, unit.status), emptyCounts());

// Public API shape: { total, available, reserved, booked, sold }
const toStatistics = (counts) =>
  UNIT_STATUSES.reduce((stats, status) => ({ ...stats, [status.toLowerCase()]: counts[status] }), { total: counts.total });

/* ------------------------------------------------------------ validation */
/**
 * A polygon is an array of normalized points: every x and y must be between 0 and 1.
 * Normalized values keep the shape aligned with the image at any display size.
 */
function validatePolygon(polygon) {
  if (!Array.isArray(polygon)) throw new HttpError(400, 'Polygon must be an array of points');
  if (polygon.length < MIN_POLYGON_POINTS) throw new HttpError(400, `Polygon needs at least ${MIN_POLYGON_POINTS} points`);
  if (polygon.length > MAX_POLYGON_POINTS) throw new HttpError(400, `Polygon cannot have more than ${MAX_POLYGON_POINTS} points`);

  return polygon.map((point, index) => {
    const x = Number(point?.x);
    const y = Number(point?.y);
    if (!Number.isFinite(x) || !Number.isFinite(y) || x < 0 || x > 1 || y < 0 || y > 1) {
      throw new HttpError(400, `Polygon point ${index + 1} must have x and y between 0 and 1`);
    }
    // Six decimals is sub-pixel accurate even for 10,000px images.
    return { x: Number(x.toFixed(6)), y: Number(y.toFixed(6)) };
  });
}

/* ---------------------------------------------------------- public shape */
const sortFloors = (floors = []) =>
  [...floors].sort((a, b) => (a.order - b.order) || (a.floorNumber - b.floorNumber));

// Only these fields are ever exposed publicly.
const toPublicProject = (map, property) => {
  const owner = property.user && typeof property.user === 'object' ? property.user : {};
  return {
    _id: String(map._id),
    propertyId: String(property._id),
    name: property.title,
    slug: property.slug,
    type: map.type,
    location: [property.locality, property.city].filter(Boolean).join(', '),
    // One image for the whole map — the land layout, or the single
    // building/floor layout every floor's flats are drawn on.
    layoutImage: map.layoutImage?.url || '',
    contactPhone: owner.phone || '',
    contactEmail: owner.email || '',
    address: property.address || '',
    mapStyle: map.mapStyle || 'ALWAYS',
  };
};

const toPublicFloor = (floor) => ({
  _id: String(floor._id),
  floorName: floor.floorName,
  floorNumber: floor.floorNumber,
  order: floor.order,
});

const toPublicUnit = (unit) => ({
  _id: String(unit._id),
  floorId: unit.floorId ? String(unit.floorId) : null,
  floorNumber: unit.floorNumber ?? null,
  floorName: unit.floorName || '',
  type: unit.type,
  propertyNumber: unit.propertyNumber,
  name: unit.name,
  dimensions: unit.dimensions || '',
  area: unit.area,
  areaUnit: unit.areaUnit,
  flatType: unit.flatType || '',
  bhk: unit.bhk,
  facing: unit.facing,
  price: unit.price,
  priceType: unit.priceType,
  status: unit.status,
  description: unit.description,
  contactName: unit.contactName,
  contactPhone: unit.contactPhone,
  images: (unit.images || []).map((img) => img.url),
  polygon: (unit.polygon || []).map(({ x, y }) => ({ x, y })),
});

/** What the map viewer needs in one object. Floors carry their own flats and
 *  statistics, counted from the flats on every request. */
function buildView({ project, floors, properties, publishedAt = null, version = 0, draft = false }) {
  const withFlats = floors.map((floor) => {
    const flats = properties.filter((p) => p.floorId === floor._id);
    return { ...floor, statistics: toStatistics(countByStatus(flats)), flats };
  });
  // Apartments count the flats on their floors; land counts every plot.
  const counted = project.type === 'APARTMENT' ? withFlats.flatMap((floor) => floor.flats) : properties;
  return { project, floors: withFlats, properties, statistics: toStatistics(countByStatus(counted)), publishedAt, version, draft };
}

const loadListing = (propertyId) =>
  Property.findById(propertyId).populate({ path: 'user', select: 'name phone email' }).lean();

const loadUnits = (mapId) =>
  PlotMapUnit.find({ map: mapId }).collation({ locale: 'en', numericOrdering: true }).sort({ propertyNumber: 1 }).lean();

/* -------------------------------------------------------------- publish */
/** Checks that the map has something worth publishing. */
function assertPublishable(map) {
  if (!map.layoutImage?.url) {
    throw new HttpError(400, map.type === 'APARTMENT'
      ? 'Upload the building layout image before publishing'
      : 'Upload a layout image before publishing');
  }
  if (map.type === 'APARTMENT' && !map.floors.length) {
    throw new HttpError(400, 'Add at least one floor before publishing');
  }
}

/** Copies the current draft into the PublishedMap collection. `map` is a PlotMap document. */
async function publishMap(map) {
  assertPublishable(map);
  const property = await loadListing(map.property);
  if (!property) throw new HttpError(404, 'The listing behind this map no longer exists');

  const units = await loadUnits(map._id);
  const publishedAt = new Date();

  const snapshot = await PublishedMap.findOneAndUpdate(
    { map: map._id },
    {
      $set: {
        property: map.property,
        project: toPublicProject(map, property),
        floors: map.type === 'APARTMENT' ? sortFloors(map.floors).map(toPublicFloor) : [],
        properties: units.map(toPublicUnit),
        publishedAt,
      },
      $inc: { version: 1 },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  map.publishStatus = 'PUBLISHED';
  map.hasUnpublishedChanges = false;
  map.publishedAt = publishedAt;
  await map.save();

  return snapshot;
}

async function unpublishMap(map) {
  map.publishStatus = 'DRAFT';
  map.hasUnpublishedChanges = true;
  await map.save();
  await PublishedMap.deleteOne({ map: map._id });
}

/** Publishing a listing's microsite takes its map live with it — but only
 *  when there is a map with pending changes that is actually publishable.
 *  Never throws: a half-finished map must not block the microsite. */
async function publishPendingForProperty(propertyId) {
  try {
    const map = await PlotMap.findOne({ property: propertyId });
    if (!map || !map.hasUnpublishedChanges || !map.layoutImage?.url) return null;
    if (map.type === 'APARTMENT' && !map.floors.length) return null;
    return await publishMap(map);
  } catch (e) {
    console.error('[plot-map] auto-publish skipped:', e.message);
    return null;
  }
}

/* ---------------------------------------------------------------- views */
/** The published snapshot for a listing, or null. Draft data is never returned from here. */
async function publishedView(propertyId) {
  const map = await PlotMap.findOne({ property: propertyId, publishStatus: 'PUBLISHED' }).select('_id').lean();
  if (!map) return null;
  const snapshot = await PublishedMap.findOne({ map: map._id }).lean();
  if (!snapshot) return null;
  return buildView({
    project: snapshot.project,
    floors: snapshot.floors,
    properties: snapshot.properties,
    publishedAt: snapshot.publishedAt,
    version: snapshot.version,
  });
}

/** The current draft in the exact public shape — for the owner's own
 *  previews (microsite builder, ?preview=1), never for visitors. */
async function draftView(propertyId) {
  const map = await PlotMap.findOne({ property: propertyId }).lean();
  if (!map || !map.layoutImage?.url) return null;
  const property = await loadListing(propertyId);
  if (!property) return null;
  const units = await loadUnits(map._id);
  return buildView({
    project: toPublicProject(map, property),
    floors: map.type === 'APARTMENT' ? sortFloors(map.floors).map(toPublicFloor) : [],
    properties: units.map(toPublicUnit),
    publishedAt: map.publishedAt,
    draft: true,
  });
}

module.exports = {
  emptyCounts, addCount, countByStatus, toStatistics, validatePolygon, sortFloors,
  publishMap, unpublishMap, publishPendingForProperty, publishedView, draftView,
};
