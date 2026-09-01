const mongoose = require('mongoose');

const savedSearchSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    label: { type: String, required: true, trim: true, maxlength: 160 },
    params: { type: mongoose.Schema.Types.Mixed, required: true },
    alerts: { type: Boolean, default: true },
    lastRunAt: { type: Date },
  },
  { timestamps: true }
);

savedSearchSchema.index({ user: 1 });

module.exports = mongoose.model('SavedSearch', savedSearchSchema);
