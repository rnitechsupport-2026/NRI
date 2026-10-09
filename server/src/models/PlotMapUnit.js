const mongoose = require('mongoose');
const {
  UNIT_TYPES, UNIT_STATUSES, AREA_UNITS, BHK_OPTIONS, FLAT_TYPES, PRICE_TYPES,
} = require('../config/plotMapConstants');

// Normalized point: 0 = left/top edge of the image, 1 = right/bottom edge.
const pointSchema = new mongoose.Schema(
  {
    x: { type: Number, required: true, min: 0, max: 1 },
    y: { type: Number, required: true, min: 0, max: 1 },
  },
  { _id: false }
);

const imageSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    publicId: { type: String, default: '' },
  },
  { _id: false }
);

/** One mapped shape on a PlotMap: a plot (LAND) or a flat (APARTMENT) —
 *  PlotMapper's "property", renamed because NRI's Property is the listing. */
const plotMapUnitSchema = new mongoose.Schema(
  {
    map: { type: mongoose.Schema.Types.ObjectId, ref: 'PlotMap', required: true, index: true },
    // null for land plots; the PlotMap.floors entry this flat is on otherwise.
    floorId: { type: mongoose.Schema.Types.ObjectId, default: null, index: true },
    // Copied from that floor on every save so each flat mapping carries its
    // own floor number/name (and the published snapshot does too).
    floorNumber: { type: Number, default: null },
    floorName: { type: String, trim: true, maxlength: 60, default: '' },
    type: { type: String, enum: UNIT_TYPES, required: true },
    propertyNumber: { type: String, required: [true, 'Number is required'], trim: true, maxlength: 30 },
    name: { type: String, trim: true, maxlength: 120, default: '' },
    // Free-text measurements as the lister states them, e.g. "30 × 40 ft".
    dimensions: { type: String, trim: true, maxlength: 80, default: '' },
    area: { type: Number, min: 0, default: null },
    areaUnit: { type: String, enum: AREA_UNITS, default: 'sq.ft' },
    flatType: { type: String, enum: [...FLAT_TYPES, ''], default: '' },
    bhk: { type: String, enum: [...BHK_OPTIONS, null], default: null },
    facing: { type: String, trim: true, maxlength: 30, default: '' },
    price: { type: Number, min: 0, default: null },
    priceType: { type: String, enum: PRICE_TYPES, default: 'TOTAL' },
    status: { type: String, enum: UNIT_STATUSES, default: 'AVAILABLE' },
    description: { type: String, trim: true, maxlength: 5000, default: '' },
    contactName: { type: String, trim: true, maxlength: 80, default: '' },
    contactPhone: { type: String, trim: true, maxlength: 30, default: '' },
    images: { type: [imageSchema], default: [] },
    polygon: {
      type: [pointSchema],
      validate: {
        validator: (points) => Array.isArray(points) && points.length >= 3,
        message: 'Polygon needs at least 3 points',
      },
    },
  },
  { timestamps: true }
);

// A number is unique inside one floor (or one land layout); it may repeat on other floors.
plotMapUnitSchema.index({ map: 1, floorId: 1, propertyNumber: 1 }, { unique: true });

module.exports = mongoose.model('PlotMapUnit', plotMapUnitSchema);
