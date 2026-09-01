const mongoose = require('mongoose');

const visitFeedbackSchema = new mongoose.Schema(
  {
    visit: { type: mongoose.Schema.Types.ObjectId, ref: 'SiteVisit', required: true, unique: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    liked: { type: String, trim: true, maxlength: 400 },
    concerns: { type: String, trim: true, maxlength: 400 },
    interested: { type: String, enum: ['yes', 'maybe', 'no'], default: 'maybe' },
    comments: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model('VisitFeedback', visitFeedbackSchema);
