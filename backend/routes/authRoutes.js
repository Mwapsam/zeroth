const router = require('express').Router();
const ctrl = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { registerRules, loginRules, validate } = require('../utils/validators');

router.post('/register', registerRules, validate, ctrl.register);
router.post('/login', loginRules, validate, ctrl.login);

router.get('/me', protect, ctrl.me);
router.patch('/me', protect, ctrl.updateMe);
router.patch('/password', protect, ctrl.changePassword);
router.post('/favorites/:id', protect, ctrl.toggleFavorite);
router.post('/watchlist/:symbol', protect, ctrl.toggleWatchlist);

module.exports = router;
