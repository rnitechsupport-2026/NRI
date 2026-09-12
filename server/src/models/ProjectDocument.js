const mongoose = require('mongoose');

const projectDocumentSchema = new mongoose.Schema(
  {
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    type: {
      type: String,
      enum: ['rera_certificate', 'jda_poa', 'encumbrance_certificate', 'approval_doc', 'other'],
      required: true,
    },

    // Encrypted-at-rest file, stored outside any statically-served directory.
    fileKey: { type: String, required: true, trim: true },
    iv: { type: String, required: true },
    authTag: { type: String, required: true },
    originalName: { type: String, trim: true, maxlength: 200 },
    mimeType: { type: String, trim: true, maxlength: 100 },
    sizeBytes: { type: Number },

    status: { type: String, enum: ['submitted', 'reviewed', 'verified', 'rejected'], default: 'submitted' },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: { type: Date },
    reviewNote: { type: String, trim: true, maxlength: 500 },
  },
  { timestamps: true }
);

projectDocumentSchema.index({ project: 1, type: 1 });

module.exports = mongoose.model('ProjectDocument', projectDocumentSchema);
