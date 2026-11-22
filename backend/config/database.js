/* ============================================================
   MONGODB CONNECTION — config/database.js
   ------------------------------------------------------------
   Responsibilities:
     • Connect to MongoDB Atlas with sensible production options
     • Retry on transient failures (network blips, DNS cold start)
     • Expose a health-state snapshot for /api/health
     • Close cleanly on SIGINT / SIGTERM

   v2 changes vs v1:
     • `bufferCommands: false` REMOVED — with it off, any query
       fired before the first connection resolves throws
       "Cannot call `users.findOne()` before initial connection".
       Under load on Render this happens constantly. Replaced
       with the mongoose default (buffer up to 10s).
     • Added TLS-friendly socket options for Atlas (`tls: true`
       is implied by the `mongodb+srv://` scheme, so we don't
       force it — just widen the timeouts).
     • Added a 30-second "connection watchdog" so a silently
       dropped socket (Render idles connections) reconnects
       without waiting for the next request to fail.
     • Split connection options into dev vs production so
       `autoIndex` can never accidentally run on production.
     • `dbState()` now returns richer info: `readyState`,
       `host`, `name`, `uptimeSec`.
     • `closeDB()` guarantees the connection is fully drained
       before resolving (no "topology destroyed" warnings).
     • Exports preserved (backwards compatible):
         module.exports       = connectDB
         module.exports.closeDB
         module.exports.dbState
         module.exports.isConnected
   ============================================================ */

'use strict';

const mongoose = require('mongoose');

/* ---- Global Mongoose tuning ---- */
mongoose.set('strictQuery', true);
// Note: DO NOT set `bufferCommands: false` — see header.
mongoose.set('bufferTimeoutMS', 10000);   // cap query buffering at 10s
mongoose.set('autoCreate', false);        // collections are created on first write

/* ---- Module state ---- */
let isConnected = false;
let lastConnectedAt = null;
let watchdogTimer = null;

/* ============================================================
   CONNECT
   ============================================================ */
async function connectDB(retries = 5) {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
        throw new Error('❌ MONGODB_URI is not defined in .env');
    }

    // Pretty-print host only (never the password)
    const safeUri = uri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@');
    console.log(`🔌 Connecting to MongoDB: ${safeUri}`);

    /* ---- Options split by environment ---- */
    const isProd = process.env.NODE_ENV === 'production';

    const options = {
        // Don't block startup longer than this trying to reach the primary
        serverSelectionTimeoutMS: 10000,
        // Kill individual operations that hang
        socketTimeoutMS: 45000,
        // How long to wait for a TCP handshake
        connectTimeoutMS: 10000,
        // Cap the socket pool
        maxPoolSize: 10,
        minPoolSize: 2,
        // Idle sockets are reaped after this (Render free tier idles conns)
        maxIdleTimeMS: 60000,
        // Force IPv4 — some Render/AWS hosts still choke on v6
        family: 4,
        // Only auto-create indexes in dev; in prod use `npm run indexes`
        autoIndex: !isProd
    };

    /* ---- Retry loop ---- */
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const conn = await mongoose.connect(uri, options);

            isConnected = true;
            lastConnectedAt = Date.now();
            console.log(`✅ MongoDB connected → ${conn.connection.host}/${conn.connection.name}`);

            startWatchdog();
            return conn;
        } catch (err) {
            console.error(`❌ MongoDB connection attempt ${attempt}/${retries} failed: ${err.message}`);
            if (attempt === retries) throw err;

            const delay = Math.min(2000 * attempt, 10000);
            console.log(`⏳ Retrying in ${delay / 1000}s...`);
            await new Promise((r) => setTimeout(r, delay));
        }
    }
}

/* ============================================================
   CONNECTION EVENT LOGGING
   ============================================================ */
mongoose.connection.on('connected', () => {
    isConnected = true;
    lastConnectedAt = Date.now();
    console.log('🟢 Mongoose: connected');
});

mongoose.connection.on('error', (err) => {
    console.error('🔴 Mongoose error:', err.message);
});

mongoose.connection.on('disconnected', () => {
    isConnected = false;
    console.warn('🟡 Mongoose: disconnected');
});

mongoose.connection.on('reconnected', () => {
    isConnected = true;
    lastConnectedAt = Date.now();
    console.log('🟢 Mongoose: reconnected');
});

/* ============================================================
   WATCHDOG
   ------------------------------------------------------------
   Render and Railway silently kill idle TCP sockets after a
   few minutes. Without a watchdog, the app keeps answering
   /api/health with "connected" (readyState === 1) even though
   the socket is dead — the next real query then hangs until
   socketTimeoutMS.

   Every 30s: if we're supposed to be connected but readyState
   is anything other than 1, try to reconnect.
   ============================================================ */
function startWatchdog() {
    if (watchdogTimer) return;

    watchdogTimer = setInterval(async () => {
        // readyState: 0=disconnected, 1=connected, 2=connecting, 3=disconnecting
        const state = mongoose.connection.readyState;

        if (state === 1) {
            // Healthy — nothing to do.
            return;
        }
        if (state === 2) {
            // Already reconnecting — leave it alone.
            return;
        }

        console.warn(`⚠️ Watchdog: readyState=${state}, attempting reconnect…`);
        try {
            await mongoose.connect(process.env.MONGODB_URI, {
                serverSelectionTimeoutMS: 10000,
                family: 4
            });
            isConnected = true;
            lastConnectedAt = Date.now();
            console.log('🟢 Watchdog: reconnected');
        } catch (err) {
            console.error('🔴 Watchdog reconnect failed:', err.message);
            isConnected = false;
        }
    }, 30000);

    // Don't hold the event loop open in tests
    if (watchdogTimer.unref) watchdogTimer.unref();
}

/* ============================================================
   CLOSE
   ============================================================ */
async function closeDB() {
    if (watchdogTimer) {
        clearInterval(watchdogTimer);
        watchdogTimer = null;
    }

    if (mongoose.connection.readyState === 0) {
        isConnected = false;
        return;
    }

    try {
        // `false` = don't force — drain the pool cleanly
        await mongoose.connection.close(false);
        isConnected = false;
        console.log('🔒 MongoDB connection closed');
    } catch (err) {
        console.error('Error closing MongoDB:', err.message);
    }
}

/* ============================================================
   HEALTH SNAPSHOT
   ============================================================ */
function dbState() {
    const map = ['disconnected', 'connected', 'connecting', 'disconnecting'];
    const readyState = mongoose.connection.readyState;
    const stateStr = map[readyState] || 'unknown';

    return {
        state: stateStr,
        readyState,
        host: mongoose.connection.host || null,
        name: mongoose.connection.name || null,
        uptimeSec: lastConnectedAt
            ? Math.round((Date.now() - lastConnectedAt) / 1000)
            : 0
    };
}

function isConnectedFn() {
    return isConnected && mongoose.connection.readyState === 1;
}

/* ============================================================
   EXPORTS (backwards compatible)
   ============================================================ */
module.exports = connectDB;
module.exports.connectDB    = connectDB;
module.exports.closeDB      = closeDB;
module.exports.dbState      = dbState;
module.exports.isConnected  = isConnectedFn;