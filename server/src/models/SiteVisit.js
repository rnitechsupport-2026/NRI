const mongoose = require('mongoose');

const siteVisitSchema = new mongoose.Schema(
  {
    property: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true, index: true },
    lead: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead', index: true },
    host: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    visitor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    phone: { type: String, required: true, trim: true, maxlength: 20 },
    email: { type: String, trim: true, lowercase: true, maxlength: 160 },
    visitOn: { type: Date, required: true, index: true },
    slot: { type: String, enum: ['morning', 'afternoon', 'evening'], required: true },
    notes: { type: String, trim: true, maxlength: 500 },
    status: { type: String, enum: ['requested', 'confirmed', 'completed', 'cancelled', 'no-show'], default: 'requested' },
  },
  { timestamps: true }
);

siteVisitSchema.index({ host: 1, status: 1 });

module.exports = mongoose.model('SiteVisit', siteVisitSchema);
