const mongoose = require('mongoose');

/**
 * A frozen copy of a PlotMap taken when its owner clicks "Publish".
 * The public API and the microsite read only from here, so editing the
 * draft never changes what visitors see until the next publish.
 * Same shape as PlotMapper's PublishedMap: { project, floors, properties }.
 */
const publishedMapSchema = new mongoose.Schema(
  {
    map: { type: mongoose.Schema.Types.ObjectId, ref: 'PlotMap', required: true, unique: true },
    property: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true, index: true },
    project: { type: mongoose.Schema.Types.Mixed, required: true },
    floors: { type: [mongoose.Schema.Types.Mixed], default: [] },
    properties: { type: [mongoose.Schema.Types.Mixed], default: [] },
    version: { type: Number, default: 1 },
    publishedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model('PublishedMap', publishedMapSchema);
