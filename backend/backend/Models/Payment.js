const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
    {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        amount: { type: Number, required: true, min: 0 },
        currency: { type: String, default: 'ZMW' },

        method: {
            type: String, required: true,
            enum: ['airtel', 'mtn', 'zamtel', 'bank', 'card', 'cash', 'wallet']
        },

        purpose: {
            type: String, required: true,
            enum: [
                'wallet-topup', 'wallet-withdraw', 'order', 'application',
                'consultation', 'rental', 'bet', 'bet-payout', 'etf-purchase',
                'etf-sale', 'permit', 'subscription', 'refund'
            ]
        },

        reference: { type: String, unique: true, index: true },

        status: {
            type: String,
            enum: ['pending', 'completed', 'failed', 'refunded'],
            default: 'pending'
        },

        relatedId: mongoose.Schema.Types.ObjectId,
        metadata: mongoose.Schema.Types.Mixed,

        paidAt: Date,
        refundedAt: Date
    },
    { timestamps: true }
);

paymentSchema.pre('save', function (next) {
    if (!this.reference) {
        this.reference = `PAY-${Date.now().toString(36).toUpperCase()}-${Math.random()
            .toString(36).slice(2, 6).toUpperCase()}`;
    }
    next();
});

module.exports = mongoose.model('Payment', paymentSchema);