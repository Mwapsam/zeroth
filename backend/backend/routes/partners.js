const express = require('express');
const { body } = require('express-validator');
const router = express.Router();

const Partner = require('../models/Partner');
const PartnerApplication = require('../models/PartnerApplication');
const BecomePartnerApplication = require('../models/BecomePartnerApplication');
const { optionalAuth, requireAuth, requireRole } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { handleValidation } = require('../middleware/validate');

router.get('/', asyncHandler(async (req, res) => {
  const filter = { isActive: true };
  if (req.query.category) filter.category = req.query.category;
  const items = await Partner.find(filter).sort({ displayOrder: 1, name: 1 });
  res.json({ success: true, items });
}));

router.get('/:code', asyncHandler(async (req, res) => {
  const partner = await Partner.findOne({ code: req.params.code, isActive: true });
  if (!partner) return res.status(404).json({ success: false, message: 'Partner not found' });
  res.json({ success: true, partner });
}));

router.post(
  '/apply',
  optionalAuth,
  [
    body('fullName').notEmpty(),
    body('email').isEmail(),
    body('phone').notEmpty(),
    body('serviceRequired').notEmpty()
  ],
  handleValidation,
  asyncHandler(async (req, res) => {
    const b = req.body;
    let partner = null;
    if (b.partnerCode) partner = await Partner.findOne({ code: b.partnerCode });

    const app = await PartnerApplication.create({
      partner: partner ? partner._id : undefined,
      applicantUser: req.authPayload ? req.authPayload.sub : undefined,
      fullName: b.fullName,
      email: b.email,
      phone: b.phone,
      serviceRequired: b.serviceRequired,
      notes: b.notes
    });

    res.status(201).json({ success: true, message: 'Application submitted', application: app });
  })
);

router.post(
  '/become',
  [
    body('companyName').notEmpty().isLength({ max: 120 }),
    body('category').notEmpty(),
    body('city').notEmpty(),
    body('contactName').notEmpty(),
    body('email').isEmail(),
    body('phone').notEmpty(),
    body('services').notEmpty().isLength({ max: 500 })
  ],
  handleValidation,
  asyncHandler(async (req, res) => {
    const app = await BecomePartnerApplication.create(req.body);
    res.status(201).json({ success: true, message: 'Partnership application received', application: app });
  })
);

router.get('/admin/applications', requireAuth, requireRole('admin'), asyncHandler(async (req, res) => {
  const [become, requests] = await Promise.all([
    BecomePartnerApplication.find().sort({ createdAt: -1 }).limit(200),
    PartnerApplication.find().sort({ createdAt: -1 }).limit(200)
  ]);
  res.json({ success: true, becomePartner: become, partnerRequests: requests });
}));

module.exports = router;