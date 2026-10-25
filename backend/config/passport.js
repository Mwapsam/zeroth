const jwt = require('jsonwebtoken');

if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
    throw new Error('❌ JWT_SECRET must be set in production');
}
const SECRET = process.env.JWT_SECRET || 'change-me';
const EXPIRES_IN = process.env.JWT_EXPIRE || '30d';

exports.signToken = (user) =>
    jwt.sign({ id: user._id, role: user.role }, SECRET, { expiresIn: EXPIRES_IN });

exports.verifyToken = (token) => jwt.verify(token, SECRET);

exports.extractToken = (req) => {
    const h = req.headers.authorization || '';
    return h.startsWith('Bearer ') ? h.slice(7).trim() : null;
};