const mongoose = require('mongoose');

const leadSchema = new mongoose.Schema(
  {
    receiver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    property: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', index: true },
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', index: true },
    service: { type: mongoose.Schema.Types.ObjectId, ref: 'ServiceOffering', index: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    email: { type: String, trim: true, lowercase: true, maxlength: 160 },
    phone: { type: String, required: true, trim: true, maxlength: 20 },
    message: { type: String },
    source: { type: String, enum: ['property', 'project', 'service', 'contact'], default: 'property' },
    status: { type: String, enum: ['new', 'contacted', 'visit-scheduled', 'closed', 'lost'], default: 'new' },
    score: { type: Number, default: 0, min: 0, max: 100 },
    temperature: { type: String, enum: ['hot', 'warm', 'cold'], default: 'cold' },
    scoreReasons: { type: [String], default: [] },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    assignReason: { type: String, trim: true, maxlength: 200 },
    budgetMin: { type: Number, min: 0 },
    budgetMax: { type: Number, min: 0 },
    prefBhk: { type: String, trim: true, maxlength: 20 },
    prefCity: { type: String, trim: true, maxlength: 80 },
    prefLocality: { type: String, trim: true, maxlength: 120 },
    prefPurpose: { type: String, enum: ['sale', 'rent', 'pg', 'lease'] },
    timeline: { type: String, enum: ['immediate', '1-3-months', '3-6-months', 'just-looking'] },
    finance: { type: String, enum: ['loan', 'self', 'not-sure'] },
    lastFollowupAt: { type: Date },
    followupCount: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

leadSchema.index({ receiver: 1, status: 1 });
leadSchema.index({ receiver: 1, temperature: 1 });
leadSchema.index({ assignedTo: 1, status: 1 });
leadSchema.index({ phone: 1 });

module.exports = mongoose.model('Lead', leadSchema);
