const express = require('express');
const { body } = require('express-validator');
const router = express.Router();

const ProHire = require('../models/ProHire');
const { requireAuth } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { handleValidation } = require('../middleware/validate');
const { imageUpload } = require('../middleware/upload');

router.get('/', asyncHandler(async (req, res) => {
  const filter = { isActive: true };
  if (req.query.kind) filter.kind = req.query.kind;
  if (req.query.q) filter.title = new RegExp(req.query.q, 'i');
  const items = await ProHire.find(filter).sort({ createdAt: -1 }).limit(200);
  res.json({ success: true, items });
}));

router.post(
  '/',
  requireAuth,
  imageUpload.array('images', 6),
  [body('title').notEmpty()],
  handleValidation,
  asyncHandler(async (req, res) => {
    const images = (req.files || []).map((f) => `/uploads/images/${f.filename}`);
    const item = await ProHire.create({
      user: req.user._id,
      kind: req.body.kind || 'service',
      title: req.body.title,
      description: req.body.description,
      category: req.body.category,
      price: req.body.price ? Number(req.body.price) : undefined,
      currency: req.body.currency || req.user.currency,
      location: req.body.location,
      contactPhone: req.body.contactPhone,
      images
    });
    res.status(201).json({ success: true, item });
  })
);

module.exports = router;