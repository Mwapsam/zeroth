const mongoose = require('mongoose');

const eduResourceSchema = new mongoose.Schema(
  {
    uploader: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    title: { type: String, required: true, maxlength: 120 },
    author: { type: String, maxlength: 120 },
    price: { type: Number, default: 0, min: 0 },
    category: { type: String, default: 'general' },
    coverUrl: String,
    pdfUrl: { type: String, required: true },
    fileName: String,
    fileSize: Number,
    downloads: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true, index: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model('EducationResource', eduResourceSchema);