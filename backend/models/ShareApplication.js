const mongoose = require('mongoose');

const shareApplicationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    fullName: { type: String, required: true, maxlength: 120 },
    gender: { type: String, enum: ['Male', 'Female', ''] },
    dob: { type: Date },
    nrc: { type: String, required: true, maxlength: 40 },
    country: { type: String, required: true, maxlength: 60 },
    phone: { type: String, required: true, maxlength: 40 },
    email: { type: String, required: true, maxlength: 150 },
    residence: { type: String, maxlength: 200 },
    company: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    pricePerShare: { type: Number, required: true },
    totalAmount: { type: Number, required: true },
    paymentMethod: { type: String, required: true },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'paid', 'completed'],
      default: 'pending',
      index: true
    },
    adminNote: String,
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: Date
  },
  { timestamps: true }
);

module.exports = mongoose.model('ShareApplication', shareApplicationSchema);