exports.errorHandler = (err, req, res, _next) => {
    console.error('❌', err.message);

    let status = err.statusCode || err.status || 500;
    let message = err.message || 'Internal Server Error';

    if (err.name === 'ValidationError') {
        status = 400;
        message = Object.values(err.errors).map((e) => e.message).join(', ');
    }
    if (err.code === 11000) {
        status = 400;
        const f = Object.keys(err.keyValue || {})[0] || 'field';
        message = `Duplicate value for ${f}`;
    }
    if (err.name === 'CastError') {
        status = 400;
        message = `Invalid ${err.path}: ${err.value}`;
    }
    if (err.name === 'JsonWebTokenError') { status = 401; message = 'Invalid token'; }
    if (err.name === 'TokenExpiredError') { status = 401; message = 'Token expired'; }

    res.status(status).json({
        success: false,
        message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
};

exports.notFound = (req, res) => {
    res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
};