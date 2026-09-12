const mongoose = require('mongoose');

const serviceProviderDocumentSchema = new mongoose.Schema(
  {
    provider: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: {
      type: String,
      enum: [
        'pan', 'coi_incorporation', 'gst_certificate', 'partnership_deed',
        'degree_certificate', 'registration_certificate', 'license_certificate',
        'membership_certificate', 'cop_certificate', 'other',
      ],
      required: true,
    },

    // Encrypted-at-rest file, stored outside any statically-served directory.
    fileKey: { type: String, required: true, trim: true },
    iv: { type: String, required: true },
    authTag: { type: String, required: true },
    originalName: { type: String, trim: true, maxlength: 200 },
    mimeType: { type: String, trim: true, maxlength: 100 },
    sizeBytes: { type: Number },

    idNumber: { type: String, trim: true, maxlength: 40 },

    status: { type: String, enum: ['submitted', 'reviewed', 'verified', 'rejected'], default: 'submitted' },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: { type: Date },
    reviewNote: { type: String, trim: true, maxlength: 500 },
  },
  { timestamps: true }
);

serviceProviderDocumentSchema.index({ provider: 1, type: 1 });

module.exports = mongoose.model('ServiceProviderDocument', serviceProviderDocumentSchema);
