const mongoose = require('mongoose');

const navItemSchema = new mongoose.Schema(
  {
    key: { type: String, required: true },
    label: { type: String, required: true, trim: true, maxlength: 60 },
    visible: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
  },
  { _id: false }
);

const micrositeSchema = new mongoose.Schema(
  {
    property: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true, unique: true, index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    templateId: { type: String, enum: ['premium-luxury', 'modern-real-estate', 'lead-generation', 'editorial', 'custom'], default: 'custom' },
    status: { type: String, enum: ['draft', 'published'], default: 'draft' },
    slug: { type: String, required: true, unique: true, trim: true, maxlength: 240 },
    theme: {
      primaryColor: { type: String, default: '#0e2a4e' },
      secondaryColor: { type: String, default: '#e4a11b' },
      backgroundColor: { type: String, default: '#ffffff' },
      textColor: { type: String, default: '#111827' },
      buttonStyle: { type: String, enum: ['solid', 'outline', 'pill'], default: 'solid' },
      borderRadius: { type: String, enum: ['none', 'sm', 'md', 'lg', 'full'], default: 'md' },
      fontStyle: { type: String, enum: ['classic', 'modern', 'editorial'], default: 'modern' },
      sectionSpacing: { type: String, enum: ['compact', 'normal', 'spacious'], default: 'normal' },
    },
    navbar: {
      showLogo: { type: Boolean, default: true },
      logoUrl: { type: String, default: '' },
      background: { type: String, default: '#ffffff' },
      sticky: { type: Boolean, default: true },
      items: { type: [navItemSchema], default: [] },
    },
    publishedAt: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Microsite', micrositeSchema);
