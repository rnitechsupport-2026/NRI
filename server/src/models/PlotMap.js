const mongoose = require('mongoose');
const { MAP_TYPES, PUBLISH_STATUSES, MAP_STYLES } = require('../config/plotMapConstants');

const imageSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    publicId: { type: String, default: '' },
  },
  { _id: false }
);

// A floor is only a name + number here. Unlike standalone PlotMapper, a floor
// has no image of its own: an apartment listing uploads ONE image for the
// whole building and every floor's flats are mapped on that same image.
const floorSchema = new mongoose.Schema({
  floorName: { type: String, required: [true, 'Floor name is required'], trim: true, maxlength: 60 },
  floorNumber: { type: Number, default: 0 },
  order: { type: Number, default: 0 },
});

/**
 * The interactive image map of one property listing (PlotMapper's "project").
 * LAND: `layoutImage` is the land layout, units are plots.
 * APARTMENT: `layoutImage` is the single building/floor layout, units are
 * flats, each tagged with one of `floors`.
 */
const plotMapSchema = new mongoose.Schema(
  {
    property: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true, unique: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, enum: MAP_TYPES, required: true },
    layoutImage: { type: imageSchema, default: null },
    floors: { type: [floorSchema], default: [] },
    mapStyle: { type: String, enum: MAP_STYLES, default: 'ALWAYS' },
    publishStatus: { type: String, enum: PUBLISH_STATUSES, default: 'DRAFT' },
    // True when the draft differs from what the public map shows.
    hasUnpublishedChanges: { type: Boolean, default: true },
    publishedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('PlotMap', plotMapSchema);
