/* ============================================================
   AUTH ROUTES
   ============================================================ */
const router = require('express').Router();
const ctrl = require('../controllers/authController');
const { requireAuth, optionalAuth } = require('../middleware/auth');
const {
    registerRules,
    loginRules,
    changePasswordRules,
    updateProfileRules,
    validate
} = require('../utils/validators');

/* Public */
router.post('/register', registerRules, validate, ctrl.register);
router.post('/login',    loginRules,    validate, ctrl.login);

/* Authenticated */
router.get('/me', requireAuth, ctrl.me);
router.patch('/me', requireAuth, updateProfileRules, validate, ctrl.updateMe);
router.post('/me/password', requireAuth, changePasswordRules, validate, ctrl.changePassword);

/* Favorites & watchlist (require auth) */
router.post('/favorites/:id',        requireAuth, ctrl.toggleFavorite);
router.post('/watchlist/:symbol',    requireAuth, ctrl.toggleWatchlist);

module.exports = router;