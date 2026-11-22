const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const fs = require('fs');
const path = require('path');

const EducationResource = require('../models/EducationResource');
const Institution = require('../models/Institution');
const { requireAuth } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { handleValidation } = require('../middleware/validate');
const { pdfUpload, imageUpload } = require('../middleware/upload');

/* ---- Institutions ---- */
router.get('/institutions', asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.type) filter.type = req.query.type;
  const items = await Institution.find(filter).sort({ name: 1 });
  res.json({ success: true, items });
}));

router.post(
  '/institutions',
  requireAuth,
  [
    body('name').notEmpty(),
    body('type').isIn(['university', 'college', 'highschool', 'primaryschool'])
  ],
  handleValidation,
  asyncHandler(async (req, res) => {
    const item = await Institution.create(req.body);
    res.status(201).json({ success: true, item });
  })
);

router.delete('/institutions/:id', requireAuth, asyncHandler(async (req, res) => {
  await Institution.deleteOne({ _id: req.params.id });
  res.json({ success: true });
}));

/* ---- Library ---- */
router.get('/library', asyncHandler(async (req, res) => {
  const filter = { isActive: true };
  if (req.query.free === 'true') filter.price = 0;
  if (req.query.paid === 'true') filter.price = { $gt: 0 };
  if (req.query.category) filter.category = req.query.category;
  if (req.query.q) filter.title = new RegExp(req.query.q, 'i');
  const items = await EducationResource.find(filter).sort({ createdAt: -1 });
  res.json({ success: true, items });
}));

router.post(
  '/library',
  requireAuth,
  pdfUpload.single('pdf'),
  imageUpload.single('cover'),
  [
    body('title').notEmpty().isLength({ max: 120 })
  ],
  handleValidation,
  asyncHandler(async (req, res) => {
    if (!req.files || !req.files.pdf || !req.files.pdf[0]) {
      return res.status(422).json({ success: false, message: 'PDF file is required' });
    }
    const pdf = req.files.pdf[0];
    const cover = req.files.cover && req.files.cover[0];

    const item = await EducationResource.create({
      uploader: req.user._id,
      title: req.body.title,
      author: req.body.author,
      price: Number(req.body.price || 0),
      category: req.body.category || 'general',
      coverUrl: cover ? `/uploads/images/${cover.filename}` : null,
      pdfUrl: `/uploads/pdfs/${pdf.filename}`,
      fileName: pdf.originalname,
      fileSize: pdf.size
    });

    res.status(201).json({ success: true, item });
  })
);

router.get('/library/:id/download', asyncHandler(async (req, res) => {
  const item = await EducationResource.findById(req.params.id);
  if (!item || !item.pdfUrl) return res.status(404).json({ success: false, message: 'Resource not found' });
  const filePath = path.join(process.cwd(), item.pdfUrl.replace(/^\//, ''));
  if (!fs.existsSync(filePath)) return res.status(404).json({ success: false, message: 'File missing on server' });
  item.downloads += 1;
  await item.save();
  res.download(filePath, item.fileName || `${item.title}.pdf`);
}));

module.exports = router;