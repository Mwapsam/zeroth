const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const { nanoid } = require('nanoid');

const Wallet = require('../models/Wallet');
const Transaction = require('../models/Transaction');
const { requireAuth } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { handleValidation } = require('../middleware/validate');
const { TX_TYPES, TX_STATUS } = require('../config/constants');

router.get('/', requireAuth, asyncHandler(async (req, res) => {
  let wallet = await Wallet.findOne({ user: req.user._id });
  if (!wallet) wallet = await Wallet.create({ user: req.user._id, currency: req.user.currency });
  res.json({ success: true, wallet });
}));

router.get('/transactions', requireAuth, asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page || '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || '20', 10)));
  const filter = { user: req.user._id };
  if (req.query.type) filter.type = req.query.type;
  if (req.query.status) filter.status = req.query.status;

  const [items, total] = await Promise.all([
    Transaction.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    Transaction.countDocuments(filter)
  ]);
  res.json({ success: true, total, page, limit, items });
}));

/**
 * Deposit (demo / mobile money style). In production, this endpoint should
 * initiate a provider charge and rely on a webhook to credit the wallet.
 */
router.post(
  '/deposit',
  requireAuth,
  [body('amount').isFloat({ gt: 0 }), body('provider').optional().isString()],
  handleValidation,
  asyncHandler(async (req, res) => {
    const amount = Math.round(Number(req.body.amount) * 100) / 100;
    const wallet = await Wallet.findOne({ user: req.user._id });
    if (!wallet) return res.status(404).json({ success: false, message: 'Wallet not found' });
    if (wallet.isFrozen) return res.status(403).json({ success: false, message: 'Wallet is frozen' });

    await wallet.credit(amount);

    const tx = await Transaction.create({
      user: req.user._id,
      wallet: wallet._id,
      type: TX_TYPES.DEPOSIT,
      status: TX_STATUS.COMPLETED,
      amount,
      currency: wallet.currency,
      provider: req.body.provider || 'manual',
      reference: `DEP-${nanoid(10)}`,
      description: 'Wallet deposit',
      balanceAfter: wallet.balance
    });

    res.json({ success: true, message: 'Deposit successful', wallet, transaction: tx });
  })
);

router.post(
  '/withdraw',
  requireAuth,
  [body('amount').isFloat({ gt: 0 }), body('destination').optional().isString()],
  handleValidation,
  asyncHandler(async (req, res) => {
    const amount = Math.round(Number(req.body.amount) * 100) / 100;
    const wallet = await Wallet.findOne({ user: req.user._id });
    if (!wallet) return res.status(404).json({ success: false, message: 'Wallet not found' });
    if (wallet.isFrozen) return res.status(403).json({ success: false, message: 'Wallet is frozen' });

    await wallet.debit(amount);

    const tx = await Transaction.create({
      user: req.user._id,
      wallet: wallet._id,
      type: TX_TYPES.WITHDRAWAL,
      status: TX_STATUS.COMPLETED,
      amount,
      currency: wallet.currency,
      provider: req.body.destination || 'manual',
      reference: `WDR-${nanoid(10)}`,
      description: 'Wallet withdrawal',
      balanceAfter: wallet.balance
    });

    res.json({ success: true, message: 'Withdrawal successful', wallet, transaction: tx });
  })
);

module.exports = router;