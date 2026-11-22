const mongoose = require('mongoose');

const agriSchema = new mongoose.Schema(
  {
    seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    name: { type: String, required: true, maxlength: 150 },
    category: { type: String, enum: ['crop', 'livestock', 'produce', 'equipment', 'input', 'other'], default: 'produce' },
    description: { type: String, maxlength: 1000 },
    price: { type: Number, required: true, min: 0 },
    unit: { type: String, default: 'kg' },
    quantity: { type: Number, min: 0 },
    location: String,
    imageUrl: String,
    isActive: { type: Boolean, default: true, index: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model('AgricultureListing', agriSchema);