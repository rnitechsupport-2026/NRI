const mongoose = require('mongoose');

const STATUS = ['not_submitted', 'submitted', 'under_review', 'verified', 'rejected', 'expired'];

const agentProfileSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },

    agentType: { type: String, enum: ['individual', 'agency', 'company'], default: 'individual' },
    companyName: { type: String, trim: true, maxlength: 160 },
    officeAddress: { type: String, trim: true, maxlength: 400 },
    operatingAreas: { type: [String], default: [] },
    propertyTypesHandled: {
      type: [String],
      enum: ['residential', 'commercial', 'land', 'rental', 'industrial', 'other'],
      default: [],
    },
    photoUrl: { type: String, trim: true, maxlength: 400 },
    dob: { type: Date },
    preferredLanguage: { type: String, trim: true, maxlength: 40 },

    kycStatus: { type: String, enum: STATUS, default: 'not_submitted' },
    reraStatus: { type: String, enum: STATUS, default: 'not_submitted' },
    businessStatus: { type: String, enum: STATUS, default: 'not_submitted' },

    reraNumber: { type: String, trim: true, maxlength: 80 },
    reraRegisteredName: { type: String, trim: true, maxlength: 160 },
    reraAuthority: { type: String, trim: true, maxlength: 120 },
    reraExpiryDate: { type: Date },

    businessRegNo: { type: String, trim: true, maxlength: 80 },
    authorizedRepName: { type: String, trim: true, maxlength: 160 },

    // draft -> submitted -> under_review -> verified -> active
    // or: rejected / resubmission_required / suspended / expired
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

agentProfileSchema.index({ lifecycleStatus: 1 });

/** Rough completion % across the fields a reviewer actually needs to see. */
agentProfileSchema.methods.completionPct = function computeCompletion() {
  const checks = [
    this.agentType,
    this.operatingAreas?.length,
    this.propertyTypesHandled?.length,
    this.photoUrl,
    this.preferredLanguage,
    this.kycStatus !== 'not_submitted',
    this.reraStatus !== 'not_submitted',
    this.agentType === 'individual' || this.businessStatus !== 'not_submitted',
  ];
  const done = checks.filter(Boolean).length;
  return Math.round((done / checks.length) * 100);
};

module.exports = mongoose.model('AgentProfile', agentProfileSchema);
