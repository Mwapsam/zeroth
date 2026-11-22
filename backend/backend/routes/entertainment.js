const express = require('express');
const { body } = require('express-validator');
const router = express.Router();

const EntertainmentItem = require('../models/EntertainmentItem');
const TVStation = require('../models/TVStation');
const { requireAuth, requireRole } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { handleValidation } = require('../middleware/validate');
const { mediaUpload, imageUpload } = require('../middleware/upload');

router.get('/items', asyncHandler(async (req, res) => {
  const filter = { isApproved: true };
  if (req.query.category) filter.category = req.query.category;
  if (req.query.q) filter.title = new RegExp(req.query.q, 'i');
  const items = await EntertainmentItem.find(filter).sort({ createdAt: -1 }).limit(200);
  res.json({ success: true, items });
}));

router.post(
  '/items',
  requireAuth,
  mediaUpload.single('media'),
  imageUpload.single('thumbnail'),
  [
    body('title').notEmpty(),
    body('category').isIn(['cartoons', 'music', 'movies', 'sports'])
  ],
  handleValidation,
  asyncHandler(async (req, res) => {
    if (!req.file) return res.status(422).json({ success: false, message: 'Media file is required' });
    const item = await EntertainmentItem.create({
      uploader: req.user._id,
      title: req.body.title,
      category: req.body.category,
      description: req.body.description,
      mediaUrl: `/uploads/media/${req.file.filename}`,
      thumbnailUrl: req.files && req.files.thumbnail ? `/uploads/images/${req.files.thumbnail[0].filename}` : null,
      duration: req.body.duration ? Number(req.body.duration) : undefined,
      isApproved: req.user.role === 'admin'
    });
    res.status(201).json({ success: true, item });
  })
);

router.patch(
  '/items/:id/approve',
  requireAuth,
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const item = await EntertainmentItem.findByIdAndUpdate(req.params.id, { isApproved: true }, { new: true });
    if (!item) return res.status(404).json({ success: false, message: 'Item not found' });
    res.json({ success: true, item });
  })
);

/* ---- TV stations ---- */
router.get('/tv', asyncHandler(async (req, res) => {
  const items = await TVStation.find({ isActive: true }).sort({ createdAt: -1 });
  res.json({ success: true, items });
}));

router.post(
  '/tv',
  requireAuth,
  [body('name').notEmpty().isLength({ max: 60 })],
  handleValidation,
  asyncHandler(async (req, res) => {
    const item = await TVStation.create({
      name: req.body.name,
      type: req.body.type || 'streaming',
      url: req.body.url,
      icon: req.body.icon || '📺',
      addedBy: req.user._id
    });
    res.status(201).json({ success: true, item });
  })
);

router.delete('/tv/:id', requireAuth, asyncHandler(async (req, res) => {
  await TVStation.deleteOne({ _id: req.params.id });
  res.json({ success: true });
}));

module.exports = router;