const express = require('express');
const { body } = require('express-validator');
const router = express.Router();

const User = require('../models/User');
const Wallet = require('../models/Wallet');
const AuditLog = require('../models/AuditLog');
const { currencyForCountry } = require('../utils/currency');
const { signAccess, signRefresh, verifyRefresh } = require('../utils/token');
const { handleValidation } = require('../middleware/validate');
const { authLimiter } = require('../middleware/rateLimiter');
const { asyncHandler } = require('../middleware/errorHandler');
const { requireAuth } = require('../middleware/auth');
const { sendMail } = require('../utils/mailer');
const { CURRENCIES } = require('../config/constants');

/* -------------------- REGISTER -------------------- */
router.post(
  '/register',
  authLimiter,
  [
    body('country').isIn(Object.keys(CURRENCIES)).withMessage('Invalid country'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('fullName').optional().isLength({ min: 2, max: 120 }),
    body('identifier').notEmpty().withMessage('Phone or email is required')
  ],
  handleValidation,
  asyncHandler(async (req, res) => {
    const { country, password, fullName, identifier, mode } = req.body;
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier);

    const existing = await User.findOne(isEmail ? { email: identifier.toLowerCase() } : { phone: identifier });
    if (existing) {
      return res.status(409).json({ success: false, message: 'An account with this identifier already exists' });
    }

    const passwordHash = await User.hashPassword(password);
    const curr = currencyForCountry(country);

    const user = await User.create({
      fullName: fullName || 'User',
      email: isEmail ? identifier.toLowerCase() : undefined,
      phone: !isEmail ? identifier : undefined,
      passwordHash,
      country,
      currency: curr.code
    });

    await Wallet.create({ user: user._id, currency: curr.code, balance: 0 });

    await AuditLog.create({
      actor: user._id,
      action: 'user.register',
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });

    sendMail({
      to: user.email || `${user.phone}@placeholder.local`,
      subject: 'Welcome to Zeroth Business Solutions',
      text: `Hi ${user.fullName}, your account is ready. Currency: ${curr.code}.`
    }).catch(() => {});

    const accessToken = signAccess(user);
    const refreshToken = signRefresh(user);
    user.refreshTokens.push({ token: refreshToken });
    await user.save();

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      user: user.toSafeJSON(),
      currency: curr,
      accessToken,
      refreshToken
    });
  })
);

/* -------------------- LOGIN -------------------- */
router.post(
  '/login',
  authLimiter,
  [
    body('identifier').notEmpty(),
    body('password').notEmpty()
  ],
  handleValidation,
  asyncHandler(async (req, res) => {
    const { identifier, password } = req.body;
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier);
    const query = isEmail ? { email: identifier.toLowerCase() } : { phone: identifier };

    const user = await User.findOne(query).select('+passwordHash');
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    if (!user.isActive) {
      return res.status(403).json({ success: false, message: 'Account is disabled' });
    }

    user.lastLoginAt = new Date();
    const accessToken = signAccess(user);
    const refreshToken = signRefresh(user);
    user.refreshTokens.push({ token: refreshToken });
    if (user.refreshTokens.length > 10) user.refreshTokens = user.refreshTokens.slice(-10);
    await user.save();

    const wallet = await Wallet.findOne({ user: user._id });

    res.json({
      success: true,
      message: 'Login successful',
      user: user.toSafeJSON(),
      wallet: wallet ? { currency: wallet.currency, balance: wallet.balance } : null,
      accessToken,
      refreshToken
    });
  })
);

/* -------------------- REFRESH -------------------- */
router.post(
  '/refresh',
  [body('refreshToken').notEmpty()],
  handleValidation,
  asyncHandler(async (req, res) => {
    try {
      const payload = verifyRefresh(req.body.refreshToken);
      const user = await User.findById(payload.sub);
      if (!user) return res.status(401).json({ success: false, message: 'Invalid refresh token' });

      const known = user.refreshTokens.some((t) => t.token === req.body.refreshToken);
      if (!known) return res.status(401).json({ success: false, message: 'Refresh token revoked' });

      const accessToken = signAccess(user);
      const refreshToken = signRefresh(user);
      user.refreshTokens = user.refreshTokens.filter((t) => t.token !== req.body.refreshToken);
      user.refreshTokens.push({ token: refreshToken });
      await user.save();

      res.json({ success: true, accessToken, refreshToken });
    } catch {
      res.status(401).json({ success: false, message: 'Invalid or expired refresh token' });
    }
  })
);

/* -------------------- LOGOUT -------------------- */
router.post('/logout', requireAuth, asyncHandler(async (req, res) => {
  const { refreshToken } = req.body || {};
  if (refreshToken) {
    req.user.refreshTokens = req.user.refreshTokens.filter((t) => t.token !== refreshToken);
    await req.user.save();
  }
  res.json({ success: true, message: 'Logged out' });
}));

/* -------------------- ME -------------------- */
router.get('/me', requireAuth, asyncHandler(async (req, res) => {
  const wallet = await Wallet.findOne({ user: req.user._id });
  res.json({
    success: true,
    user: req.user.toSafeJSON(),
    wallet: wallet ? { currency: wallet.currency, balance: wallet.balance } : null
  });
}));

/* -------------------- CHANGE PASSWORD -------------------- */
router.post(
  '/change-password',
  requireAuth,
  [body('currentPassword').notEmpty(), body('newPassword').isLength({ min: 6 })],
  handleValidation,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id).select('+passwordHash');
    if (!(await user.comparePassword(req.body.currentPassword))) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect' });
    }
    user.passwordHash = await User.hashPassword(req.body.newPassword);
    user.refreshTokens = [];
    await user.save();
    res.json({ success: true, message: 'Password updated. Please log in again.' });
  })
);

/* -------------------- FORGOT PASSWORD (stub) -------------------- */
router.post('/forgot-password', authLimiter, [body('identifier').notEmpty()], handleValidation,
  asyncHandler(async (req, res) => {
    // In production: generate token, store hashed token with expiry, send email/SMS.
    res.json({ success: true, message: 'If an account exists, a reset link has been sent.' });
  })
);

module.exports = router;