const mongoose = require('mongoose');
const { TX_TYPES, TX_STATUS } = require('../config/constants');

const txSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    wallet: { type: mongoose.Schema.Types.ObjectId, ref: 'Wallet', required: true },
    type: { type: String, enum: Object.values(TX_TYPES), required: true },
    status: { type: String, enum: Object.values(TX_STATUS), default: TX_STATUS.PENDING, index: true },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true },
    reference: { type: String, unique: true, sparse: true, index: true },
    provider: { type: String },
    providerRef: { type: String },
    metadata: { type: mongoose.Schema.Types.Mixed },
    description: { type: String, maxlength: 300 },
    balanceAfter: { type: Number }
  },
  { timestamps: true }
);

txSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('Transaction', txSchema);