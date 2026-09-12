const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    admin: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    targetUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    action: { type: String, required: true, trim: true, maxlength: 80 },
    previousStatus: { type: String, trim: true, maxlength: 60 },
    newStatus: { type: String, trim: true, maxlength: 60 },
    reason: { type: String, trim: true, maxlength: 500 },
  },
  { timestamps: true }
);

auditLogSchema.index({ targetUser: 1, createdAt: -1 });
auditLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
