const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();

router.get('/', (req, res) => {
  const db = mongoose.connection.readyState === 1 ? 'up' : 'down';
  const healthy = db === 'up';
  res.status(healthy ? 200 : 503).json({
    success: healthy,
    status: healthy ? 'ok' : 'degraded',
    uptime: process.uptime(),
    db,
    version: process.env.npm_package_version || '3.4.0',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;