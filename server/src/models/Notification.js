const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    kind: { type: String, enum: ['followup', 'price-drop', 'new-listing', 'visit', 'feedback', 'system'], default: 'system' },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    body: { type: String, trim: true, maxlength: 600 },
    link: { type: String, trim: true, maxlength: 300 },
    property: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', index: true },
    readAt: { type: Date },
  },
  { timestamps: true }
);

notificationSchema.index({ user: 1, readAt: 1 });

module.exports = mongoose.model('Notification', notificationSchema);
