const mongoose = require('mongoose');

const builderDocumentSchema = new mongoose.Schema(
  {
    builder: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: {
      type: String,
      enum: ['pan', 'coi_incorporation', 'gst_certificate', 'partnership_deed', 'director_id', 'other'],
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

    // Typed value on pan / cin-style docs (masked everywhere except an explicit reveal).
    idNumber: { type: String, trim: true, maxlength: 40 },

    status: { type: String, enum: ['submitted', 'reviewed', 'verified', 'rejected'], default: 'submitted' },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: { type: Date },
    reviewNote: { type: String, trim: true, maxlength: 500 },
  },
  { timestamps: true }
);

builderDocumentSchema.index({ builder: 1, type: 1 });

module.exports = mongoose.model('BuilderDocument', builderDocumentSchema);
