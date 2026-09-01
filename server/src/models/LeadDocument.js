const mongoose = require('mongoose');

const leadDocumentSchema = new mongoose.Schema(
  {
    lead: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead', required: true, index: true },
    docKey: { type: String, required: true, trim: true, maxlength: 60 },
    label: { type: String, required: true, trim: true, maxlength: 160 },
    status: { type: String, enum: ['pending', 'received', 'verified', 'waived'], default: 'pending' },
    fileUrl: { type: String, trim: true, maxlength: 400 },
    note: { type: String, trim: true, maxlength: 300 },
  },
  { timestamps: true }
);

leadDocumentSchema.index({ lead: 1, docKey: 1 }, { unique: true });

module.exports = mongoose.model('LeadDocument', leadDocumentSchema);
