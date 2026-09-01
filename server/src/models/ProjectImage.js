const mongoose = require('mongoose');

const projectImageSchema = new mongoose.Schema(
  {
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    url: { type: String, required: true, trim: true, maxlength: 400 },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ProjectImage', projectImageSchema);
