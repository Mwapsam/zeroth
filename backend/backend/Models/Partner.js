const mongoose = require('mongoose');

const partnerSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, maxlength: 150 },
    logo: { type: String, default: 'images/partners/default.png' },
    category: { type: String, enum: ['brokerage', 'financial', 'agricultural', 'technology', 'construction', 'education', 'other'], default: 'brokerage' },
    description: { type: String, maxlength: 2000 },
    services: [{ type: String, maxlength: 120 }],
    contactEmail: String,
    contactPhone: String,
    website: String,
    city: String,
    isActive: { type: Boolean, default: true, index: true },
    displayOrder: { type: Number, default: 0 }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Partner', partnerSchema);