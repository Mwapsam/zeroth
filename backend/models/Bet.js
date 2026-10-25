const mongoose = require('mongoose');

const betEventSchema = new mongoose.Schema(
    {
        externalId: { type: String, unique: true, sparse: true },
        sport: { type: String, required: true },
        league: String,
        eventName: { type: String, required: true },
        icon: { type: String, default: '⚽' },

        homeTeam: String,
        awayTeam: String,
        startTime: { type: Date, required: true },

        outcomes: [
            {
                key: String,
                label: String,
                odds: { type: Number, min: 1 }
            }
        ],

        pvpEnabled: { type: Boolean, default: false },

        status: {
            type: String,
            enum: ['upcoming', 'live', 'finished', 'cancelled'],
            default: 'upcoming'
        },
        result: String
    },
    { timestamps: true }
);

betEventSchema.index({ sport: 1, status: 1, startTime: 1 });

const betSchema = new mongoose.Schema(
    {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        reference: { type: String, unique: true, index: true },

        event: { type: mongoose.Schema.Types.ObjectId, ref: 'BetEvent' },

        mode: { type: String, enum: ['pvp', 'company', 'game'], required: true },

        pick: { type: String, required: true },
        odds: Number,
        stake: { type: Number, required: true, min: 0 },
        currency: { type: String, default: 'ZMW' },

        potentialPayout: { type: Number, min: 0 },

        opponent: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        opponentPick: String,

        gameType: String,

        status: {
            type: String,
            enum: ['pending', 'matched', 'live', 'won', 'lost', 'cancelled', 'refunded'],
            default: 'pending'
        },

        payout: { type: Number, default: 0 },
        settledAt: Date,

        inviteLink: String
    },
    { timestamps: true }
);

betSchema.index({ user: 1, status: 1, createdAt: -1 });

betSchema.pre('save', function (next) {
    if (!this.reference) {
        this.reference = `BET-${Date.now().toString(36).toUpperCase()}-${Math.random()
            .toString(36).slice(2, 5).toUpperCase()}`;
    }
    next();
});

module.exports = {
    BetEvent: mongoose.model('BetEvent', betEventSchema),
    Bet: mongoose.model('Bet', betSchema)
};