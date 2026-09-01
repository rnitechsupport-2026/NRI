const mongoose = require('mongoose');

const outboxSchema = new mongoose.Schema(
  {
    channel: { type: String, enum: ['email', 'whatsapp'], required: true },
    toAddress: { type: String, required: true, trim: true, maxlength: 200 },
    subject: { type: String, trim: true, maxlength: 240 },
    body: { type: String, required: true },
    template: { type: String, trim: true, maxlength: 60 },
    lead: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead', index: true },
    property: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    status: { type: String, enum: ['queued', 'sent', 'failed', 'skipped'], default: 'queued' },
    error: { type: String, trim: true, maxlength: 300 },
    sentAt: { type: Date },
  },
  { timestamps: true }
);

outboxSchema.index({ status: 1, channel: 1 });

module.exports = mongoose.model('Outbox', outboxSchema);
