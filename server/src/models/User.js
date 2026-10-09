const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true, maxlength: 160 },
    phone: { type: String, required: true, trim: true, maxlength: 20 },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ['owner', 'buyer', 'agent', 'builder', 'service', 'admin', 'employee'], default: 'owner' },
    companyName: { type: String, trim: true, maxlength: 160 },
    reraId: { type: String, trim: true, maxlength: 60 },
    serviceCategory: { type: String, trim: true, maxlength: 80 },
    experienceYears: { type: Number, min: 0, max: 70 },
    city: { type: String, trim: true, maxlength: 80 },
    locality: { type: String, trim: true, maxlength: 120 },
    about: { type: String },
    avatarUrl: { type: String, trim: true, maxlength: 400 },
    coverUrl: { type: String, trim: true, maxlength: 400 },
    website: { type: String, trim: true, maxlength: 200 },
    isVerified: { type: Boolean, default: false },
    status: { type: String, enum: ['active', 'suspended'], default: 'active' },
    approvalStatus: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'approved' },
    lastLoginAt: { type: Date },
    // Employees only — who they are in charge of (services/staffScope.js):
    // whole user types, and/or specific users picked by the admin.
    managedPortals: { type: [String], enum: ['owner', 'agent', 'builder', 'service'], default: [] },
    assignedUsers: { type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], default: [] },
    // Set while an employee is still on the default / reset password.
    mustChangePassword: { type: Boolean, default: false },
    // Who took the last approve / reject decision on this account, and why.
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date },
    approvalNote: { type: String, trim: true, maxlength: 500 },
  },
  { timestamps: true }
);

userSchema.index({ role: 1 });
userSchema.index({ city: 1 });

userSchema.virtual('password').set(function (v) {
  this.passwordHash = bcrypt.hashSync(v, 10);
});

userSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.passwordHash);
};

module.exports = mongoose.model('User', userSchema);
