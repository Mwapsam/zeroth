const express = require('express');
const { body } = require('express-validator');
const router = express.Router();

const Rental = require('../models/Rental');
const { requireAuth } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { handleValidation } = require('../middleware/validate');
const { imageUpload } = require('../middleware/upload');

router.get('/', asyncHandler(async (req, res) => {
  const filter = { isActive: true };
  if (req.query.type) filter.type = req.query.type;
  if (req.query.q) filter.title = new RegExp(req.query.q, 'i');
  if (req.query.maxPrice) filter.price = { $lte: Number(req.query.maxPrice) };
  const items = await Rental.find(filter).sort({ createdAt: -1 }).limit(200);
  res.json({ success: true, items });
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const item = await Rental.findById(req.params.id);
  if (!item) return res.status(404).json({ success: false, message: 'Rental not found' });
  res.json({ success: true, item });
}));

router.post(
  '/',
  requireAuth,
  imageUpload.array('images', 6),
  [
    body('title').notEmpty().isLength({ max: 150 }),
    body('price').isFloat({ gt: 0 }),
    body('type').optional().isIn(['house', 'apartment', 'office', 'shop', 'land', 'vehicle', 'other'])
  ],
  handleValidation,
  asyncHandler(async (req, res) => {
    const images = (req.files || []).map((f) => `/uploads/images/${f.filename}`);
    const item = await Rental.create({
      owner: req.user._id,
      title: req.body.title,
      description: req.body.description,
      type: req.body.type || 'house',
      price: Number(req.body.price),
      currency: req.body.currency || req.user.currency,
      period: req.body.period || 'month',
      location: req.body.location,
      images,
      contactPhone: req.body.contactPhone
    });
    res.status(201).json({ success: true, item });
  })
);

router.delete('/:id', requireAuth, asyncHandler(async (req, res) => {
  const item = await Rental.findById(req.params.id);
  if (!item) return res.status(404).json({ success: false, message: 'Rental not found' });
  if (!item.owner.equals(req.user._id) && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Forbidden' });
  }
  await item.deleteOne();
  res.json({ success: true, message: 'Rental removed' });
}));

module.exports = router;