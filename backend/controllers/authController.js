const User = require('../models/User');
const { signToken } = require('../config/passport');
const { asyncHandler } = require('../utils/helpers');

exports.register = asyncHandler(async (req, res) => {
    const { name, email, password, phone, country } = req.body;
    if (await User.findOne({ email })) {
        return res.status(409).json({ success: false, message: 'Email already registered' });
    }
    const user = await User.create({ name, email, password, phone, country });
    res.status(201).json({
        success: true, message: 'Account created',
        token: signToken(user), user: user.toPublic()
    });
});

exports.login = asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.comparePassword(password))) {
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    user.lastLoginAt = new Date();
    await user.save({ validateBeforeSave: false });
    res.json({
        success: true, message: 'Login successful',
        token: signToken(user), user: user.toPublic()
    });
});

exports.me = asyncHandler(async (req, res) => {
    res.json({ success: true, user: req.user.toPublic() });
});

exports.updateMe = asyncHandler(async (req, res) => {
    const allowed = ['name', 'phone', 'country', 'avatar', 'bio', 'preferences'];
    const updates = {};
    for (const k of allowed) if (k in req.body) updates[k] = req.body[k];
    const user = await User.findByIdAndUpdate(req.user._id, updates, {
        new: true, runValidators: true
    });
    res.json({ success: true, user: user.toPublic() });
});

exports.changePassword = asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id).select('+password');
    if (!(await user.comparePassword(currentPassword))) {
        return res.status(401).json({ success: false, message: 'Current password incorrect' });
    }
    user.password = newPassword;
    await user.save();
    res.json({ success: true, message: 'Password updated' });
});

exports.toggleFavorite = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const user = await User.findById(req.user._id);
    const idx = user.favorites.indexOf(id);
    if (idx === -1) user.favorites.push(id);
    else user.favorites.splice(idx, 1);
    await user.save();
    res.json({ success: true, favorites: user.favorites });
});

exports.toggleWatchlist = asyncHandler(async (req, res) => {
    const s = req.params.symbol.toUpperCase();
    const user = await User.findById(req.user._id);
    const idx = user.etfWatchlist.indexOf(s);
    if (idx === -1) user.etfWatchlist.push(s);
    else user.etfWatchlist.splice(idx, 1);
    await user.save();
    res.json({ success: true, watchlist: user.etfWatchlist });
});