const mongoose = require('mongoose');

const propertyImageSchema = new mongoose.Schema(
  {
    property: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true, index: true },
    url: { type: String, required: true, trim: true, maxlength: 400 },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('PropertyImage', propertyImageSchema);
