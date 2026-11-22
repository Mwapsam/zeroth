/* ============================================================
   ZEROTH BUSINESS SOLUTIONS — SERVER
   Final production copy (v3).
   ------------------------------------------------------------
   v3 — Full-stack link awareness
     • BACKEND_URL + CLIENT_URL resolved and printed on boot
     • Health endpoint exposes backendUrl + clientUrl(s)
     • CORS supports comma-separated CLIENT_URL (unchanged)
     • `X-Admin-Key` retained; `Retry-After` exposed
     • shutdown() gives in-flight requests 5s before exit
     • Recoverable Mongo topology errors no longer kill the process
   ------------------------------------------------------------
   v2 — aligned with config/database.js v2
     • dbState() returns an OBJECT { state, readyState, host,
       name, uptimeSec }
     • Health surfaces DB object + process uptime
   ============================================================ */
const express  = require('express');
const mongoose = require('mongoose');
const cors     = require('cors');
const dotenv   = require('dotenv');
const helmet   = require('helmet');
const morgan   = require('morgan');
const path     = require('path');
const rateLimit     = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const xss           = require('xss');

dotenv.config();

const connectDB = require('./config/database');
const { closeDB, dbState } = require('./config/database');
const { errorHandler, notFound } = require('./middleware/errorHandler');

const authRoutes          = require('./routes/authRoutes');
const serviceRoutes       = require('./routes/serviceRoutes');
const applicationRoutes   = require('./routes/applicationRoutes');
const paymentRoutes       = require('./routes/paymentRoutes');
const hardwareRoutes      = require('./routes/hardwareRoutes');
const contactRoutes       = require('./routes/contactRoutes');
const marketRoutes        = require('./routes/marketRoutes');
const agricultureRoutes   = require('./routes/agricultureRoutes');
const rentalRoutes        = require('./routes/rentalRoutes');
const etfRoutes           = require('./routes/etfRoutes');
const betRoutes           = require('./routes/betRoutes');
const consultationRoutes  = require('./routes/consultationRoutes');
const entertainmentRoutes = require('./routes/entertainmentRoutes');
const educationRoutes     = require('./routes/educationRoutes');
const constructionRoutes  = require('./routes/constructionRoutes');
const partnerRoutes       = require('./routes/partnerRoutes');
const advertRoutes        = require('./routes/advertRoutes');
const socialRoutes        = require('./routes/socialRoutes');
const notificationRoutes  = require('./routes/notificationRoutes');

const app = express();

/* ------------------------------------------------------------
   Backend + Frontend URL resolution
   ------------------------------------------------------------
   BACKEND_URL  → self URL used in logs, health payload and
                  anywhere else we need an absolute API base.
   CLIENT_URL   → comma-separated list of frontend origins
                  (kept as array; also joined for logging).
   ------------------------------------------------------------ */
const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';

const BACKEND_URL = (process.env.BACKEND_URL || `http://localhost:${PORT}`).replace(/\/+$/, '');

const ALLOWED_ORIGINS = (process.env.CLIENT_URL || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

const FRONTEND_URL = ALLOWED_ORIGINS[0] || '';

if (ALLOWED_ORIGINS.length === 0) {
    console.warn('⚠️  CLIENT_URL is empty — no browser origin will be allowed. ' +
                 'Set CLIENT_URL in .env to your frontend URL(s).');
}
if (!process.env.BACKEND_URL) {
    console.warn(`⚠️  BACKEND_URL not set — defaulting to ${BACKEND_URL}. ` +
                 'Set it in .env for production.');
}

/* ------------------------------------------------------------
   CORS — comma-separated CLIENT_URL support
   ------------------------------------------------------------ */
app.use(cors({
    origin(origin, cb) {
        // No Origin header → curl, Postman, mobile WebView, same-origin fetch
        if (!origin) return cb(null, true);

        // Wildcard support — set CLIENT_URL="*" for staging
        if (ALLOWED_ORIGINS.includes('*')) return cb(null, true);

        if (ALLOWED_ORIGINS.includes(origin)) return cb(null, true);

        return cb(new Error(`CORS blocked: ${origin}`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
        'Content-Type', 'Authorization', 'X-Requested-With',
        'X-Admin-Key', 'Accept', 'Origin'
    ],
    exposedHeaders: ['Retry-After']
}));

/* ------------------------------------------------------------
   Core middleware
   ------------------------------------------------------------ */
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(morgan(NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(mongoSanitize());

/* XSS scrub strings */
app.use((req, _res, next) => {
    if (req.body && typeof req.body === 'object') {
        for (const k of Object.keys(req.body)) {
            if (typeof req.body[k] === 'string') req.body[k] = xss(req.body[k]);
        }
    }
    next();
});

/* Rate limit only /api */
app.use('/api', rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1000,
    standardHeaders: true,
    legacyHeaders: false
}));

/* Static uploads — served from BACKEND_URL/uploads */
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

/* ------------------------------------------------------------
   Health
   ------------------------------------------------------------
   Exposes both backend URL and allowed frontend origins so
   uptime checks / dashboards know exactly who this instance
   is serving.
   ------------------------------------------------------------ */
app.get('/api/health', (_req, res) => {
    const db = dbState();
    const ok = db.state === 'connected';

    res.status(ok ? 200 : 503).json({
        success: ok,
        message: ok ? 'Zeroth Solutions API is running' : 'Database unavailable',
        backendUrl: BACKEND_URL,
        frontendUrl: FRONTEND_URL || null,
        allowedOrigins: ALLOWED_ORIGINS,
        database: db,                                   // full object
        timestamp: new Date().toISOString(),
        environment: NODE_ENV,
        uptimeSec: Math.round(process.uptime())
    });
});

/* ------------------------------------------------------------
   Routes
   ------------------------------------------------------------ */
app.use('/api/auth',          authRoutes);
app.use('/api/services',      serviceRoutes);
app.use('/api/applications',  applicationRoutes);
app.use('/api/payments',      paymentRoutes);
app.use('/api/hardware',      hardwareRoutes);
app.use('/api/contact',       contactRoutes);
app.use('/api/market',        marketRoutes);
app.use('/api/agriculture',   agricultureRoutes);
app.use('/api/rentals',       rentalRoutes);
app.use('/api/etf',           etfRoutes);
app.use('/api/bets',          betRoutes);
app.use('/api/consultation',  consultationRoutes);
app.use('/api/entertainment', entertainmentRoutes);
app.use('/api/education',     educationRoutes);
app.use('/api/construction',  constructionRoutes);
app.use('/api/partners',      partnerRoutes);
app.use('/api/adverts',       advertRoutes);
app.use('/api/social',        socialRoutes);
app.use('/api/notifications', notificationRoutes);

/* ------------------------------------------------------------
   Errors
   ------------------------------------------------------------ */
app.use(notFound);
app.use(errorHandler);

/* ------------------------------------------------------------
   Boot
   ------------------------------------------------------------ */
let httpServer = null;

const startServer = async () => {
    try {
        await connectDB();

        httpServer = app.listen(PORT, () => {
            const frontendList = ALLOWED_ORIGINS.join(', ') || '(none configured)';

            console.log('');
            console.log('====================================================');
            console.log('🚀  Zeroth API is live');
            console.log('----------------------------------------------------');
            console.log(`🔗  Backend :  ${BACKEND_URL}`);
            console.log(`📊  Health  :  ${BACKEND_URL}/api/health`);
            console.log(`🌍  CORS    :  ${frontendList}`);
            if (FRONTEND_URL) {
                console.log(`💻  Frontend:  ${FRONTEND_URL}`);
            } else {
                console.log('💻  Frontend:  (not set — add CLIENT_URL to .env)');
            }
            console.log(`🔧  Env     :  ${NODE_ENV}`);
            console.log(`🕒  Started :  ${new Date().toISOString()}`);
            console.log('====================================================');
            console.log('');
        });

        // Graceful handling of EADDRINUSE
        httpServer.on('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                console.error(`❌ Port ${PORT} already in use. Is another instance running?`);
            } else {
                console.error('❌ HTTP server error:', err.message);
            }
            process.exit(1);
        });
    } catch (err) {
        console.error('❌ Failed to start server:', err.message);
        process.exit(1);
    }
};

startServer();

/* ------------------------------------------------------------
   Graceful shutdown
   ------------------------------------------------------------ */
let shuttingDown = false;

const shutdown = async (signal) => {
    if (shuttingDown) return;
    shuttingDown = true;

    console.log(`\n👋 ${signal} received. Shutting down gracefully…`);

    // Give in-flight requests up to 5s to finish
    const forceExit = setTimeout(() => {
        console.warn('⚠️ Forcing exit after 5s');
        process.exit(1);
    }, 5000);
    if (forceExit.unref) forceExit.unref();

    try {
        if (httpServer) {
            await new Promise((resolve) => httpServer.close(resolve));
            console.log('🛑 HTTP server closed');
        }
        await closeDB();
        console.log('✅ Shutdown complete');
        process.exit(0);
    } catch (err) {
        console.error('❌ Shutdown error:', err.message);
        process.exit(1);
    }
};

process.on('SIGINT',  () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

/* ------------------------------------------------------------
   Unhandled rejections
   ------------------------------------------------------------
   Recoverable Mongo topology errors should NOT kill the process
   (the 30s watchdog in config/database.js will reconnect).
   Anything else is fatal.
   ------------------------------------------------------------ */
process.on('unhandledRejection', (err) => {
    const msg = (err && err.message) || '';
    const recoverable =
        msg.includes('topology') ||
        msg.includes('ECONNRESET') ||
        msg.includes('MongoNetworkError') ||
        msg.includes('PoolClosed');

    if (recoverable) {
        console.warn('⚠️ Unhandled rejection (recoverable):', msg);
        return;
    }

    console.error('UNHANDLED REJECTION:', err);
    process.exit(1);
});

process.on('uncaughtException', (err) => {
    console.error('UNCAUGHT EXCEPTION:', err);
    process.exit(1);
});

module.exports = app;