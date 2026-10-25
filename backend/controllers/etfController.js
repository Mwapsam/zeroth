const { ETFCompany, ETFExchange } = require('../models/ETF');
const User = require('../models/User');
const Payment = require('../models/Payment');
const { asyncHandler, paginate, generateRef } = require('../utils/helpers');

const COMMISSION_RATE = 0.015;

exports.listExchanges = asyncHandler(async (_req, res) => {
    const exchanges = await ETFExchange.find({ isActive: true });
    res.json({ success: true, exchanges });
});

exports.listCompanies = asyncHandler(async (req, res) => {
    const { exchange, q, sector } = req.query;
    const { page, limit, skip } = paginate(req.query);

    const filter = { isActive: true };
    if (exchange) filter.exchange = exchange;
    if (sector) filter.sector = sector;
    if (q) filter.$or = [
        { name: { $regex: q, $options: 'i' } },
        { symbol: { $regex: q, $options: 'i' } }
    ];

    const [companies, total] = await Promise.all([
        ETFCompany.find(filter).skip(skip).limit(limit).sort({ symbol: 1 }),
        ETFCompany.countDocuments(filter)
    ]);
    res.json({ success: true, total, page, companies });
});

exports.getCompany = asyncHandler(async (req, res) => {
    const company = await ETFCompany.findOne({ symbol: req.params.symbol.toUpperCase() });
    if (!company) return res.status(404).json({ success: false, message: 'Company not found' });
    res.json({ success: true, company, commission: COMMISSION_RATE });
});

exports.livePrices = asyncHandler(async (_req, res) => {
    const companies = await ETFCompany.find({ isActive: true }).select(
        'symbol name exchange price currency change changePercent previousClose'
    );

    const updated = companies.map((c) => {
        const drift = (Math.random() - 0.5) * 0.02;
        const price = +(c.price * (1 + drift)).toFixed(4);
        const change = +(price - (c.previousClose || c.price)).toFixed(4);
        const changePercent = +((change / (c.previousClose || c.price)) * 100).toFixed(3);
        return {
            symbol: c.symbol, name: c.name, exchange: c.exchange,
            price, currency: c.currency, change, changePercent,
            updatedAt: new Date().toISOString()
        };
    });

    res.json({ success: true, updatedAt: new Date().toISOString(), companies: updated });
});

exports.buy = asyncHandler(async (req, res) => {
    const { symbol, shares } = req.body;
    const qty = parseInt(shares, 10);
    if (!qty || qty < 1)
        return res.status(400).json({ success: false, message: 'Invalid shares' });

    const company = await ETFCompany.findOne({ symbol: symbol.toUpperCase() });
    if (!company)
        return res.status(404).json({ success: false, message: 'Company not found' });

    const subtotal = +(company.price * qty).toFixed(4);
    const commission = +(subtotal * COMMISSION_RATE).toFixed(4);
    const total = +(subtotal + commission).toFixed(4);

    const user = await User.findById(req.user._id);
    if (user.wallet.balance < total) {
        return res.status(400).json({ success: false, message: 'Insufficient wallet balance' });
    }

    user.wallet.balance = +(user.wallet.balance - total).toFixed(4);

    const existing = user.etfHoldings.find((h) => h.symbol === company.symbol);
    if (existing) {
        const newShares = existing.shares + qty;
        existing.avgPrice = +(
            (existing.avgPrice * existing.shares + company.price * qty) / newShares
        ).toFixed(4);
        existing.shares = newShares;
    } else {
        user.etfHoldings.push({
            symbol: company.symbol, company: company.name,
            shares: qty, avgPrice: company.price,
            exchange: company.exchange, currency: company.currency
        });
    }
    await user.save();

    const payment = await Payment.create({
        user: user._id, amount: total, method: 'wallet',
        purpose: 'etf-purchase', reference: generateRef('ETF'),
        status: 'completed', paidAt: new Date(),
        metadata: { symbol: company.symbol, shares: qty, price: company.price, commission }
    });

    res.json({
        success: true, message: 'Purchase complete',
        payment, holdings: user.etfHoldings, wallet: user.wallet
    });
});

exports.sell = asyncHandler(async (req, res) => {
    const { symbol, shares } = req.body;
    const qty = parseInt(shares, 10);
    if (!qty || qty < 1)
        return res.status(400).json({ success: false, message: 'Invalid shares' });

    const user = await User.findById(req.user._id);
    const holding = user.etfHoldings.find((h) => h.symbol === symbol.toUpperCase());
    if (!holding || holding.shares < qty) {
        return res.status(400).json({ success: false, message: 'Not enough shares' });
    }

    const company = await ETFCompany.findOne({ symbol: symbol.toUpperCase() });
    const price = company?.price || holding.avgPrice;

    const gross = +(price * qty).toFixed(4);
    const commission = +(gross * COMMISSION_RATE).toFixed(4);
    const net = +(gross - commission).toFixed(4);

    holding.shares -= qty;
    if (holding.shares === 0) {
        user.etfHoldings = user.etfHoldings.filter((h) => h.symbol !== holding.symbol);
    }
    user.wallet.balance = +(user.wallet.balance + net).toFixed(4);
    await user.save();

    const payment = await Payment.create({
        user: user._id, amount: net, method: 'wallet',
        purpose: 'etf-sale', reference: generateRef('ETF'),
        status: 'completed', paidAt: new Date(),
        metadata: { symbol, shares: qty, price, commission }
    });

    res.json({ success: true, message: 'Sale complete', payment, wallet: user.wallet });
});

exports.portfolio = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id);
    const holdings = [];

    let totalValue = 0;
    let totalCost = 0;

    for (const h of user.etfHoldings) {
        const company = await ETFCompany.findOne({ symbol: h.symbol });
        const currentPrice = company?.price ?? h.avgPrice;
        const value = currentPrice * h.shares;
        const cost = h.avgPrice * h.shares;
        totalValue += value;
        totalCost += cost;
        holdings.push({
            symbol: h.symbol, company: h.company, exchange: h.exchange,
            shares: h.shares, avgPrice: h.avgPrice, currentPrice,
            value: +value.toFixed(4), cost: +cost.toFixed(4),
            profit: +(value - cost).toFixed(4),
            profitPercent: cost ? +(((value - cost) / cost) * 100).toFixed(2) : 0,
            currency: h.currency
        });
    }

    res.json({
        success: true,
        portfolio: {
            holdings,
            totalValue: +totalValue.toFixed(4),
            totalCost: +totalCost.toFixed(4),
            totalProfit: +(totalValue - totalCost).toFixed(4),
            totalProfitPercent: totalCost
                ? +(((totalValue - totalCost) / totalCost) * 100).toFixed(2)
                : 0,
            count: holdings.length
        },
        wallet: user.wallet
    });
});