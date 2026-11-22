/* ============================================================
   BET ROUTES
   ============================================================ */
const router = require('express').Router();
const ctrl = require('../controllers/betController');
const { requireAuth } = require('../middleware/auth');

/* Public catalog */
router.get('/events', ctrl.listEvents);
router.get('/games',  ctrl.listGames);

/* Everything below requires auth */
router.use(requireAuth);

router.post('/company',           ctrl.placeCompanyBet);
router.post('/pvp',               ctrl.placePvpBet);
router.post('/pvp/:id/cancel',    ctrl.cancelMatch);
router.get('/mine',               ctrl.myBets);
router.get('/history',            ctrl.betHistory);
router.post('/games/challenge',   ctrl.createGameChallenge);

module.exports = router;