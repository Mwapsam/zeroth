const Payment = require('../models/Payment');
const User = require('../models/User');
const { asyncHandler, paginate, generateRef } = require('../utils/helpers');

exports.create = asyncHandler(async (req, res) => {
    const { amount, method, purpose, relatedId, metadata } = req.body;

    const payment = await Payment.create({
        user: req.user._id,
        amount, method, purpose, relatedId, metadata,
        reference: generateRef('PAY'),
        status: 'completed',
        paidAt: new Date()
    });

    if (purpose === 'wallet-topup') {
        await User.findByIdAndUpdate(req.user._id, {
            $inc: { 'wallet.balance': amount }
        });
    } else if (method === 'wallet') {
        const u = await User.findById(req.user._id);
        if (u.wallet.balance < amount) {
            payment.status = 'failed';
            await payment.save();
            return res.status(400).json({ success: false, message: 'Insufficient wallet balance' });
        }
        u.wallet.balance -= amount;
        await u.save();
    }

    res.status(201).json({ success: true, message: 'Payment processed', payment });
});

exports.listMine = asyncHandler(async (req, res) => {
    const { page, limit, skip } = paginate(req.query);
    const filter = { user: req.user._id };
    if (req.query.status) filter.status = req.query.status;
    if (req.query.purpose) filter.purpose = req.query.purpose;

    const [payments, total] = await Promise.all([
        Payment.find(filter).skip(skip).limit(limit).sort({ createdAt: -1 }),
        Payment.countDocuments(filter)
    ]);
    res.json({ success: true, total, page, payments });
});

exports.getOne = asyncHandler(async (req, res) => {
    const p = await Payment.findOne({ _id: req.params.id, user: req.user._id });
    if (!p) return res.status(404).json({ success: false, message: 'Payment not found' });
    res.json({ success: true, payment: p });
});

exports.wallet = asyncHandler(async (req, res) => {
    const u = await User.findById(req.user._id).select('wallet');
    res.json({ success: true, wallet: u.wallet });
});

exports.refund = asyncHandler(async (req, res) => {
    const p = await Payment.findById(req.params.id);
    if (!p) return res.status(404).json({ success: false, message: 'Payment not found' });
    if (p.status === 'refunded')
        return res.status(400).json({ success: false, message: 'Already refunded' });

    p.status = 'refunded';
    p.refundedAt = new Date();
    await p.save();

    await User.findByIdAndUpdate(p.user, { $inc: { 'wallet.balance': p.amount } });
    res.json({ success: true, message: 'Refunded', payment: p });
});