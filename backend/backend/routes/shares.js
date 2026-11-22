const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const mongoose = require('mongoose');

const ShareApplication = require('../models/ShareApplication');
const ShareHolding = require('../models/ShareHolding');
const Wallet = require('../models/Wallet');
const Transaction = require('../models/Transaction');
const { requireAuth, requireRole } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { handleValidation } = require('../middleware/validate');
const { SHARE_COMPANIES, TX_TYPES, TX_STATUS } = require('../config/constants');

function priceFor(company) {
  return SHARE_COMPANIES[company];
}

router.get('/companies', (req, res) => {
  const items = Object.entries(SHARE_COMPANIES).map(([name, price]) => ({ name, price }));
  res.json({ success: true, items });
});

router.post(
  '/apply',
  requireAuth,
  [
    body('fullName').notEmpty().isLength({ max: 120 }),
    body('nrc').notEmpty().isLength({ max: 40 }),
    body('country').notEmpty(),
    body('phone').notEmpty(),
    body('email').isEmail(),
    body('company').custom((v) => !!priceFor(v)).withMessage('Unknown company'),
    body('quantity').isInt({ min: 1 }),
    body('paymentMethod').notEmpty()
  ],
  handleValidation,
  asyncHandler(async (req, res) => {
    const b = req.body;
    const price = priceFor(b.company);
    const total = Math.round(price * Number(b.quantity) * 100) / 100;

    const app = await ShareApplication.create({
      user: req.user._id,
      fullName: b.fullName,
      gender: b.gender || '',
      dob: b.dob || undefined,
      nrc: b.nrc,
      country: b.country,
      phone: b.phone,
      email: b.email,
      residence: b.residence,
      company: b.company,
      quantity: Number(b.quantity),
      pricePerShare: price,
      totalAmount: total,
      paymentMethod: b.paymentMethod,
      status: 'pending'
    });

    res.status(201).json({ success: true, message: 'Application submitted', application: app });
  })
);

router.get('/my-applications', requireAuth, asyncHandler(async (req, res) => {
  const items = await ShareApplication.find({ user: req.user._id }).sort({ createdAt: -1 });
  res.json({ success: true, items });
}));

router.get('/my-holdings', requireAuth, asyncHandler(async (req, res) => {
  const items = await ShareHolding.find({ user: req.user._id }).sort({ company: 1 });
  res.json({ success: true, items });
}));

// Admin: review application
router.patch(
  '/applications/:id',
  requireAuth,
  requireRole('admin'),
  [body('status').isIn(['pending', 'approved', 'rejected', 'paid', 'completed'])],
  handleValidation,
  asyncHandler(async (req, res) => {
    const app = await ShareApplication.findById(req.params.id);
    if (!app) return res.status(404).json({ success: false, message: 'Application not found' });

    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        app.status = req.body.status;
        app.adminNote = req.body.adminNote || app.adminNote;
        app.reviewedBy = req.user._id;
        app.reviewedAt = new Date();
        await app.save({ session });

        if (req.body.status === 'completed' && app.user) {
          const wallet = await Wallet.findOne({ user: app.user }).session(session);
          if (wallet && wallet.balance >= app.totalAmount) {
            await wallet.debit(app.totalAmount);
            await Transaction.create([{
              user: app.user,
              wallet: wallet._id,
              type: TX_TYPES.SHARE_PURCHASE,
              status: TX_STATUS.COMPLETED,
              amount: app.totalAmount,
              currency: wallet.currency,
              description: `Purchase ${app.quantity} shares of ${app.company}`,
              balanceAfter: wallet.balance
            }], { session });

            const existing = await ShareHolding.findOne({ user: app.user, company: app.company }).session(session);
            if (existing) {
              const totalShares = existing.shares + app.quantity;
              existing.averagePrice = ((existing.averagePrice * existing.shares) + (app.pricePerShare * app.quantity)) / totalShares;
              existing.shares = totalShares;
              existing.lastUpdated = new Date();
              await existing.save({ session });
            } else {
              await ShareHolding.create([{
                user: app.user,
                company: app.company,
                shares: app.quantity,
                averagePrice: app.pricePerShare
              }], { session });
            }
          }
        }
      });
    } finally {
      session.endSession();
    }

    res.json({ success: true, application: app });
  })
);

module.exports = router;