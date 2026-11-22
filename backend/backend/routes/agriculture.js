const express = require('express');
const { body } = require('express-validator');
const router = express.Router();

const AgricultureListing = require('../models/AgricultureListing');
const { requireAuth } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { handleValidation } = require('../middleware/validate');
const { imageUpload } = require('../middleware/upload');

router.get('/', asyncHandler(async (req, res) => {
  const filter = { isActive: true };
  if (req.query.category) filter.category = req.query.category;
  if (req.query.q) filter.name = new RegExp(req.query.q, 'i');
  const items = await AgricultureListing.find(filter).sort({ createdAt: -1 }).limit(200);
  res.json({ success: true, items });
}));

router.post(
  '/',
  requireAuth,
  imageUpload.single('image'),
  [
    body('name').notEmpty().isLength({ max: 150 }),
    body('price').isFloat({ gt: 0 })
  ],
  handleValidation,
  asyncHandler(async (req, res) => {
    const item = await AgricultureListing.create({
      seller: req.user._id,
      name: req.body.name,
      category: req.body.category || 'produce',
      description: req.body.description,
      price: Number(req.body.price),
      unit: req.body.unit || 'kg',
      quantity: req.body.quantity ? Number(req.body.quantity) : undefined,
      location: req.body.location,
      imageUrl: req.file ? `/uploads/images/${req.file.filename}` : req.body.imageUrl
    });
    res.status(201).json({ success: true, item });
  })
);

router.delete('/:id', requireAuth, asyncHandler(async (req, res) => {
  const item = await AgricultureListing.findById(req.params.id);
  if (!item) return res.status(404).json({ success: false, message: 'Listing not found' });
  if (!item.seller.equals(req.user._id) && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Forbidden' });
  }
  await item.deleteOne();
  res.json({ success: true, message: 'Listing removed' });
}));

module.exports = router;