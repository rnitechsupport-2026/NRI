const mongoose = require('mongoose');

const serviceOfferingSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 180 },
    slug: { type: String, required: true, unique: true, trim: true, maxlength: 220 },
    category: { type: String, required: true, trim: true, maxlength: 80 },
    description: { type: String },
    priceFrom: { type: Number, min: 0 },
    priceUnit: { type: String, trim: true, maxlength: 40 },
    city: { type: String, trim: true, maxlength: 80 },
    coverImage: { type: String, trim: true, maxlength: 400 },
    rating: { type: Number, default: 4.5, min: 0, max: 5 },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  },
  { timestamps: true }
);

serviceOfferingSchema.index({ category: 1, status: 1 });

module.exports = mongoose.model('ServiceOffering', serviceOfferingSchema);
