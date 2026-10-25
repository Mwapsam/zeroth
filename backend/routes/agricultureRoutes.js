const router = require('express').Router();
const ctrl = require('../controllers/agricultureController');
const { protect, optionalAuth } = require('../middleware/auth');

router.get('/categories', ctrl.categories);

router.get('/listings', ctrl.list);
router.get('/listings/:id', ctrl.getOne);
router.post('/listings', optionalAuth, ctrl.create);
router.patch('/listings/:id', protect, ctrl.update);
router.delete('/listings/:id', protect, ctrl.remove);

router.post('/checkout', optionalAuth, ctrl.checkout);

router.post('/permits', optionalAuth, ctrl.createPermit);
router.get('/permits', protect, ctrl.listPermits);
router.get('/permits/:id', protect, ctrl.getPermit);
router.post('/permits/:permitId/animals/:animalIndex/notify', protect, ctrl.notifySeller);
router.post('/permits/:permitId/animals/:animalIndex/reply', ctrl.sellerReply);
router.post('/permits/:permitId/officers/:index/notify', protect, ctrl.notifyOfficer);
router.get('/permits/:id/print', protect, ctrl.printPermit);

module.exports = router;