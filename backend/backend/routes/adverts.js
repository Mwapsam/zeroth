const express = require('express');
const { body, query } = require('express-validator');
const router = express.Router();
const path = require('path');

const Advert = require('../models/Advert');
const Wallet = require('../models/Wallet');
const Transaction = require('../models/Transaction');
const { requireAuth, optionalAuth } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { handleValidation } = require('../middleware/validate');
const { imageUpload } = require('../middleware/upload');
const { ADVERT_TIERS, TX_TYPES, TX_STATUS } = require('../config/constants');

router.get(
  '/',
  optionalAuth,
  [
    query('category').optional().isString(),
    query('tier').optional().isIn(Object.keys(ADVERT_TIERS)),
    query('status').optional().isIn(['pending', 'active', 'expired', 'rejected'])
  ],
  handleValidation,
  asyncHandler(async (req, res) => {
    const filter = { status: 'active' };
    if (req.query.category) filter.category = req.query.category;
    if (req.query.tier) filter.tier = req.query.tier;
    if (req.query.q) filter.title = new RegExp(req.query.q, 'i');
    filter.$or = [{ expiresAt: { $gt: new Date() } }, { expiresAt: null }];

    const items = await Advert.find(filter).sort({ tier: -1, createdAt: -1 }).limit(200);
    res.json({ success: true, items });
  })
);

router.get('/my', requireAuth, asyncHandler(async (req, res) => {
  const items = await Advert.find({ user: req.user._id }).sort({ createdAt: -1 });
  const now = new Date();
  const stats = {
    active: items.filter((i) => i.status === 'active' && (!i.expiresAt || i.expiresAt > now)).length,
    pending: items.filter((i) => i.status === 'pending').length,
    expired: items.filter((i) => i.status === 'expired' || (i.expiresAt && i.expiresAt <= now)).length,
    views: items.reduce((sum, i) => sum + (i.views || 0), 0)
  };
  res.json({ success: true, items, stats });
}));

router.post(
  '/',
  requireAuth,
  imageUpload.single('image'),
  [
    body('title').notEmpty().isLength({ max: 120 }),
    body('category').isIn(['services', 'products', 'events', 'jobs', 'other']),
    body('description').notEmpty().isLength({ max: 500 }),
    body('contact').notEmpty(),
    body('tier').optional().isIn(Object.keys(ADVERT_TIERS))
  ],
  handleValidation,
  asyncHandler(async (req, res) => {
    const b = req.body;
    const tier = b.tier || 'free';
    const tierMeta = ADVERT_TIERS[tier];

    // Optional image (file or base64 payload or URL)
    let imageUrl = b.imageUrl || null;
    if (req.file) imageUrl = `/uploads/images/${path.basename(req.file.path)}`;
    else if (b.imageData && typeof b.imageData === 'string' && b.imageData.startsWith('data:image')) {
      // If base64 too large, we skip; expect client to send via file upload instead.
      imageUrl = null;
    }

    const advert = await Advert.create({
      user: req.user._id,
      title: b.title,
      category: b.category,
      description: b.description,
      price: Number(b.price || 0),
      contact: b.contact,
      location: b.location,
      imageUrl,
      tier,
      status: tier === 'free' ? 'active' : 'pending',
      expiresAt: new Date(Date.now() + tierMeta.days * 24 * 60 * 60 * 1000)
    });

    // Charge wallet if paid tier
    if (tierMeta.price > 0) {
      const wallet = await Wallet.findOne({ user: req.user._id });
      if (!wallet) return res.status(404).json({ success: false, message: 'Wallet not found' });
      try {
        await wallet.debit(tierMeta.price);
        await Transaction.create({
          user: req.user._id,
          wallet: wallet._id,
          type: TX_TYPES.ADVERT_PAYMENT,
          status: TX_STATUS.COMPLETED,
          amount: tierMeta.price,
          currency: wallet.currency,
          description: `Advert payment — ${tier} tier`,
          balanceAfter: wallet.balance
        });
      } catch (err) {
        // Rollback advert if insufficient balance
        advert.status = 'rejected';
        await advert.save();
        return res.status(402).json({ success: false, message: 'Insufficient wallet balance to publish this ad' });
      }
    }

    res.status(201).json({ success: true, message: 'Advert created', advert });
  })
);

router.post('/:id/view', asyncHandler(async (req, res) => {
  await Advert.updateOne({ _id: req.params.id }, { $inc: { views: 1 } });
  res.json({ success: true });
}));

router.patch(
  '/:id',
  requireAuth,
  [body('status').optional().isIn(['pending', 'active', 'expired', 'rejected'])],
  handleValidation,
  asyncHandler(async (req, res) => {
    const advert = await Advert.findById(req.params.id);
    if (!advert) return res.status(404).json({ success: false, message: 'Advert not found' });
    const isOwner = advert.user && advert.user.equals(req.user._id);
    if (!isOwner && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }
    if (req.body.status) advert.status = req.body.status;
    if (req.body.title) advert.title = req.body.title;
    if (req.body.description) advert.description = req.body.description;
    await advert.save();
    res.json({ success: true, advert });
  })
);

router.delete('/:id', requireAuth, asyncHandler(async (req, res) => {
  const advert = await Advert.findById(req.params.id);
  if (!advert) return res.status(404).json({ success: false, message: 'Advert not found' });
  const isOwner = advert.user && advert.user.equals(req.user._id);
  if (!isOwner && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Forbidden' });
  }
  await advert.deleteOne();
  res.json({ success: true, message: 'Advert deleted' });
}));

module.exports = router;