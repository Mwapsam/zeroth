/* ============================================================
   ERROR HANDLER — middleware/errorHandler.js
   ------------------------------------------------------------
   Converts every thrown error into a consistent JSON response:
     { success: false, message: string, code?: string, fields?: {} }

   v2 changes:
     • Emits `code` for known error families so clients can branch:
       VALIDATION, DUPLICATE_KEY, CAST, JWT, TOKEN_EXPIRED, RATE_LIMIT.
     • Emits `fields` (object keyed by field name) for validation
       errors — matches the shape `utils/validators.validate()`
       produces, so the frontend has one error format everywhere.
     • Handles Express/body-parser errors: `entity.too.large`,
       `entity.parse.failed`, and `PayloadTooLargeError`.
     • Handles multer `LIMIT_FILE_SIZE` / `LIMIT_UNEXPECTED_FILE`.
     • Handles Mongoose `MongooseServerSelectionError` (502).
     • Uses `err.statusCode || err.status || 500` — same as before.
     • Never echoes the stack in production.
     • `notFound` returns `{ success:false, message, code:'NOT_FOUND' }`
       so clients don't have to string-match the message.
   ============================================================ */

'use strict';

/* ---------- Logging ---------- */
function logError(err, req) {
    const method = req?.method || '—';
    const url = req?.originalUrl || '—';
    const isProd = process.env.NODE_ENV === 'production';

    if (isProd) {
        // Keep production logs terse but actionable
        console.error(`❌ [${method} ${url}] ${err.name || 'Error'}: ${err.message}`);
    } else {
        console.error(`❌ [${method} ${url}]`, err);
    }
}

/* ---------- Status resolver ---------- */
function resolveStatus(err) {
    if (err.statusCode) return err.statusCode;
    if (err.status)     return err.status;

    /* Known error families */
    if (err.name === 'ValidationError')      return 400;
    if (err.name === 'CastError')            return 400;
    if (err.name === 'JsonWebTokenError')    return 401;
    if (err.name === 'TokenExpiredError')    return 401;
    if (err.name === 'MongooseError')        return 500;
    if (err.name === 'MongooseServerSelectionError') return 502;

    if (err.code === 11000)                  return 400;   // Mongo duplicate key
    if (err.code === 'LIMIT_FILE_SIZE')      return 413;   // multer
    if (err.code === 'LIMIT_UNEXPECTED_FILE') return 400;
    if (err.code === 'LIMIT_FILE_COUNT')     return 400;

    if (err.type === 'entity.too.large')     return 413;
    if (err.type === 'entity.parse.failed')  return 400;

    return 500;
}

/* ---------- Message resolver ---------- */
function resolveMessage(err) {
    /* Mongoose validation — join all field messages */
    if (err.name === 'ValidationError' && err.errors) {
        return Object.values(err.errors)
            .map((e) => e.message)
            .filter(Boolean)
            .join(', ') || 'Validation failed';
    }

    /* Duplicate key */
    if (err.code === 11000) {
        const field = Object.keys(err.keyValue || {})[0] || 'value';
        return `Duplicate ${field}`;
    }

    /* Cast (bad ObjectId, bad date) */
    if (err.name === 'CastError') {
        return `Invalid ${err.path || 'value'}`;
    }

    /* JWT */
    if (err.name === 'JsonWebTokenError') return 'Invalid token';
    if (err.name === 'TokenExpiredError') return 'Token expired';

    /* Multer */
    if (err.code === 'LIMIT_FILE_SIZE')     return 'File too large';
    if (err.code === 'LIMIT_FILE_COUNT')    return 'Too many files';
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        return `Unexpected file field: ${err.field || 'unknown'}`;
    }

    /* Body parser */
    if (err.type === 'entity.too.large')    return 'Request body too large';
    if (err.type === 'entity.parse.failed') return 'Malformed JSON body';

    /* Mongo unreachable */
    if (err.name === 'MongooseServerSelectionError') {
        return 'Database temporarily unavailable';
    }

    return err.message || 'Internal Server Error';
}

/* ---------- Code resolver ---------- */
function resolveCode(err) {
    if (err.name === 'ValidationError')      return 'VALIDATION';
    if (err.code === 11000)                  return 'DUPLICATE_KEY';
    if (err.name === 'CastError')            return 'CAST';
    if (err.name === 'JsonWebTokenError')    return 'JWT_INVALID';
    if (err.name === 'TokenExpiredError')    return 'TOKEN_EXPIRED';
    if (err.name === 'MongooseServerSelectionError') return 'DB_UNAVAILABLE';
    if (err.code === 'LIMIT_FILE_SIZE')      return 'FILE_TOO_LARGE';
    if (err.code === 'LIMIT_FILE_COUNT')     return 'TOO_MANY_FILES';
    if (err.code === 'LIMIT_UNEXPECTED_FILE') return 'UNEXPECTED_FILE';
    if (err.type === 'entity.too.large')     return 'BODY_TOO_LARGE';
    if (err.type === 'entity.parse.failed')  return 'BODY_MALFORMED';
    return null;
}

/* ---------- Fields resolver ---------- */
function resolveFields(err) {
    if (err.name === 'ValidationError' && err.errors) {
        const out = {};
        for (const [key, val] of Object.entries(err.errors)) {
            out[key] = [val.message];
        }
        return out;
    }
    return null;
}

/* ============================================================
   ERROR HANDLER
   ============================================================ */
exports.errorHandler = (err, req, res, _next) => {
    logError(err, req);

    const status  = resolveStatus(err);
    const message = resolveMessage(err);
    const code    = resolveCode(err);
    const fields  = resolveFields(err);

    const payload = {
        success: false,
        message,
        ...(code && { code }),
        ...(fields && { fields }),
        ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
    };

    /* Extra info for the two endpoints that care */
    if (err.name === 'MongooseServerSelectionError') {
        payload.hint = 'Check MONGODB_URI and Atlas network access.';
    }

    res.status(status).json(payload);
};

/* ============================================================
   NOT FOUND
   ============================================================ */
exports.notFound = (req, res) => {
    res.status(404).json({
        success: false,
        message: `Route ${req.method} ${req.originalUrl} not found`,
        code: 'NOT_FOUND'
    });
};