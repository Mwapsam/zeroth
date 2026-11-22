const mongoose = require('mongoose');

const advertSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    title: { type: String, required: true, maxlength: 120 },
    category: { type: String, required: true, enum: ['services', 'products', 'events', 'jobs', 'other'] },
    description: { type: String, required: true, maxlength: 500 },
    price: { type: Number, min: 0, default: 0 },
    contact: { type: String, required: true, maxlength: 40 },
    location: { type: String, maxlength: 120 },
    imageUrl: { type: String, maxlength: 500 },
    tier: { type: String, enum: ['free', 'silver', 'gold'], default: 'free' },
    status: { type: String, enum: ['pending', 'active', 'expired', 'rejected'], default: 'pending', index: true },
    views: { type: Number, default: 0 },
    expiresAt: { type: Date, index: true }
  },
  { timestamps: true }
);

advertSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('Advert', advertSchema);