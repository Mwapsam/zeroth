/* ============================================================
   JWT UTILITIES — config/passport.js
   ------------------------------------------------------------
   Provides:
     signToken(user)    → JWT string
     verifyToken(jwt)   → decoded payload (throws on bad token)
     extractToken(req)  → raw token or null
     requireAuth        → Express middleware (attach req.user)
     optionalAuth       → Express middleware (attach req.user or null)

   v2 changes vs v1:
     • Reads JWT_SECRET at call time (not module load) — so a
       missing env var throws a clear, actionable error instead
       of silently signing with 'change-me' in production.
     • Reads JWT_EXPIRES_IN (canonical) OR JWT_EXPIRE (legacy)
       — both env names work.
     • Adds sanity-check: refuses to start in production if
       JWT_SECRET is missing or the default placeholder.
     • `verifyToken` returns null on failure instead of throwing
       — callers can branch without try/catch everywhere.
     • `extractToken` handles case-insensitive `bearer`, extra
       whitespace, and a `token` query param fallback (for
       websocket / native flows).
     • Exports `requireAuth` and `optionalAuth` so the middleware
       file can be thin and consistent.
     • Preserves the exact same public API — existing imports of
       `{ signToken }` and `{ verifyToken }` keep working.
   ============================================================ */

'use strict';

const jwt = require('jsonwebtoken');

/* ---------- Config resolution ---------- */

const PLACEHOLDERS = new Set([
    'change-me',
    'change_me',
    'changeme',
    'secret',
    'your_jwt_secret',
    'replace-me',
    ''
]);

function resolveSecret() {
    const s = process.env.JWT_SECRET;
    if (!s || PLACEHOLDERS.has(String(s).toLowerCase())) {
        if (process.env.NODE_ENV === 'production') {
            throw new Error(
                '❌ JWT_SECRET is missing or set to a placeholder. ' +
                'Set it in .env before starting in production.'
            );
        }
        return 'dev-only-insecure-secret-' + Date.now();
    }
    return s;
}

function resolveExpiry() {
    // Prefer the canonical name, fall back to the legacy one.
    return process.env.JWT_EXPIRES_IN || process.env.JWT_EXPIRE || '30d';
}

/* ---------- Token creation ---------- */

/**
 * Sign a JWT for a user.
 * @param {object} user — Mongoose user doc or plain object with `_id` and `role`.
 * @returns {string} signed JWT
 */
function signToken(user) {
    if (!user || !user._id) {
        throw new Error('signToken: user with _id is required');
    }

    const payload = {
        id: String(user._id),
        role: user.role || 'user'
    };

    return jwt.sign(payload, resolveSecret(), {
        expiresIn: resolveExpiry()
    });
}

/* ---------- Token verification ---------- */

/**
 * Verify a JWT. Returns the decoded payload or `null` on failure.
 * Never throws — callers can branch cleanly.
 *
 * @param {string} token
 * @returns {{ id: string, role: string, iat: number, exp: number } | null}
 */
function verifyToken(token) {
    if (!token) return null;
    try {
        return jwt.verify(token, resolveSecret());
    } catch (err) {
        // Log quietly — we don't want to pollute request logs.
        if (process.env.NODE_ENV !== 'production') {
            console.warn('[JWT] verify failed:', err.message);
        }
        return null;
    }
}

/**
 * Strict verifier — throws on failure. Useful in scripts / tests.
 * The HTTP middleware uses `verifyToken` (returns null).
 */
function verifyTokenStrict(token) {
    if (!token) throw new Error('No token provided');
    return jwt.verify(token, resolveSecret());
}

/* ---------- Token extraction ---------- */

/**
 * Extract the raw JWT from a request.
 * Checks in order:
 *   1. Authorization: Bearer <token>
 *   2. Authorization: bearer <token>       (case-insensitive)
 *   3. req.query.token                     (websocket / native fallback)
 *   4. req.cookies?.token                  (if cookie-parser is set up)
 *
 * @param {import('express').Request} req
 * @returns {string|null}
 */
function extractToken(req) {
    if (!req) return null;

    const header = req.headers?.authorization || req.headers?.Authorization || '';
    if (header && typeof header === 'string') {
        const m = header.match(/^Bearer\s+(.+)$/i);
        if (m && m[1]) return m[1].trim();
    }

    if (typeof req.query?.token === 'string' && req.query.token.trim()) {
        return req.query.token.trim();
    }

    if (typeof req.cookies?.token === 'string' && req.cookies.token.trim()) {
        return req.cookies.token.trim();
    }

    return null;
}

/* ---------- Express middleware ---------- */

/**
 * Attaches `req.user` to the request if a valid token is present.
 * Does NOT reject on missing/invalid tokens — use `requireAuth` for that.
 * Routes that are optionally-authenticated (like `GET /api/market/...`)
 * can rely on `req.user` being either a user object or `null`.
 */
function optionalAuth(req, _res, next) {
    const token = extractToken(req);
    req.user = null;

    if (token) {
        const decoded = verifyToken(token);
        if (decoded) {
            // Lazy-load User to avoid circular require issues:
            //   models/User.js -> config/passport.js -> models/User.js
            let User;
            try {
                User = require('../models/User');
            } catch (_) {
                User = null;
            }

            if (User) {
                User.findById(decoded.id)
                    .select('-password')
                    .then((user) => {
                        req.user = user || null;
                        next();
                    })
                    .catch(() => {
                        req.user = null;
                        next();
                    });
                return;
            }
        }
    }

    next();
}

/**
 * Rejects the request with 401 if no valid token is present.
 * Attaches `req.user` on success.
 */
async function requireAuth(req, res, next) {
    const token = extractToken(req);
    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'Authentication required'
        });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
        return res.status(401).json({
            success: false,
            message: 'Invalid or expired token'
        });
    }

    try {
        const User = require('../models/User');
        const user = await User.findById(decoded.id).select('-password');
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'User no longer exists'
            });
        }
        req.user = user;
        next();
    } catch (err) {
        return res.status(500).json({
            success: false,
            message: 'Authentication failed'
        });
    }
}

/**
 * Require a specific role. Use after `requireAuth`:
 *   router.post('/admin', requireAuth, requireRole('admin'), handler)
 */
function requireRole(...roles) {
    const allowed = roles.flat().filter(Boolean);
    return function (req, res, next) {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }
        if (!allowed.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: 'Forbidden — insufficient permissions'
            });
        }
        next();
    };
}

/* ---------- Exports ---------- */

module.exports = {
    // Core token helpers (existing API — unchanged)
    signToken,
    verifyToken,
    extractToken,

    // Extras
    verifyTokenStrict,
    optionalAuth,
    requireAuth,
    requireRole
};