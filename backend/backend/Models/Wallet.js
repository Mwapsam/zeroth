const mongoose = require('mongoose');

const walletSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    currency: { type: String, required: true },
    balance: { type: Number, default: 0, min: 0 },
    lockedBalance: { type: Number, default: 0, min: 0 },
    isFrozen: { type: Boolean, default: false }
  },
  { timestamps: true }
);

walletSchema.methods.credit = async function (amount) {
  if (amount <= 0) throw new Error('Credit amount must be positive');
  this.balance = Math.round((this.balance + amount) * 100) / 100;
  return this.save();
};

walletSchema.methods.debit = async function (amount) {
  if (amount <= 0) throw new Error('Debit amount must be positive');
  if (this.balance < amount) {
    const err = new Error('Insufficient wallet balance');
    err.status = 402;
    throw err;
  }
  this.balance = Math.round((this.balance - amount) * 100) / 100;
  return this.save();
};

module.exports = mongoose.model('Wallet', walletSchema);