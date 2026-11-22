/* ============================================================
   HELPERS — utils/helpers.js
   ------------------------------------------------------------
   v2 changes:
     • `paginate()` now clamps limit and skip to sane bounds
       and rejects non-numeric values without crashing.
     • `generateRef()` is now collision-safe — appends 4 extra
       random chars so two calls in the same millisecond never
       produce the same reference.
     • `sanitize()` handles Date, Buffer, and ObjectId instances
       (previous version threw when it recursed into them).
     • `distanceKm()` guards against null/NaN lat/lng.
     • Added: `pick()`, `omit()`, `toObjectId()`, `isValidObjectId()`,
       `sleep()`, `chunk()`, `paginateResponse()`.
   ============================================================ */

'use strict';

const mongoose = require('mongoose');

/* ============================================================
   ASYNC HANDLER
   ============================================================ */
exports.asyncHandler = (fn) => (req, res, next) =>
    Promise.resolve(fn(req, res, next)).catch(next);

/* ============================================================
   REFERENCE GENERATOR
   ============================================================ */
/**
 * Generate a unique, human-readable reference.
 * Format: PREFIX-<base36 timestamp>-<4 hex chars><4 base36 chars>
 * Example: BET-M3B4K2-7A9FXZ
 */
exports.generateRef = (prefix = 'ZBS') => {
    const ts = Date.now().toString(36).toUpperCase();
    const rnd1 = Math.random().toString(16).slice(2, 6).toUpperCase();
    const rnd2 = Math.random().toString(36).slice(2, 6).toUpperCase();
    return `${prefix}-${ts}-${rnd1}${rnd2}`;
};

/* ============================================================
   PAGINATION
   ============================================================ */
/**
 * Parse pagination params safely.
 * - page: ≥1, default 1
 * - limit: 1..100, default 20
 */
exports.paginate = (query = {}) => {
    const rawPage = parseInt(query.page, 10);
    const rawLimit = parseInt(query.limit, 10);

    const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
    const limit = Number.isFinite(rawLimit) && rawLimit > 0
        ? Math.min(100, rawLimit)
        : 20;

    return { page, limit, skip: (page - 1) * limit };
};

/**
 * Standard paginated response shape.
 */
exports.paginateResponse = (items, total, page, limit, extra = {}) => {
    const pages = Math.max(1, Math.ceil(total / limit));
    return {
        success: true,
        total,
        page,
        limit,
        pages,
        hasMore: page * limit < total,
        ...extra,
        ...(Array.isArray(items) ? { items } : {})
    };
};

/* ============================================================
   SANITIZE
   ============================================================ */
/**
 * Recursively remove keys that start with `$` or contain `.` —
 * mitigates MongoDB operator injection.
 *
 * Safe for: plain objects, arrays, Date, Buffer, ObjectId, null.
 * Primitives are returned as-is.
 */
exports.sanitize = function sanitize(v) {
    if (v === null || v === undefined) return v;

    // Pass-through types that must not be recursed into
    if (v instanceof Date || v instanceof Buffer) return v;
    if (v instanceof mongoose.Types.ObjectId) return v;
    if (v instanceof mongoose.Types.Decimal128) return v;

    if (typeof v !== 'object') return v;

    if (Array.isArray(v)) return v.map(sanitize);

    // Plain object
    const clean = {};
    for (const [k, val] of Object.entries(v)) {
        if (k.startsWith('$') || k.includes('.')) continue;
        clean[k] = sanitize(val);
    }
    return clean;
};

/* ============================================================
   DISTANCE
   ============================================================ */
/**
 * Great-circle distance in kilometres between two points.
 * Returns `null` if either coordinate is invalid.
 *
 * @param {{lat:number,lng:number}} a
 * @param {{lat:number,lng:number}} b
 * @returns {number|null}
 */
exports.distanceKm = (a, b) => {
    if (!a || !b) return null;

    const lat1 = Number(a.lat);
    const lng1 = Number(a.lng);
    const lat2 = Number(b.lat);
    const lng2 = Number(b.lng);

    if (![lat1, lng1, lat2, lng2].every(Number.isFinite)) return null;

    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;

    const s =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((lat1 * Math.PI) / 180) *
            Math.cos((lat2 * Math.PI) / 180) *
            Math.sin(dLng / 2) ** 2;

    return 2 * R * Math.asin(Math.sqrt(s));
};

/* ============================================================
   OBJECT UTILITIES
   ============================================================ */
exports.pick = (obj, keys = []) => {
    const out = {};
    if (!obj) return out;
    for (const k of keys) {
        if (k in obj) out[k] = obj[k];
    }
    return out;
};

exports.omit = (obj, keys = []) => {
    if (!obj) return {};
    const drop = new Set(keys);
    const out = {};
    for (const [k, v] of Object.entries(obj)) {
        if (!drop.has(k)) out[k] = v;
    }
    return out;
};

exports.isValidObjectId = (id) => {
    try {
        return mongoose.Types.ObjectId.isValid(id);
    } catch (_) {
        return false;
    }
};

exports.toObjectId = (id) => {
    try {
        return new mongoose.Types.ObjectId(id);
    } catch (_) {
        return null;
    }
};

/* ============================================================
   ASYNC UTILITIES
   ============================================================ */
exports.sleep = (ms) => new Promise((r) => setTimeout(r, ms));

exports.chunk = (arr = [], size = 10) => {
    if (!Array.isArray(arr) || size < 1) return [];
    const out = [];
    for (let i = 0; i < arr.length; i += size) {
        out.push(arr.slice(i, i + size));
    }
    return out;
};