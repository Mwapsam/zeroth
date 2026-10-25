const router = require('express').Router();
const ctrl = require('../controllers/rentalController');
const { protect, optionalAuth, restrictTo } = require('../middleware/auth');

router.get('/cities', ctrl.cities);
router.get('/', ctrl.list);
router.get('/favorites/mine', protect, ctrl.myFavorites);
router.get('/applications/mine', protect, ctrl.myApplications);
router.get('/mine', protect, ctrl.myListings);
router.get('/:id', ctrl.getOne);

router.post('/', protect, restrictTo('landlord', 'admin'), ctrl.createListing);
router.patch('/:id', protect, restrictTo('landlord', 'admin'), ctrl.updateListing);
router.delete('/:id', protect, restrictTo('landlord', 'admin'), ctrl.deleteListing);

router.post('/:id/apply', optionalAuth, ctrl.apply);
router.post('/:id/favorite', protect, ctrl.toggleFavorite);

module.exports = router;