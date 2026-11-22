/* ============================================================
   AUTH MIDDLEWARE — middleware/auth.js
   ------------------------------------------------------------
   Exports:
     protect          → alias of requireAuth  (legacy)
     optionalAuth     → attach req.user or null, never rejects
     restrictTo(...r) → alias of requireRole  (legacy)
     requireAdminKey  → 403 if x-admin-key missing/wrong

   v2 changes:
     • Delegates to config/passport.js requireAuth / optionalAuth /
       requireRole — the single source of truth.
     • Backwards-compatible aliases so every existing route file
       keeps working without edits.
     • `requireAdminKey` now accepts BOTH `ADMIN_KEY` and the
       legacy `ADMIN_ACCESS_KEY` env var. Constant-time compare.
     • `optionalAuth` no longer leaves `req.user` as a Mongoose
       doc that could be mutated by accident — it's a lean
       projection (`select('-password')`).
     • 401 message keys are stable (`{ success:false, message }`)
       so the frontend's `js/api.js` can surface them.
   ============================================================ */

'use strict';

const crypto = require('crypto');
const {
    requireAuth,
    optionalAuth,
    requireRole
} = require('../config/passport');

/* ============================================================
   PRIMARY MIDDLEWARE — delegated from config/passport.js
   ============================================================ */
exports.protect        = requireAuth;      // legacy alias
exports.requireAuth    = requireAuth;

exports.optionalAuth   = optionalAuth;

exports.restrictTo     = (...roles) => requireRole(...roles);
exports.requireRole    = (...roles) => requireRole(...roles);

/* ============================================================
   ADMIN KEY
   ============================================================ */
/**
 * Require a valid admin access key in the `X-Admin-Key` header.
 * Accepts either `ADMIN_KEY` or the legacy `ADMIN_ACCESS_KEY`.
 * Uses a constant-time comparison to prevent timing attacks.
 */
exports.requireAdminKey = (req, res, next) => {
    const provided = req.headers['x-admin-key'];
    const expected =
        process.env.ADMIN_KEY ||
        process.env.ADMIN_ACCESS_KEY ||
        '';

    if (!provided || !expected) {
        return res.status(403).json({
            success: false,
            message: 'Admin key required'
        });
    }

    const providedBuf = Buffer.from(String(provided));
    const expectedBuf = Buffer.from(String(expected));

    let match = false;
    if (providedBuf.length === expectedBuf.length) {
        try {
            match = crypto.timingSafeEqual(providedBuf, expectedBuf);
        } catch (_) {
            match = false;
        }
    }

    if (!match) {
        return res.status(403).json({
            success: false,
            message: 'Invalid admin key'
        });
    }

    req.isAdminKey = true;
    next();
};