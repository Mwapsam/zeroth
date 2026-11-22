const express = require('express');
const { body } = require('express-validator');
const router = express.Router();

const User = require('../models/User');
const { requireAuth, requireRole } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { handleValidation } = require('../middleware/validate');
const { CURRENCIES } = require('../config/constants');
const { currencyForCountry } = require('../utils/currency');

router.get('/me', requireAuth, (req, res) => {
  res.json({ success: true, user: req.user.toSafeJSON() });
});

router.patch(
  '/me',
  requireAuth,
  [
    body('fullName').optional().isLength({ min: 2, max: 120 }),
    body('country').optional().isIn(Object.keys(CURRENCIES)),
    body('avatar').optional().isLength({ max: 500 })
  ],
  handleValidation,
  asyncHandler(async (req, res) => {
    const { fullName, country, avatar } = req.body;
    if (fullName !== undefined) req.user.fullName = fullName;
    if (avatar !== undefined) req.user.avatar = avatar;
    if (country !== undefined) {
      req.user.country = country;
      req.user.currency = currencyForCountry(country).code;
    }
    await req.user.save();
    res.json({ success: true, user: req.user.toSafeJSON() });
  })
);

// Admin: list all users
router.get('/admin/users', requireAuth, requireRole('admin'), asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page || '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || '20', 10)));
  const filter = {};
  if (req.query.role) filter.role = req.query.role;
  if (req.query.q) {
    const rx = new RegExp(req.query.q, 'i');
    filter.$or = [{ email: rx }, { phone: rx }, { fullName: rx }];
  }
  const [items, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    User.countDocuments(filter)
  ]);
  res.json({ success: true, total, page, limit, items: items.map((u) => u.toSafeJSON()) });
}));

module.exports = router;