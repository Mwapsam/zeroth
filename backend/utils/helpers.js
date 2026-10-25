exports.asyncHandler = (fn) => (req, res, next) =>
    Promise.resolve(fn(req, res, next)).catch(next);

exports.generateRef = (prefix = 'ZBS') =>
    `${prefix}-${Date.now().toString(36).toUpperCase()}-${Math.random()
        .toString(36).slice(2, 6).toUpperCase()}`;

exports.paginate = (query) => {
    const page = Math.max(1, parseInt(query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));
    return { page, limit, skip: (page - 1) * limit };
};

exports.sanitize = (v) => {
    if (v === null || typeof v !== 'object') return v;
    if (Array.isArray(v)) return v.map(exports.sanitize);
    const clean = {};
    for (const [k, val] of Object.entries(v)) {
        if (k.startsWith('$') || k.includes('.')) continue;
        clean[k] = exports.sanitize(val);
    }
    return clean;
};

exports.distanceKm = (a, b) => {
    const R = 6371;
    const dLat = ((b.lat - a.lat) * Math.PI) / 180;
    const dLng = ((b.lng - a.lng) * Math.PI) / 180;
    const s = Math.sin(dLat / 2) ** 2 +
        Math.cos((a.lat * Math.PI) / 180) *
        Math.cos((b.lat * Math.PI) / 180) *
        Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(s));
};