const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss');

dotenv.config();

const connectDB = require('./config/database');
const { closeDB, dbState } = require('./config/database');
const { errorHandler, notFound } = require('./middleware/errorHandler');

const authRoutes = require('./routes/authRoutes');
const serviceRoutes = require('./routes/serviceRoutes');
const applicationRoutes = require('./routes/applicationRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const hardwareRoutes = require('./routes/hardwareRoutes');
const contactRoutes = require('./routes/contactRoutes');
const marketRoutes = require('./routes/marketRoutes');
const agricultureRoutes = require('./routes/agricultureRoutes');
const rentalRoutes = require('./routes/rentalRoutes');
const etfRoutes = require('./routes/etfRoutes');
const betRoutes = require('./routes/betRoutes');
const consultationRoutes = require('./routes/consultationRoutes');
const entertainmentRoutes = require('./routes/entertainmentRoutes');
const educationRoutes = require('./routes/educationRoutes');
const constructionRoutes = require('./routes/constructionRoutes');
const partnerRoutes = require('./routes/partnerRoutes');
const advertRoutes = require('./routes/advertRoutes');
const socialRoutes = require('./routes/socialRoutes');
const notificationRoutes = require('./routes/notificationRoutes');

const app = express();

// Behind nginx / a load balancer: trust the first proxy hop for client IPs (rate limiting)
app.set('trust proxy', 1);

// ---------- MIDDLEWARE ----------
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

app.use(
    cors({
        origin: [
            process.env.CLIENT_URL || 'http://localhost:5500',
            'http://127.0.0.1:5500',
            'http://localhost:3000'
        ],
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: [
            'Content-Type', 'Authorization', 'X-Requested-With',
            'X-Admin-Key', 'Accept', 'Origin'
        ]
    })
);

app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));
app.use(mongoSanitize());

// XSS scrubber on string bodies
app.use((req, _res, next) => {
    if (req.body && typeof req.body === 'object') {
        for (const k of Object.keys(req.body)) {
            if (typeof req.body[k] === 'string') req.body[k] = xss(req.body[k]);
        }
    }
    next();
});

// API rate limit
app.use(
    '/api',
    rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 1000,
        standardHeaders: true,
        legacyHeaders: false
    })
);

// Static uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ---------- HEALTH ----------
app.get('/api/health', (_req, res) => {
    const db = dbState();
    const ok = db === 'connected';
    res.status(ok ? 200 : 503).json({
        success: ok,
        message: ok ? 'Zeroth Solutions API is running' : 'Database unavailable',
        database: db,
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV
    });
});

// ---------- ROUTES ----------
app.use('/api/auth', authRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/hardware', hardwareRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/market', marketRoutes);
app.use('/api/agriculture', agricultureRoutes);
app.use('/api/rentals', rentalRoutes);
app.use('/api/etf', etfRoutes);
app.use('/api/bets', betRoutes);
app.use('/api/consultation', consultationRoutes);
app.use('/api/entertainment', entertainmentRoutes);
app.use('/api/education', educationRoutes);
app.use('/api/construction', constructionRoutes);
app.use('/api/partners', partnerRoutes);
app.use('/api/adverts', advertRoutes);
app.use('/api/social', socialRoutes);
app.use('/api/notifications', notificationRoutes);

// ---------- ERRORS ----------
app.use(notFound);
app.use(errorHandler);

// ---------- BOOT ----------
const PORT = process.env.PORT || 5000;

const startServer = async () => {
    try {
        await connectDB();
        app.listen(PORT, () => {
            console.log(`🚀 Server running on http://localhost:${PORT}`);
            console.log(`📊 API URL: http://localhost:${PORT}/api`);
            console.log(`🔗 CORS: ${process.env.CLIENT_URL || 'http://localhost:5500'}`);
        });
    } catch (err) {
        console.error('❌ Failed to start server:', err.message);
        process.exit(1);
    }
};

startServer();

const shutdown = async (signal) => {
    console.log(`\n👋 ${signal} received. Shutting down...`);
    await closeDB();
    process.exit(0);
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

process.on('unhandledRejection', (err) => {
    console.error('UNHANDLED REJECTION:', err);
    process.exit(1);
});

module.exports = app;