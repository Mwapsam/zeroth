const { BetEvent, Bet } = require('../models/Bet');
const User = require('../models/User');
const Payment = require('../models/Payment');
const { asyncHandler, paginate, generateRef } = require('../utils/helpers');

exports.listEvents = asyncHandler(async (req, res) => {
    const { sport, mode, q, status } = req.query;
    const filter = {};
    if (sport) filter.sport = sport;
    if (status) filter.status = status;
    if (mode === 'pvp') filter.pvpEnabled = true;
    if (q) filter.eventName = { $regex: q, $options: 'i' };

    const events = await BetEvent.find(filter).sort({ startTime: 1 }).limit(200);
    res.json({ success: true, count: events.length, events });
});

exports.placeCompanyBet = asyncHandler(async (req, res) => {
    const { eventId, pick, stake } = req.body;
    const amount = parseFloat(stake);
    if (!amount || amount < 10)
        return res.status(400).json({ success: false, message: 'Minimum stake is 10' });

    const event = await BetEvent.findById(eventId);
    if (!event) return res.status(404).json({ success: false, message: 'Event not found' });
    if (event.status !== 'upcoming')
        return res.status(400).json({ success: false, message: 'Event no longer accepting bets' });

    const outcome = event.outcomes.find((o) => o.key === pick);
    if (!outcome) return res.status(400).json({ success: false, message: 'Invalid pick' });

    const user = await User.findById(req.user._id);
    if (user.wallet.balance < amount)
        return res.status(400).json({ success: false, message: 'Insufficient wallet balance' });

    user.wallet.balance -= amount;
    await user.save();

    const potentialPayout = +(amount * outcome.odds).toFixed(2);

    const bet = await Bet.create({
        user: user._id, event: event._id, mode: 'company',
        pick: outcome.key, odds: outcome.odds,
        stake: amount, potentialPayout, status: 'pending',
        reference: generateRef('BET')
    });

    await Payment.create({
        user: user._id, amount, method: 'wallet', purpose: 'bet',
        reference: generateRef('PAY-BET'), status: 'completed', paidAt: new Date(),
        relatedId: bet._id,
        metadata: { event: event.eventName, pick, odds: outcome.odds }
    });

    res.status(201).json({ success: true, bet, wallet: user.wallet });
});

exports.placePvpBet = asyncHandler(async (req, res) => {
    const { eventId, pick, stake } = req.body;
    const amount = parseFloat(stake);
    if (!amount || amount < 10)
        return res.status(400).json({ success: false, message: 'Minimum stake is 10' });

    const event = await BetEvent.findById(eventId);
    if (!event || !event.pvpEnabled)
        return res.status(400).json({ success: false, message: 'PvP not available for this event' });

    const user = await User.findById(req.user._id);
    if (user.wallet.balance < amount)
        return res.status(400).json({ success: false, message: 'Insufficient wallet balance' });

    const match = await Bet.findOne({
        event: event._id, mode: 'pvp', status: 'pending',
        stake: amount, pick: { $ne: pick }, user: { $ne: user._id }
    });

    user.wallet.balance -= amount;
    await user.save();

    if (match) {
        match.status = 'matched';
        match.opponent = user._id;
        match.opponentPick = pick;
        await match.save();
        return res.status(201).json({
            success: true, message: 'Matched with opponent!',
            bet: match, role: 'opponent', wallet: user.wallet
        });
    }

    const bet = await Bet.create({
        user: user._id, event: event._id, mode: 'pvp',
        pick, stake: amount, status: 'pending',
        reference: generateRef('PVP')
    });

    res.status(201).json({
        success: true, message: 'Waiting for opponent...',
        bet, role: 'initiator', wallet: user.wallet
    });
});

exports.cancelMatch = asyncHandler(async (req, res) => {
    const bet = await Bet.findOne({ _id: req.params.id, user: req.user._id, status: 'pending' });
    if (!bet) return res.status(404).json({ success: false, message: 'Match not found' });

    bet.status = 'cancelled';
    await bet.save();

    await User.findByIdAndUpdate(req.user._id, { $inc: { 'wallet.balance': bet.stake } });
    res.json({ success: true, message: 'Match cancelled and stake refunded' });
});

exports.myBets = asyncHandler(async (req, res) => {
    const { page, limit, skip } = paginate(req.query);
    const filter = { user: req.user._id };
    if (req.query.status) filter.status = req.query.status;

    const [bets, total] = await Promise.all([
        Bet.find(filter).skip(skip).limit(limit)
            .sort({ createdAt: -1 }).populate('event', 'eventName icon sport startTime'),
        Bet.countDocuments(filter)
    ]);
    res.json({ success: true, total, page, bets });
});

exports.betHistory = asyncHandler(async (req, res) => {
    const bets = await Bet.find({
        user: req.user._id, status: { $in: ['won', 'lost'] }
    }).sort({ settledAt: -1 }).limit(100).populate('event', 'eventName icon sport');

    const totalWon = bets.filter((b) => b.status === 'won')
        .reduce((s, b) => s + (b.payout || 0), 0);
    const totalStaked = bets.reduce((s, b) => s + b.stake, 0);

    res.json({
        success: true, bets,
        stats: { totalBets: bets.length, totalWon, totalStaked, net: totalWon - totalStaked }
    });
});

exports.listGames = asyncHandler(async (_req, res) => {
    res.json({
        success: true,
        games: [
            { key: 'chess', name: 'Chess', icon: '♟️', desc: 'Classic strategy game' },
            { key: 'checkers', name: 'Checkers', icon: '⚫', desc: 'Fast tactical game' },
            { key: 'tictactoe', name: 'Tic-Tac-Toe', icon: '⭕', desc: '3 in a row' },
            { key: 'cards', name: 'Cards', icon: '🃏', desc: 'Play a hand of cards' },
            { key: 'quiz', name: 'Quiz Battle', icon: '🧠', desc: 'Test your knowledge' },
            { key: 'scramble', name: 'Word Scramble', icon: '🔤', desc: 'Unscramble the words' }
        ]
    });
});

exports.createGameChallenge = asyncHandler(async (req, res) => {
    const { gameType, stake, opponent = 'random' } = req.body;
    const amount = parseFloat(stake);
    if (!amount || amount < 10)
        return res.status(400).json({ success: false, message: 'Minimum stake is 10' });

    const user = await User.findById(req.user._id);
    if (user.wallet.balance < amount)
        return res.status(400).json({ success: false, message: 'Insufficient wallet balance' });

    user.wallet.balance -= amount;
    await user.save();

    const inviteLink = opponent === 'friend'
        ? `${process.env.CLIENT_URL}/?game=${gameType}&invite=${generateRef('GAME')}`
        : null;

    const bet = await Bet.create({
        user: user._id, mode: 'game',
        event: null, gameType,
        pick: 'challenge', stake: amount,
        status: 'pending', inviteLink,
        reference: generateRef('GAME')
    });

    res.status(201).json({ success: true, bet, inviteLink, wallet: user.wallet });
});