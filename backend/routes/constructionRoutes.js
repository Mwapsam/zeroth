const router = require('express').Router();
const ctrl = require('../controllers/constructionController');
const { optionalAuth } = require('../middleware/auth');

router.get('/services', ctrl.listServices);
router.get('/companies', ctrl.listCompanies);
router.get('/contractors', ctrl.listContractors);
router.post('/bookings', optionalAuth, ctrl.createBooking);

module.exports = router;