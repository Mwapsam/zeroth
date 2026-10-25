const HardwareItem = require('../models/HardwareItem');
const { asyncHandler, paginate, distanceKm } = require('../utils/helpers');

exports.list = asyncHandler(async (req, res) => {
    const { category, q, city, minPrice, maxPrice, listingType, lat, lng, radius } = req.query;
    const { page, limit, skip } = paginate(req.query);

    const filter = { isActive: true };
    if (category) filter.category = category;
    if (city) filter['location.city'] = city;
    if (listingType) filter.listingType = listingType;

    if (minPrice || maxPrice) {
        filter.price = {};
        if (minPrice) filter.price.$gte = Number(minPrice);
        if (maxPrice) filter.price.$lte = Number(maxPrice);
    }
    if (q) filter.$or = [
        { name: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } }
    ];

    let items = await HardwareItem.find(filter).sort({ createdAt: -1 });

    if (lat && lng && radius) {
        const center = { lat: parseFloat(lat), lng: parseFloat(lng) };
        const r = parseFloat(radius);
        items = items.filter((it) => {
            const g = it.location || {};
            if (!g.lat || !g.lng) return true;
            return distanceKm(center, { lat: g.lat, lng: g.lng }) <= r;
        });
    }

    const total = items.length;
    items = items.slice(skip, skip + limit);
    res.json({ success: true, total, page, items });
});

exports.getOne = asyncHandler(async (req, res) => {
    const item = await HardwareItem.findById(req.params.id)
        .populate('vendor', 'name email phone')
        .populate('shop', 'name location contact');
    if (!item) return res.status(404).json({ success: false, message: 'Item not found' });
    res.json({ success: true, item });
});

exports.create = asyncHandler(async (req, res) => {
    const item = await HardwareItem.create({
        ...req.body, vendor: req.user._id,
        listingType: req.body.listingType || 'hardware'
    });
    res.status(201).json({ success: true, item });
});

exports.update = asyncHandler(async (req, res) => {
    const item = await HardwareItem.findOneAndUpdate(
        { _id: req.params.id, vendor: req.user._id },
        req.body, { new: true, runValidators: true }
    );
    if (!item) return res.status(404).json({ success: false, message: 'Not found or not yours' });
    res.json({ success: true, item });
});

exports.remove = asyncHandler(async (req, res) => {
    const item = await HardwareItem.findOneAndDelete({
        _id: req.params.id, vendor: req.user._id
    });
    if (!item) return res.status(404).json({ success: false, message: 'Not found or not yours' });
    res.json({ success: true, message: 'Deleted' });
});

exports.listMine = asyncHandler(async (req, res) => {
    const items = await HardwareItem.find({ vendor: req.user._id }).sort({ createdAt: -1 });
    res.json({ success: true, count: items.length, items });
});