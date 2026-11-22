/* ============================================================
   PAYMENT CONTROLLER
   ============================================================ */
const Payment = require('../models/Payment');
const User = require('../models/User');
const { asyncHandler, paginate, generateRef } = require('../utils/helpers');

/* ============================================================
   CREATE
   ============================================================ */
exports.create = asyncHandler(async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    const { amount, method, purpose, relatedId, metadata } = req.body || {};
    const amt = Number(amount);

    if (!amt || amt <= 0) {
        return res.status(400).json({ success: false, message: 'Invalid amount' });
    }

    const payment = await Payment.create({
        user: req.user._id,
        amount: amt,
        method,
        purpose,
        relatedId,
        metadata,
        reference: generateRef('PAY'),
        status: 'completed',
        paidAt: new Date()
    });

    if (purpose === 'wallet-topup') {
        await User.findByIdAndUpdate(req.user._id, {
            $inc: { 'wallet.balance': amt }
        });
    } else if (method === 'wallet') {
        const u = await User.findById(req.user._id);
        if (u.wallet.balance < amt) {
            payment.status = 'failed';
            await payment.save();
            return res.status(400).json({
                success: false,
                message: 'Insufficient wallet balance'
            });
        }
        u.wallet.balance -= amt;
        await u.save();
    }

    const obj = payment.toObject();
    obj.id = String(obj._id);
    res.status(201).json({ success: true, message: 'Payment processed', payment: obj });
});

/* ============================================================
   LIST MINE
   ============================================================ */
exports.listMine = asyncHandler(async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    const { page, limit, skip } = paginate(req.query);
    const filter = { user: req.user._id };
    if (req.query.status) filter.status = req.query.status;
    if (req.query.purpose) filter.purpose = req.query.purpose;

    const [payments, total] = await Promise.all([
        Payment.find(filter).skip(skip).limit(limit).sort({ createdAt: -1 }),
        Payment.countDocuments(filter)
    ]);

    res.json({
        success: true,
        total,
        page,
        payments: payments.map((p) => {
            const obj = p.toObject();
            obj.id = String(obj._id);
            return obj;
        })
    });
});

/* ============================================================
   GET ONE
   ============================================================ */
exports.getOne = asyncHandler(async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    const p = await Payment.findOne({
        _id: req.params.id,
        user: req.user._id
    });

    if (!p) {
        return res.status(404).json({ success: false, message: 'Payment not found' });
    }
    res.json({ success: true, payment: p });
});

/* ============================================================
   WALLET
   ============================================================ */
exports.wallet = asyncHandler(async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    const u = await User.findById(req.user._id).select('wallet');
    res.json({ success: true, wallet: u.wallet });
});

/* ============================================================
   REFUND (admin)
   ============================================================ */
exports.refund = asyncHandler(async (req, res) => {
    const p = await Payment.findById(req.params.id);
    if (!p) {
        return res.status(404).json({ success: false, message: 'Payment not found' });
    }
    if (p.status === 'refunded') {
        return res.status(400).json({ success: false, message: 'Already refunded' });
    }

    p.status = 'refunded';
    p.refundedAt = new Date();
    await p.save();

    await User.findByIdAndUpdate(p.user, {
        $inc: { 'wallet.balance': p.amount }
    });

    res.json({ success: true, message: 'Refunded', payment: p });
});