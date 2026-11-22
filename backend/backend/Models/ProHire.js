const mongoose = require('mongoose');

const proHireSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    kind: { type: String, enum: ['service', 'vehicle'], default: 'service' },
    title: { type: String, required: true, maxlength: 150 },
    description: { type: String, maxlength: 1000 },
    category: String,
    price: { type: Number, min: 0 },
    currency: { type: String, default: 'ZMW' },
    location: String,
    contactPhone: { type: String, maxlength: 40 },
    images: [String],
    isActive: { type: Boolean, default: true, index: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model('ProHire', proHireSchema);