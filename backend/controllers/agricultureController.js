const HardwareItem = require('../models/HardwareItem');
const Order = require('../models/Order');
const AnimalPermit = require('../models/AnimalPermit');
const { asyncHandler, paginate, generateRef, distanceKm } = require('../utils/helpers');

const CATEGORY_LABELS = {
    'meat': '🥩 Meat',
    'eggs-dairy': '🥚 Eggs & Dairy',
    'dried-foods': '🍲 Dried Foods',
    'livestock': '🐄 Livestock',
    'farm-produce': '🌾 Farm Produce',
    'agro-chemicals': '🧪 Agro-Chemicals',
    'farm-services': '🚜 Farm Services',
    'other': '📦 Other'
};

exports.categories = (_req, res) => {
    res.json({
        success: true,
        categories: Object.entries(CATEGORY_LABELS).map(([key, label]) => ({ key, label }))
    });
};

exports.list = asyncHandler(async (req, res) => {
    const { category, q, region, city, lat, lng, radius, minPrice, maxPrice } = req.query;
    const { page, limit, skip } = paginate(req.query);

    const filter = { isActive: true, listingType: 'agriculture' };
    if (category) filter.category = category;
    if (region) filter['location.region'] = region;
    if (city) filter['location.city'] = city;
    if (minPrice || maxPrice) {
        filter.price = {};
        if (minPrice) filter.price.$gte = Number(minPrice);
        if (maxPrice) filter.price.$lte = Number(maxPrice);
    }
    if (q) filter.$or = [
        { name: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } }
    ];

    let listings = await HardwareItem.find(filter).sort({ createdAt: -1 });
    if (lat && lng && radius) {
        const c = { lat: parseFloat(lat), lng: parseFloat(lng) };
        const r = parseFloat(radius);
        listings = listings.filter((l) => {
            const g = l.location || {};
            if (!g.lat || !g.lng) return true;
            return distanceKm(c, { lat: g.lat, lng: g.lng }) <= r;
        });
    }

    const total = listings.length;
    listings = listings.slice(skip, skip + limit);
    res.json({ success: true, total, page, listings });
});

exports.getOne = asyncHandler(async (req, res) => {
    const item = await HardwareItem.findById(req.params.id)
        .populate('vendor', 'name phone email');
    if (!item) return res.status(404).json({ success: false, message: 'Listing not found' });
    res.json({ success: true, listing: item });
});

exports.create = asyncHandler(async (req, res) => {
    const isAdmin = req.headers['x-admin-key'] === process.env.ADMIN_ACCESS_KEY;
    const listing = await HardwareItem.create({
        ...req.body,
        vendor: req.user?._id,
        listingType: 'agriculture',
        isActive: true,
        isFeatured: isAdmin
    });
    res.status(201).json({ success: true, listing });
});

exports.update = asyncHandler(async (req, res) => {
    const listing = await HardwareItem.findOneAndUpdate(
        {
            _id: req.params.id,
            listingType: 'agriculture',
            ...(req.user.role !== 'admin' && { vendor: req.user._id })
        },
        req.body, { new: true, runValidators: true }
    );
    if (!listing) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, listing });
});

exports.remove = asyncHandler(async (req, res) => {
    const listing = await HardwareItem.findOneAndDelete({
        _id: req.params.id,
        listingType: 'agriculture',
        ...(req.user.role !== 'admin' && { vendor: req.user._id })
    });
    if (!listing) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, message: 'Deleted' });
});

exports.checkout = asyncHandler(async (req, res) => {
    const { items, subtotal, tax, total, paymentMethod, delivery, customer } = req.body;

    const order = await Order.create({
        user: req.user?._id,
        items, subtotal, tax, total,
        type: 'agriculture',
        paymentMethod: paymentMethod || 'cash',
        delivery, customer
    });

    for (const it of items) {
        if (it.item) {
            await HardwareItem.findByIdAndUpdate(it.item, {
                $inc: { stock: -Math.abs(it.quantity || 1) }
            });
        }
    }
    res.status(201).json({ success: true, order });
});

exports.createPermit = asyncHandler(async (req, res) => {
    const permit = await AnimalPermit.create({
        ...req.body,
        user: req.user?._id,
        submittedBy: {
            name: req.body.submittedBy?.name,
            phone: req.body.submittedBy?.phone,
            email: req.body.submittedBy?.email
        }
    });
    res.status(201).json({ success: true, message: 'Permit submitted', permit });
});

exports.listPermits = asyncHandler(async (req, res) => {
    const { page, limit, skip } = paginate(req.query);
    const filter = req.user.role === 'admin' ? {} : { user: req.user._id };

    const [permits, total] = await Promise.all([
        AnimalPermit.find(filter).skip(skip).limit(limit).sort({ createdAt: -1 }),
        AnimalPermit.countDocuments(filter)
    ]);
    res.json({ success: true, total, page, permits });
});

exports.getPermit = asyncHandler(async (req, res) => {
    const p = await AnimalPermit.findById(req.params.id);
    if (!p) return res.status(404).json({ success: false, message: 'Permit not found' });
    if (req.user.role !== 'admin' && String(p.user) !== String(req.user._id)) {
        return res.status(403).json({ success: false, message: 'Forbidden' });
    }
    res.json({ success: true, permit: p });
});

exports.notifySeller = asyncHandler(async (req, res) => {
    const { permitId, animalIndex } = req.params;
    const permit = await AnimalPermit.findById(permitId);
    if (!permit) return res.status(404).json({ success: false, message: 'Not found' });

    const entry = permit.animals[animalIndex];
    if (!entry) return res.status(404).json({ success: false, message: 'Animal not found' });

    if (!entry.animal.code) entry.animal.code = generateRef('ZBS-CT');
    entry.notifiedAt = new Date();
    await permit.save();

    res.json({
        success: true,
        message: 'Seller notified',
        code: entry.animal.code,
        sms: `You are selling ${entry.animal.description || 'animal'} (${entry.animal.code}). Reply YES to confirm, NO to decline.`
    });
});

exports.sellerReply = asyncHandler(async (req, res) => {
    const { permitId, animalIndex } = req.params;
    const { reply } = req.body;

    const permit = await AnimalPermit.findById(permitId);
    if (!permit) return res.status(404).json({ success: false, message: 'Not found' });

    const entry = permit.animals[animalIndex];
    if (!entry) return res.status(404).json({ success: false, message: 'Animal not found' });

    entry.confirmState = reply === 'yes' ? 'confirmed' : 'declined';
    await permit.save();

    res.json({ success: true, confirmState: entry.confirmState });
});

exports.notifyOfficer = asyncHandler(async (req, res) => {
    const { permitId, index } = req.params;
    const permit = await AnimalPermit.findById(permitId);
    if (!permit) return res.status(404).json({ success: false, message: 'Not found' });

    const officer = permit.clearances[index];
    if (!officer) return res.status(404).json({ success: false, message: 'Officer not found' });

    officer.notifiedAt = new Date();
    if (!officer.animalCode) {
        const first = permit.animals.find((a) => a.animal.code);
        if (first) officer.animalCode = first.animal.code;
    }
    await permit.save();
    res.json({ success: true, message: 'Officer notified', officer });
});

exports.printPermit = asyncHandler(async (req, res) => {
    const permit = await AnimalPermit.findById(req.params.id);
    if (!permit) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, permit, printable: true });
});