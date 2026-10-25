const User = require('../models/User');
const { verifyToken, extractToken } = require('../config/passport');

exports.protect = async (req, res, next) => {
    try {
        const token = extractToken(req);
        if (!token) return res.status(401).json({ success: false, message: 'Not authenticated' });

        const decoded = verifyToken(token);
        const user = await User.findById(decoded.id);
        if (!user) return res.status(401).json({ success: false, message: 'User not found' });

        req.user = user;
        next();
    } catch {
        res.status(401).json({ success: false, message: 'Invalid or expired token' });
    }
};

exports.optionalAuth = async (req, _res, next) => {
    try {
        const token = extractToken(req);
        if (token) {
            const decoded = verifyToken(token);
            req.user = await User.findById(decoded.id);
        }
    } catch { /* ignore */ }
    next();
};

exports.restrictTo = (...roles) => (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
        return res.status(403).json({ success: false, message: 'Insufficient permissions' });
    }
    next();
};

exports.requireAdminKey = (req, res, next) => {
    const key = req.headers['x-admin-key'];
    if (!key || key !== process.env.ADMIN_ACCESS_KEY) {
        return res.status(403).json({ success: false, message: 'Invalid admin key' });
    }
    next();
};