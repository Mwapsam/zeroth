const express = require('express');
const { body } = require('express-validator');
const router = express.Router();

const LoanApplication = require('../models/LoanApplication');
const { requireAuth, requireRole } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { handleValidation } = require('../middleware/validate');

function monthlyPayment(principal, annualRatePct, months) {
  const r = annualRatePct / 100 / 12;
  if (r === 0) return principal / months;
  return (principal * r) / (1 - Math.pow(1 + r, -months));
}

router.post('/loan-calculator', (req, res) => {
  const amount = Number(req.body.amount || 0);
  const termMonths = Number(req.body.termMonths || 0);
  const rate = Number(req.body.interestRate || 0);
  if (!(amount > 0 && termMonths > 0 && rate >= 0)) {
    return res.status(422).json({ success: false, message: 'Invalid inputs' });
  }
  const payment = monthlyPayment(amount, rate, termMonths);
  const total = payment * termMonths;
  res.json({
    success: true,
    monthlyPayment: Math.round(payment * 100) / 100,
    totalRepayment: Math.round(total * 100) / 100,
    totalInterest: Math.round((total - amount) * 100) / 100
  });
});

router.post(
  '/loans/apply',
  requireAuth,
  [
    body('amount').isFloat({ gt: 0 }),
    body('termMonths').isInt({ min: 1, max: 120 }),
    body('interestRate').isFloat({ min: 0 })
  ],
  handleValidation,
  asyncHandler(async (req, res) => {
    const { amount, termMonths, interestRate, purpose } = req.body;
    const payment = monthlyPayment(Number(amount), Number(interestRate), Number(termMonths));
    const app = await LoanApplication.create({
      user: req.user._id,
      amount: Number(amount),
      termMonths: Number(termMonths),
      interestRate: Number(interestRate),
      monthlyPayment: Math.round(payment * 100) / 100,
      purpose
    });
    res.status(201).json({ success: true, application: app });
  })
);

router.get('/loans/my', requireAuth, asyncHandler(async (req, res) => {
  const items = await LoanApplication.find({ user: req.user._id }).sort({ createdAt: -1 });
  res.json({ success: true, items });
}));

router.patch(
  '/loans/:id/review',
  requireAuth,
  requireRole('admin'),
  [body('status').isIn(['pending', 'approved', 'rejected', 'disbursed', 'repaid', 'defaulted'])],
  handleValidation,
  asyncHandler(async (req, res) => {
    const app = await LoanApplication.findById(req.params.id);
    if (!app) return res.status(404).json({ success: false, message: 'Loan not found' });
    app.status = req.body.status;
    app.adminNote = req.body.adminNote || app.adminNote;
    app.reviewedBy = req.user._id;
    app.reviewedAt = new Date();
    if (req.body.status === 'disbursed') app.disbursedAt = new Date();
    await app.save();
    res.json({ success: true, application: app });
  })
);

module.exports = router;