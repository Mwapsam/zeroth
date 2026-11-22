/* ============================================================
   RENTAL ROUTES
   ============================================================ */
const router = require('express').Router();
const ctrl = require('../controllers/rentalController');
const { requireAuth, optionalAuth, requireRole } = require('../middleware/auth');
const { rentalApplicationRules, validate } = require('../utils/validators');

/* ---- Public / specific-before-id ---- */
router.get('/cities',              ctrl.cities);
router.get('/favorites/mine',      requireAuth, ctrl.myFavorites);
router.get('/applications/mine',   requireAuth, ctrl.myApplications);
router.get('/mine',                requireAuth, ctrl.myListings);

router.get('/',      ctrl.list);
router.get('/:id',   ctrl.getOne);

/* ---- Listing CRUD ---- */
router.post('/',
    requireAuth, requireRole('landlord', 'admin'),
    ctrl.createListing);

router.patch('/:id',
    requireAuth, requireRole('landlord', 'admin'),
    ctrl.updateListing);

router.delete('/:id',
    requireAuth, requireRole('landlord', 'admin'),
    ctrl.deleteListing);

/* ---- Apply ---- */
router.post('/:id/apply',
    optionalAuth,
    rentalApplicationRules, validate,
    ctrl.apply);

/* ---- Favorite ---- */
router.post('/:id/favorite',
    requireAuth,
    ctrl.toggleFavorite);

module.exports = router;