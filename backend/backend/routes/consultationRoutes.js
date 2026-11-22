/* ============================================================
   CONSULTATION ROUTES
   ============================================================ */
const router = require('express').Router();
const ctrl = require('../controllers/consultationController');
const { requireAuth, optionalAuth } = require('../middleware/auth');

/* Public catalog */
router.get('/consultants',     ctrl.listConsultants);
router.get('/consultants/:id', ctrl.getConsultant);

/* Book — guests allowed, booked under session or user */
router.post('/book', optionalAuth, ctrl.book);

/* Booking management — auth */
router.get('/bookings/mine',      requireAuth, ctrl.myBookings);
router.post('/bookings/:id/cancel', requireAuth, ctrl.cancelBooking);

module.exports = router;