const mongoose = require('mongoose');

const agentDocumentSchema = new mongoose.Schema(
  {
    agent: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: {
      type: String,
      enum: ['gov_id', 'pan', 'selfie', 'rera_certificate', 'business_doc'],
      required: true,
    },

    // Encrypted-at-rest file, stored outside any statically-served directory.
    // fileKey is a path relative to server/secure-storage/, never a public URL.
    fileKey: { type: String, required: true, trim: true },
    iv: { type: String, required: true }, // AES-GCM initialization vector, hex
    authTag: { type: String, required: true }, // AES-GCM auth tag, hex
    originalName: { type: String, trim: true, maxlength: 200 },
    mimeType: { type: String, trim: true, maxlength: 100 },
    sizeBytes: { type: Number },

    // Typed value on gov_id / pan docs (masked everywhere except an explicit reveal).
    idNumber: { type: String, trim: true, maxlength: 40 },

    status: { type: String, enum: ['submitted', 'reviewed', 'verified', 'rejected'], default: 'submitted' },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: { type: Date },
    reviewNote: { type: String, trim: true, maxlength: 500 },
  },
  { timestamps: true }
);

agentDocumentSchema.index({ agent: 1, type: 1 });

module.exports = mongoose.model('AgentDocument', agentDocumentSchema);
