const mongoose = require('mongoose');

const micrositeSectionSchema = new mongoose.Schema(
  {
    microsite: { type: mongoose.Schema.Types.ObjectId, ref: 'Microsite', required: true, index: true },
    sectionType: { type: String, required: true },
    sectionOrder: { type: Number, default: 0 },
    isVisible: { type: Boolean, default: true },
    // Admin-entered overrides (headline text, highlight bullets, FAQ items) —
    // never used to fabricate facts about the property itself; real property
    // fields are always read live from Property at render time, not copied here.
    sectionData: { type: mongoose.Schema.Types.Mixed, default: {} },
    // Layout-level settings (columns, alignment, spacing, image choice, button label/link).
    settings: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

micrositeSectionSchema.index({ microsite: 1, sectionOrder: 1 });

module.exports = mongoose.model('MicrositeSection', micrositeSectionSchema);
