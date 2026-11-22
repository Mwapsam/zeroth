/* ============================================================
   AGRICULTURE ROUTES
   ============================================================ */
const router = require('express').Router();
const ctrl = require('../controllers/agricultureController');
const { requireAuth, optionalAuth } = require('../middleware/auth');
const {
    listingRules,
    permitRules,
    validate
} = require('../utils/validators');

/* Categories */
router.get('/categories', ctrl.categories);

/* ---- Listings ---- */
router.get('/listings',       ctrl.list);
router.get('/listings/:id',   ctrl.getOne);

router.post('/listings',
    optionalAuth,
    listingRules, validate,
    ctrl.create);

router.patch('/listings/:id',
    requireAuth,
    listingRules, validate,
    ctrl.update);

router.delete('/listings/:id',
    requireAuth,
    ctrl.remove);

/* ---- Checkout ---- */
router.post('/checkout', optionalAuth, ctrl.checkout);

/* ---- Animal permits ---- */
router.post('/permits',
    optionalAuth,
    permitRules, validate,
    ctrl.createPermit);

router.get('/permits',       requireAuth, ctrl.listPermits);
router.get('/permits/:id',   requireAuth, ctrl.getPermit);

router.post('/permits/:permitId/animals/:animalIndex/notify',
    requireAuth, ctrl.notifySeller);

router.post('/permits/:permitId/animals/:animalIndex/reply',
    ctrl.sellerReply);              // seller replies via SMS link — no auth

router.post('/permits/:permitId/officers/:index/notify',
    requireAuth, ctrl.notifyOfficer);

router.get('/permits/:id/print', requireAuth, ctrl.printPermit);

module.exports = router;