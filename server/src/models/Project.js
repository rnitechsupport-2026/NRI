const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema(
  {
    builder: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 200 },
    slug: { type: String, required: true, unique: true, trim: true, maxlength: 240 },
    tagline: { type: String, trim: true, maxlength: 200 },
    description: { type: String },
    projectType: { type: String, enum: ['apartment', 'villa', 'plot', 'commercial', 'township'], default: 'apartment' },
    configuration: { type: String, trim: true, maxlength: 120 },
    minPrice: { type: Number, min: 0 },
    maxPrice: { type: Number, min: 0 },
    minArea: { type: Number, min: 0 },
    maxArea: { type: Number, min: 0 },
    totalUnits: { type: Number, min: 0 },
    towers: { type: Number, min: 0 },
    locality: { type: String, required: true, trim: true, maxlength: 120 },
    city: { type: String, required: true, trim: true, maxlength: 80 },
    address: { type: String, trim: true, maxlength: 255 },
    reraNo: { type: String, trim: true, maxlength: 80 },
    possessionOn: { type: Date },
    amenities: { type: [String], default: [] },
    coverImage: { type: String, trim: true, maxlength: 400 },
    status: { type: String, enum: ['upcoming', 'ongoing', 'completed'], default: 'ongoing' },
    isFeatured: { type: Boolean, default: false },
    views: { type: Number, default: 0 },
  },
  { timestamps: true }
);

projectSchema.index({ city: 1, status: 1 });
projectSchema.index({ status: 1 });

projectSchema.virtual('images', {
  ref: 'ProjectImage',
  localField: '_id',
  foreignField: 'project',
});

module.exports = mongoose.model('Project', projectSchema);
