const mongoose = require('mongoose');

const priceHistorySchema = new mongoose.Schema(
  {
    property: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true, index: true },
    price: { type: Number, required: true, min: 0 },
    alerted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

priceHistorySchema.index({ property: 1, createdAt: -1 });

module.exports = mongoose.model('PriceHistory', priceHistorySchema);
