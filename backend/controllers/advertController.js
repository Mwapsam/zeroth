const Advert = require('../models/Advert');
const { asyncHandler, paginate } = require('../utils/helpers');

exports.list = asyncHandler(async (req, res) => {
    const { placement } = req.query;
    const now = new Date();

    const filter = {
        status: { $in: ['approved', 'active'] },
        startsAt: { $lte: now },
        $or: [{ endsAt: null }, { endsAt: { $exists: false } }, { endsAt: { $gt: now } }]
    };
    if (placement) filter.placement = placement;

    const adverts = await Advert.find(filter).sort({ startsAt: -1 }).limit(50);
    res.json({ success: true, count: adverts.length, adverts });
});

exports.create = asyncHandler(async (req, res) => {
    const { title, text, imageUrl, linkUrl, placement, startsAt, endsAt } = req.body;

    const advert = await Advert.create({
        advertiser: req.user?._id,
        title, text, imageUrl, linkUrl, placement, startsAt, endsAt
    });
    res.status(201).json({ success: true, message: 'Advert submitted for review', advert });
});

exports.mine = asyncHandler(async (req, res) => {
    const { page, limit, skip } = paginate(req.query);
    const filter = { advertiser: req.user._id };

    const [adverts, total] = await Promise.all([
        Advert.find(filter).skip(skip).limit(limit).sort({ createdAt: -1 }),
        Advert.countDocuments(filter)
    ]);
    res.json({ success: true, total, page, adverts });
});

exports.trackImpression = asyncHandler(async (req, res) => {
    const a = await Advert.findByIdAndUpdate(req.params.id, { $inc: { impressions: 1 } });
    if (!a) return res.status(404).json({ success: false, message: 'Advert not found' });
    res.json({ success: true });
});

exports.trackClick = asyncHandler(async (req, res) => {
    const a = await Advert.findByIdAndUpdate(req.params.id, { $inc: { clicks: 1 } });
    if (!a) return res.status(404).json({ success: false, message: 'Advert not found' });
    res.json({ success: true });
});

exports.updateStatus = asyncHandler(async (req, res) => {
    const a = await Advert.findByIdAndUpdate(req.params.id, { status: req.body.status },
        { new: true, runValidators: true });
    if (!a) return res.status(404).json({ success: false, message: 'Advert not found' });
    res.json({ success: true, advert: a });
});
