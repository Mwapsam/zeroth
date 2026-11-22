const mongoose = require('mongoose');

const etfCompanySchema = new mongoose.Schema(
    {
        symbol: { type: String, required: true, unique: true, uppercase: true, trim: true },
        name: { type: String, required: true, trim: true, maxlength: 200 },
        exchange: { type: String, required: true, trim: true },
        country: { type: String, trim: true },

        price: { type: Number, required: true, min: 0 },
        previousClose: { type: Number, min: 0 },
        currency: { type: String, default: 'ZMW' },

        change: { type: Number, default: 0 },
        changePercent: { type: Number, default: 0 },

        open: Number, high: Number, low: Number,
        volume: { type: Number, default: 0 },
        marketCap: Number,
        peRatio: Number,

        about: { type: String, maxlength: 2000 },
        sector: String,

        isActive: { type: Boolean, default: true },
        updatedAt: { type: Date, default: Date.now }
    },
    { timestamps: true }
);

etfCompanySchema.index({ name: 'text', symbol: 'text', exchange: 'text' });

const etfExchangeSchema = new mongoose.Schema(
    {
        code: { type: String, required: true, unique: true, uppercase: true },
        name: { type: String, required: true },
        country: String,
        city: String,
        currency: { type: String, default: 'ZMW' },
        timezone: String,
        isActive: { type: Boolean, default: true }
    },
    { timestamps: true }
);

module.exports = {
    ETFCompany: mongoose.model('ETFCompany', etfCompanySchema),
    ETFExchange: mongoose.model('ETFExchange', etfExchangeSchema)
};