const mongoose = require('mongoose');

const STATUS = ['not_submitted', 'submitted', 'under_review', 'verified', 'rejected', 'expired'];

const builderProfileSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },

    entityType: {
      type: String,
      enum: ['individual', 'proprietorship', 'partnership', 'llp', 'private_limited', 'public_limited'],
      default: 'private_limited',
    },
    legalEntityName: { type: String, trim: true, maxlength: 200 },
    tradeName: { type: String, trim: true, maxlength: 160 },
    cin: { type: String, trim: true, maxlength: 40 },
    llpin: { type: String, trim: true, maxlength: 40 },
    pan: { type: String, trim: true, maxlength: 20 },
    gstin: { type: String, trim: true, maxlength: 20 },
    registeredAddress: { type: String, trim: true, maxlength: 400 },
    directors: [{
      name: { type: String, trim: true, maxlength: 120 },
      din: { type: String, trim: true, maxlength: 20 },
      _id: false,
    }],
    incorporationDate: { type: Date },
    previousProjectsNote: { type: String, trim: true, maxlength: 2000 },

    companyStatus: { type: String, enum: STATUS, default: 'not_submitted' },

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

builderProfileSchema.index({ lifecycleStatus: 1 });

/** Rough completion % across the fields a reviewer actually needs to see. */
builderProfileSchema.methods.completionPct = function computeCompletion() {
  const checks = [
    this.legalEntityName,
    this.entityType,
    this.pan,
    this.registeredAddress,
    this.entityType === 'individual' || this.cin || this.llpin,
    this.companyStatus !== 'not_submitted',
  ];
  const done = checks.filter(Boolean).length;
  return Math.round((done / checks.length) * 100);
};

module.exports = mongoose.model('BuilderProfile', builderProfileSchema);
