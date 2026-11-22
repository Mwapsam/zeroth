const mongoose = require('mongoose');

const holdingSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    company: { type: String, required: true },
    shares: { type: Number, required: true, min: 0 },
    averagePrice: { type: Number, required: true, min: 0 },
    lastUpdated: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

holdingSchema.index({ user: 1, company: 1 }, { unique: true });

module.exports = mongoose.model('ShareHolding', holdingSchema);