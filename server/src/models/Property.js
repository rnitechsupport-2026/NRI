const mongoose = require('mongoose');

const propertyImageSchema = new mongoose.Schema(
  {
    url: { type: String, required: true, trim: true, maxlength: 400 },
    sortOrder: { type: Number, default: 0 },
  },
  { _id: false }
);

const propertySchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    slug: { type: String, required: true, unique: true, trim: true, maxlength: 240 },
    description: { type: String },
    purpose: { type: String, enum: ['sale', 'rent', 'pg', 'lease'], default: 'sale' },
    propertyType: { type: String, enum: ['apartment', 'villa', 'independent-house', 'plot', 'office', 'shop', 'warehouse', 'farmhouse'], default: 'apartment' },
    bhk: { type: Number, min: 0, max: 20 },
    bathrooms: { type: Number, min: 0, max: 20 },
    balconies: { type: Number, min: 0, max: 20 },
    furnishing: { type: String, enum: ['unfurnished', 'semi-furnished', 'fully-furnished'] },
    facing: { type: String, trim: true, maxlength: 30 },
    floorNo: { type: Number, min: -5, max: 200 },
    totalFloors: { type: Number, min: 0, max: 200 },
    ageYears: { type: Number, min: 0, max: 100 },
    possession: { type: String, enum: ['ready-to-move', 'under-construction'] },
    builtUpArea: { type: Number, min: 1 },
    carpetArea: { type: Number, min: 0 },
    areaUnit: { type: String, enum: ['sqft', 'sqyd', 'acre', 'cent'], default: 'sqft' },
    price: { type: Number, required: true, min: 1 },
    priceNegotiable: { type: Boolean, default: false },
    maintenance: { type: Number, min: 0 },
    address: { type: String, trim: true, maxlength: 255 },
    locality: { type: String, required: true, trim: true, maxlength: 120 },
    city: { type: String, required: true, trim: true, maxlength: 80 },
    state: { type: String, trim: true, maxlength: 80 },
    pincode: { type: String, trim: true, maxlength: 10 },
    latitude: { type: Number },
    longitude: { type: Number },
    amenities: { type: [String], default: [] },
    coverImage: { type: String, trim: true, maxlength: 400 },
    tourUrl: { type: String, trim: true, maxlength: 600 },
    tourProvider: { type: String, trim: true, maxlength: 40 },
    videoUrl: { type: String, trim: true, maxlength: 600 },
    floorPlanUrl: { type: String, trim: true, maxlength: 400 },
    aiSummary: { type: String },
    aiSummaryAt: { type: Date },
    aiSummarySource: { type: String, enum: ['ai', 'template'] },
    isFeatured: { type: Boolean, default: false },
    isVerified: { type: Boolean, default: false },
    status: { type: String, enum: ['pending', 'active', 'sold', 'rented', 'inactive'], default: 'active' },
    views: { type: Number, default: 0 },
  },
  { timestamps: true }
);

propertySchema.index({ city: 1, status: 1 });
propertySchema.index({ purpose: 1, status: 1 });
propertySchema.index({ propertyType: 1, status: 1 });
propertySchema.index({ price: 1, status: 1 });
propertySchema.index({ status: 1 });
propertySchema.index({ locality: 1 });
propertySchema.index({ isFeatured: -1, createdAt: -1 });

module.exports = mongoose.model('Property', propertySchema);
