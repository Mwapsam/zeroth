const mongoose = require('mongoose');

const loanSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    amount: { type: Number, required: true, min: 1 },
    termMonths: { type: Number, required: true, min: 1, max: 120 },
    purpose: { type: String, maxlength: 300 },
    interestRate: { type: Number, required: true },
    monthlyPayment: Number,
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'disbursed', 'repaid', 'defaulted'],
      default: 'pending',
      index: true
    },
    adminNote: String,
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: Date,
    disbursedAt: Date
  },
  { timestamps: true }
);

module.exports = mongoose.model('LoanApplication', loanSchema);