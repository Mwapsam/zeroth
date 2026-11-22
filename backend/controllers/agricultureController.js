/* ============================================================
   AGRICULTURE CONTROLLER — controllers/agricultureController.js
   Listings, checkout, animal permits.
   ============================================================ */
const HardwareItem = require('../models/HardwareItem');
const Order = require('../models/Order');
const AnimalPermit = require('../models/AnimalPermit');
const { asyncHandler, paginate, generateRef, distanceKm } = require('../utils/helpers');

/* ---------- Admin key resolver ---------- */
function adminKeyValid(req) {
    const provided = req.headers['x-admin-key'];
    const expected = process.env.ADMIN_KEY || process.env.ADMIN_ACCESS_KEY;
    return Boolean(provided && expected && provided === expected);
}

/* ---------- Category labels ---------- */
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

/* ============================================================
   CATEGORIES
   ============================================================ */
exports.categories = (_req, res) => {
    res.json({
        success: true,
        categories: Object.entries(CATEGORY_LABELS).map(([key, label]) => ({ key, label }))
    });
};

/* ============================================================
   LIST
   ============================================================ */
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
    if (q) {
        filter.$or = [
            { name: { $regex: q, $options: 'i' } },
            { description: { $regex: q, $options: 'i' } }
        ];
    }

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

    /* Ensure every listing has an `.id` (frontend expects it) */
    const normalized = listings.map((l) => {
        const obj = l.toObject ? l.toObject() : l;
        obj.id = String(obj._id);
        return obj;
    });

    res.json({ success: true, total, page, listings: normalized });
});

/* ============================================================
   GET ONE
   ============================================================ */
exports.getOne = asyncHandler(async (req, res) => {
    const item = await HardwareItem.findById(req.params.id)
        .populate('vendor', 'name phone email');

    if (!item) {
        return res.status(404).json({ success: false, message: 'Listing not found' });
    }

    const obj = item.toObject();
    obj.id = String(obj._id);
    res.json({ success: true, listing: obj });
});

/* ============================================================
   CREATE
   ============================================================ */
exports.create = asyncHandler(async (req, res) => {
    const isAdmin = adminKeyValid(req);

    const body = req.body || {};
    const payload = {
        ...body,
        vendor: req.user?._id,
        listingType: 'agriculture',
        isActive: true,
        isFeatured: isAdmin
    };

    /* Map the frontend shape (name/desc/price/qty/region/city/...) to HardwareItem */
    if (body.seller && !payload.vendorName) payload.vendorName = body.seller;
    if (body.phone && !payload.contactPhone) payload.contactPhone = body.phone;
    if (!payload.location && (body.region || body.city || body.lat || body.lng)) {
        payload.location = {
            region: body.region || '',
            city:   body.city   || '',
            lat:    body.lat != null ? Number(body.lat) : null,
            lng:    body.lng != null ? Number(body.lng) : null
        };
    }
    if (body.desc && !payload.description) payload.description = body.desc;
    if (body.qty != null && payload.stock == null) payload.stock = Number(body.qty);

    const listing = await HardwareItem.create(payload);

    const obj = listing.toObject();
    obj.id = String(obj._id);
    res.status(201).json({ success: true, listing: obj });
});

/* ============================================================
   UPDATE
   ============================================================ */
exports.update = asyncHandler(async (req, res) => {
    const isAdmin = req.user?.role === 'admin';
    const filter = { _id: req.params.id, listingType: 'agriculture' };
    if (!isAdmin && req.user?._id) filter.vendor = req.user._id;

    const listing = await HardwareItem.findOneAndUpdate(
        filter,
        req.body || {},
        { new: true, runValidators: true }
    );

    if (!listing) {
        return res.status(404).json({ success: false, message: 'Not found' });
    }

    const obj = listing.toObject();
    obj.id = String(obj._id);
    res.json({ success: true, listing: obj });
});

/* ============================================================
   REMOVE
   ============================================================ */
exports.remove = asyncHandler(async (req, res) => {
    const isAdmin = req.user?.role === 'admin';
    const filter = { _id: req.params.id, listingType: 'agriculture' };
    if (!isAdmin && req.user?._id) filter.vendor = req.user._id;

    const listing = await HardwareItem.findOneAndDelete(filter);
    if (!listing) {
        return res.status(404).json({ success: false, message: 'Not found' });
    }
    res.json({ success: true, message: 'Deleted' });
});

/* ============================================================
   CHECKOUT
   ============================================================ */
exports.checkout = asyncHandler(async (req, res) => {
    const { items = [], subtotal = 0, tax = 0, total = 0,
            paymentMethod = 'cash', delivery, customer } = req.body || {};

    const order = await Order.create({
        user: req.user?._id,
        items, subtotal, tax, total,
        type: 'agriculture',
        paymentMethod,
        delivery,
        customer
    });

    for (const it of items) {
        if (it.item) {
            await HardwareItem.findByIdAndUpdate(it.item, {
                $inc: { stock: -Math.abs(it.quantity || 1) }
            });
        }
    }

    const obj = order.toObject();
    obj.id = String(obj._id);
    res.status(201).json({ success: true, order: obj });
});

/* ============================================================
   ANIMAL PERMIT — create
   ============================================================ */
exports.createPermit = asyncHandler(async (req, res) => {
    const body = req.body || {};

    /* Frontend sends sellers[] + clearance{chief,vet,police};
       map to the model's `animals[]` shape. */
    const animals = Array.isArray(body.sellers)
        ? body.sellers.map((s) => ({
            seller: {
                name: s.name,
                nrc: s.nrc,
                phone: s.phone
            },
            animal: {
                description: s.animalDesc,
                code: s.code || undefined,
                colour: s.colour
            },
            village: s.village,
            district: s.district,
            province: s.province,
            confirmState: s.confirmState || 'pending'
        }))
        : body.animals || [];

    const clearances = body.clearance
        ? ['chief', 'vet', 'police'].map((role) => ({
            role,
            name: body.clearance[role]?.name,
            nrc: body.clearance[role]?.nrc,
            phone: body.clearance[role]?.phone,
            comment: body.clearance[role]?.comment,
            village: body.clearance[role]?.village,
            district: body.clearance[role]?.district,
            province: body.clearance[role]?.province,
            animalCode: body.clearance[role]?.animalCode
        }))
        : body.clearances || [];

    const permit = await AnimalPermit.create({
        user: req.user?._id,
        from: body.from,
        to: body.to,
        zbsRep: body.zbsRep,
        zbsRepDate: body.zbsRepDate ? new Date(body.zbsRepDate) : undefined,
        animals,
        clearances,
        vetVideoNotes: body.vetVideoNotes,
        reference: body.reference || generateRef('PERMIT'),
        status: 'pending'
    });

    const obj = permit.toObject();
    obj.id = String(obj._id);
    res.status(201).json({ success: true, message: 'Permit submitted', permit: obj });
});

/* ============================================================
   ANIMAL PERMIT — list
   ============================================================ */
exports.listPermits = asyncHandler(async (req, res) => {
    const { page, limit, skip } = paginate(req.query);
    const filter = req.user?.role === 'admin' ? {} : { user: req.user?._id };

    const [permits, total] = await Promise.all([
        AnimalPermit.find(filter).skip(skip).limit(limit).sort({ createdAt: -1 }),
        AnimalPermit.countDocuments(filter)
    ]);

    const normalized = permits.map((p) => {
        const obj = p.toObject();
        obj.id = String(obj._id);
        return obj;
    });

    res.json({ success: true, total, page, permits: normalized });
});

/* ============================================================
   ANIMAL PERMIT — get
   ============================================================ */
exports.getPermit = asyncHandler(async (req, res) => {
    const p = await AnimalPermit.findById(req.params.id);
    if (!p) {
        return res.status(404).json({ success: false, message: 'Permit not found' });
    }

    const isAdmin = req.user?.role === 'admin';
    const isOwner = String(p.user) === String(req.user?._id);
    if (!isAdmin && !isOwner) {
        return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const obj = p.toObject();
    obj.id = String(obj._id);
    res.json({ success: true, permit: obj });
});

/* ============================================================
   NOTIFY SELLER
   ============================================================ */
exports.notifySeller = asyncHandler(async (req, res) => {
    const { permitId, animalIndex } = req.params;
    const permit = await AnimalPermit.findById(permitId);
    if (!permit) {
        return res.status(404).json({ success: false, message: 'Not found' });
    }

    const entry = permit.animals[animalIndex];
    if (!entry) {
        return res.status(404).json({ success: false, message: 'Animal not found' });
    }

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

/* ============================================================
   SELLER REPLY
   ============================================================ */
exports.sellerReply = asyncHandler(async (req, res) => {
    const { permitId, animalIndex } = req.params;
    const { reply } = req.body || {};

    const permit = await AnimalPermit.findById(permitId);
    if (!permit) {
        return res.status(404).json({ success: false, message: 'Not found' });
    }

    const entry = permit.animals[animalIndex];
    if (!entry) {
        return res.status(404).json({ success: false, message: 'Animal not found' });
    }

    entry.confirmState = reply === 'yes' ? 'confirmed' : 'declined';
    await permit.save();

    res.json({ success: true, confirmState: entry.confirmState });
});

/* ============================================================
   NOTIFY OFFICER
   ============================================================ */
exports.notifyOfficer = asyncHandler(async (req, res) => {
    const { permitId, index } = req.params;
    const permit = await AnimalPermit.findById(permitId);
    if (!permit) {
        return res.status(404).json({ success: false, message: 'Not found' });
    }

    const officer = permit.clearances[index];
    if (!officer) {
        return res.status(404).json({ success: false, message: 'Officer not found' });
    }

    officer.notifiedAt = new Date();
    if (!officer.animalCode) {
        const first = permit.animals.find((a) => a.animal.code);
        if (first) officer.animalCode = first.animal.code;
    }
    await permit.save();

    res.json({ success: true, message: 'Officer notified', officer });
});

/* ============================================================
   PRINT PERMIT
   ============================================================ */
exports.printPermit = asyncHandler(async (req, res) => {
    const permit = await AnimalPermit.findById(req.params.id);
    if (!permit) {
        return res.status(404).json({ success: false, message: 'Not found' });
    }
    res.json({ success: true, permit, printable: true });
});