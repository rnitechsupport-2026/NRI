// Ported from PlotMapper (server/utils/constants.js) — the single list of
// statuses/units the interactive image map understands.
const MAP_TYPES = ['LAND', 'APARTMENT'];
const PUBLISH_STATUSES = ['DRAFT', 'PUBLISHED'];
// ALWAYS: shapes always visible. HOVER: shapes appear only on hover/tap (clean photo).
const MAP_STYLES = ['ALWAYS', 'HOVER'];

const UNIT_TYPES = ['PLOT', 'FLAT'];
const UNIT_STATUSES = ['AVAILABLE', 'RESERVED', 'BOOKED', 'SOLD'];
const FLAT_TYPES = ['Apartment', 'Studio', 'Duplex', 'Penthouse', 'Villa'];
const AREA_UNITS = ['sq.ft', 'cent', 'ground', 'acre', 'sq.m'];
const BHK_OPTIONS = ['1 BHK', '2 BHK', '3 BHK', '4 BHK', '5 BHK'];
const PRICE_TYPES = ['TOTAL', 'PER_SQFT', 'PER_CENT', 'PER_SQM', 'ON_REQUEST'];

const MIN_POLYGON_POINTS = 3;
const MAX_POLYGON_POINTS = 500;
const MAX_UNIT_IMAGES = 10;
const MAX_FLOORS = 200;

/** An apartment listing is mapped floor by floor; every other listing type
 *  (plot, villa layout, farm land…) is one layout of plots. */
const mapTypeFor = (propertyType) => (propertyType === 'apartment' ? 'APARTMENT' : 'LAND');

module.exports = {
  MAP_TYPES, PUBLISH_STATUSES, MAP_STYLES, UNIT_TYPES, UNIT_STATUSES, FLAT_TYPES, AREA_UNITS,
  BHK_OPTIONS, PRICE_TYPES, MIN_POLYGON_POINTS, MAX_POLYGON_POINTS, MAX_UNIT_IMAGES, MAX_FLOORS,
  mapTypeFor,
};
