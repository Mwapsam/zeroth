/* ============================================================
   AUTH CONTROLLER — controllers/authController.js
   Endpoints for register / login / me / profile / favorites
   ============================================================ */
const User = require('../models/User');
const { signToken } = require('../config/passport');
const { asyncHandler } = require('../utils/helpers');

/* ---------- Helpers ---------- */
function publicUser(user) {
    return typeof user.toPublic === 'function' ? user.toPublic() : {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        wallet: user.wallet
    };
}

/* ============================================================
   REGISTER
   ============================================================ */
exports.register = asyncHandler(async (req, res) => {
    const { name, email, password, phone, country } = req.body || {};

    if (!name || !email || !password) {
        return res.status(400).json({
            success: false,
            message: 'name, email and password are required'
        });
    }

    const exists = await User.findOne({ email: String(email).toLowerCase() });
    if (exists) {
        return res.status(409).json({
            success: false,
            message: 'Email already registered'
        });
    }

    const user = await User.create({
        name: String(name).trim(),
        email: String(email).toLowerCase().trim(),
        password,
        phone: phone || '',
        country: country || 'ZM'
    });

    res.status(201).json({
        success: true,
        message: 'Account created',
        token: signToken(user),
        user: publicUser(user)
    });
});

/* ============================================================
   LOGIN
   ============================================================ */
exports.login = asyncHandler(async (req, res) => {
    const { email, password } = req.body || {};

    if (!email || !password) {
        return res.status(400).json({
            success: false,
            message: 'email and password are required'
        });
    }

    const user = await User.findOne({ email: String(email).toLowerCase() })
        .select('+password');

    if (!user || !(await user.comparePassword(password))) {
        return res.status(401).json({
            success: false,
            message: 'Invalid credentials'
        });
    }

    user.lastLoginAt = new Date();
    await user.save({ validateBeforeSave: false });

    res.json({
        success: true,
        message: 'Login successful',
        token: signToken(user),
        user: publicUser(user)
    });
});

/* ============================================================
   ME
   ============================================================ */
exports.me = asyncHandler(async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ success: false, message: 'Not authenticated' });
    }
    res.json({ success: true, user: publicUser(req.user) });
});

/* ============================================================
   UPDATE PROFILE
   ============================================================ */
exports.updateMe = asyncHandler(async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    const allowed = ['name', 'phone', 'country', 'avatar', 'bio', 'preferences'];
    const updates = {};
    for (const k of allowed) {
        if (k in (req.body || {})) updates[k] = req.body[k];
    }

    const user = await User.findByIdAndUpdate(req.user._id, updates, {
        new: true,
        runValidators: true
    });

    res.json({ success: true, user: publicUser(user) });
});

/* ============================================================
   CHANGE PASSWORD
   ============================================================ */
exports.changePassword = asyncHandler(async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    const { currentPassword, newPassword } = req.body || {};
    if (!currentPassword || !newPassword) {
        return res.status(400).json({
            success: false,
            message: 'currentPassword and newPassword are required'
        });
    }
    if (String(newPassword).length < 6) {
        return res.status(400).json({
            success: false,
            message: 'newPassword must be at least 6 characters'
        });
    }

    const user = await User.findById(req.user._id).select('+password');
    if (!(await user.comparePassword(currentPassword))) {
        return res.status(401).json({
            success: false,
            message: 'Current password incorrect'
        });
    }

    user.password = newPassword;
    await user.save();

    res.json({ success: true, message: 'Password updated' });
});

/* ============================================================
   FAVORITES
   ============================================================ */
exports.toggleFavorite = asyncHandler(async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    const { id } = req.params;
    const user = await User.findById(req.user._id);
    const idx = user.favorites.indexOf(id);

    if (idx === -1) user.favorites.push(id);
    else user.favorites.splice(idx, 1);

    await user.save();
    res.json({ success: true, favorites: user.favorites });
});

/* ============================================================
   ETF WATCHLIST
   ============================================================ */
exports.toggleWatchlist = asyncHandler(async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    const s = String(req.params.symbol || '').toUpperCase();
    if (!s) {
        return res.status(400).json({ success: false, message: 'Symbol required' });
    }

    const user = await User.findById(req.user._id);
    const idx = user.etfWatchlist.indexOf(s);

    if (idx === -1) user.etfWatchlist.push(s);
    else user.etfWatchlist.splice(idx, 1);

    await user.save();
    res.json({ success: true, watchlist: user.etfWatchlist });
});