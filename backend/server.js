require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');

const { connectDB } = require('./config/db');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const { generalLimiter } = require('./middleware/rateLimiter');
const { ensureDir } = require('./middleware/upload');
const logger = require('./utils/logger');

const app = express();

/* ---------- Security & parsing ---------- */
app.set('trust proxy', 1);
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

const allowedOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true); // non-browser clients
      if (allowedOrigins.length === 0) return cb(null, true); // dev default
      return allowedOrigins.includes(origin) ? cb(null, true) : cb(new Error('CORS blocked'));
    },
    credentials: true
  })
);

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(generalLimiter);

/* ---------- Static uploads ---------- */
const UPLOAD_DIR = process.env.UPLOAD_DIR || 'uploads';
['images', 'pdfs', 'media'].forEach((d) => ensureDir(path.join(UPLOAD_DIR, d)));
app.use('/uploads', express.static(path.resolve(UPLOAD_DIR), { maxAge: '7d' }));

/* ---------- Optional static frontend ---------- */
// If you drop the frontend build (or your index.html + css/images) in ../public,
// these lines will serve it from the same origin.
const PUBLIC_DIR = path.join(__dirname, '..', 'public');
app.use(express.static(PUBLIC_DIR, { extensions: ['html'] }));

/* ---------- Routes ---------- */
app.use('/api/health', require('./routes/health'));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/wallet', require('./routes/wallet'));
app.use('/api/shares', require('./routes/shares'));
app.use('/api/partners', require('./routes/partners'));
app.use('/api/adverts', require('./routes/adverts'));
app.use('/api/rentals', require('./routes/rentals'));
app.use('/api/agriculture', require('./routes/agriculture'));
app.use('/api/education', require('./routes/education'));
app.use('/api/entertainment', require('./routes/entertainment'));
app.use('/api/finance', require('./routes/finance'));
app.use('/api/prohire', require('./routes/prohire'));
app.use('/api/ai', require('./routes/ai'));
app.use('/api/search', require('./routes/search'));

/* ---------- API index ---------- */
app.get('/api', (req, res) => {
  res.json({
    success: true,
    name: 'Zeroth Business Solutions API',
    version: process.env.npm_package_version || '3.4.0',
    endpoints: [
      '/api/health',
      '/api/auth',
      '/api/users',
      '/api/wallet',
      '/api/shares',
      '/api/partners',
      '/api/adverts',
      '/api/rentals',
      '/api/agriculture',
      '/api/education',
      '/api/entertainment',
      '/api/finance',
      '/api/prohire',
      '/api/ai',
      '/api/search'
    ]
  });
});

/* ---------- SPA fallback for non-API GET requests ---------- */
app.get(/^\/(?!api\/|uploads\/).*/, (req, res, next) => {
  const indexPath = path.join(PUBLIC_DIR, 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) next();
  });
});

/* ---------- Errors ---------- */
app.use(notFound);
app.use(errorHandler);

/* ---------- Boot ---------- */
const PORT = Number(process.env.PORT || 5000);

async function start() {
  try {
    await connectDB();
    const server = app.listen(PORT, () => logger.info(`Zeroth API listening on port ${PORT}`));

    const shutdown = (signal) => {
      logger.warn(`${signal} received, shutting down...`);
      server.close(() => process.exit(0));
      setTimeout(() => process.exit(1), 10000).unref();
    };
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (err) {
    logger.error('Failed to start server', err);
    process.exit(1);
  }
}

if (require.main === module) start();

module.exports = app;