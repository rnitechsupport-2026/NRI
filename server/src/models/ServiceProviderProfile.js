const mongoose = require('mongoose');
const { CATEGORY_KEYS, qualificationRequired } = require('../config/serviceCategoryRules');

const STATUS = ['not_submitted', 'submitted', 'under_review', 'verified', 'rejected', 'expired'];

const serviceProviderProfileSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },

    category: { type: String, enum: CATEGORY_KEYS },

    entityType: {
      type: String,
      enum: ['individual', 'proprietorship', 'partnership', 'llp', 'private_limited', 'public_limited'],
      default: 'individual',
    },
    legalEntityName: { type: String, trim: true, maxlength: 200 },
    tradeName: { type: String, trim: true, maxlength: 160 },
    cin: { type: String, trim: true, maxlength: 40 },
    llpin: { type: String, trim: true, maxlength: 40 },
    pan: { type: String, trim: true, maxlength: 20 },
    gstin: { type: String, trim: true, maxlength: 20 },
    registeredAddress: { type: String, trim: true, maxlength: 400 },

    degree: { type: String, trim: true, maxlength: 160 },
    professionalRegistrationNumber: { type: String, trim: true, maxlength: 80 },
    licenseNumber: { type: String, trim: true, maxlength: 80 },
    membershipNumber: { type: String, trim: true, maxlength: 80 },
    hasCertificateOfPractice: { type: Boolean, default: false },
    issuingAuthority: { type: String, trim: true, maxlength: 160 },
    registrationDate: { type: Date },
    expiryDate: { type: Date },

    identityStatus: { type: String, enum: STATUS, default: 'not_submitted' },
    qualificationStatus: { type: String, enum: STATUS, default: 'not_submitted' },

    lifecycleStatus: {
      type: String,
      enum: ['draft', 'submitted', 'under_review', 'verified', 'active', 'rejected', 'resubmission_required', 'suspended', 'expired'],
      default: 'draft',
    },
    submittedAt: { type: Date },
    activatedAt: { type: Date },
  },
  { timestamps: true }
);

serviceProviderProfileSchema.index({ lifecycleStatus: 1 });
serviceProviderProfileSchema.index({ category: 1 });

/** Whether qualification review even applies to this provider's category. */
serviceProviderProfileSchema.methods.needsQualification = function needsQualification() {
  return qualificationRequired(this.category);
};

serviceProviderProfileSchema.methods.completionPct = function computeCompletion() {
  const checks = [
    this.category,
    this.legalEntityName,
    this.entityType,
    this.pan,
    this.identityStatus !== 'not_submitted',
    !this.needsQualification() || this.qualificationStatus !== 'not_submitted',
  ];
  const done = checks.filter(Boolean).length;
  return Math.round((done / checks.length) * 100);
};

module.exports = mongoose.model('ServiceProviderProfile', serviceProviderProfileSchema);
