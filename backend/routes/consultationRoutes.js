const router = require('express').Router();
const ctrl = require('../controllers/consultationController');
const { protect, optionalAuth } = require('../middleware/auth');

router.get('/consultants', ctrl.listConsultants);
router.get('/consultants/:id', ctrl.getConsultant);

router.post('/book', optionalAuth, ctrl.book);
router.get('/bookings/mine', protect, ctrl.myBookings);
router.post('/bookings/:id/cancel', protect, ctrl.cancelBooking);

module.exports = router;