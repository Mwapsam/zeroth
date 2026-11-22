/* ============================================================
   MARKET CONTROLLER
   Shops, products, orders.
   The frontend sends `{ type: 'shop' | 'product' | 'order', ... }`
   so this controller dispatches accordingly.
   ============================================================ */
const Shop = require('../models/Shop');
const HardwareItem = require('../models/HardwareItem');
const Order = require('../models/Order');
const User = require('../models/User');
const { signToken } = require('../config/passport');
const { asyncHandler, paginate, distanceKm } = require('../utils/helpers');

/* ============================================================
   LIST SHOPS
   ============================================================ */
exports.listShops = asyncHandler(async (req, res) => {
    const { category, q, city, lat, lng, radius } = req.query;
    const { page, limit, skip } = paginate(req.query);

    const filter = { isActive: true };
    if (category) filter.category = category;
    if (city) filter['location.city'] = city;
    if (q) {
        filter.$or = [
            { name: { $regex: q, $options: 'i' } },
            { description: { $regex: q, $options: 'i' } }
        ];
    }

    let shops = await Shop.find(filter).sort({ createdAt: -1 });

    if (lat && lng && radius && shops.length) {
        const c = { lat: parseFloat(lat), lng: parseFloat(lng) };
        const r = parseFloat(radius);
        shops = shops.filter((s) =>
            s.location?.lat && s.location?.lng
                ? distanceKm(c, { lat: s.location.lat, lng: s.location.lng }) <= r
                : true
        );
    }

    const total = shops.length;
    shops = shops.slice(skip, skip + limit);

    res.json({
        success: true,
        total,
        page,
        shops: shops.map((s) => {
            const obj = s.toObject();
            obj.id = String(obj._id);
            return obj;
        })
    });
});

/* ============================================================
   GET SHOP
   ============================================================ */
exports.getShop = asyncHandler(async (req, res) => {
    const shop = await Shop.findById(req.params.id).populate('vendor', 'name email phone');
    if (!shop) {
        return res.status(404).json({ success: false, message: 'Shop not found' });
    }

    const products = await HardwareItem.find({ shop: shop._id, isActive: true });

    const sObj = shop.toObject();
    sObj.id = String(sObj._id);

    res.json({
        success: true,
        shop: sObj,
        products: products.map((p) => {
            const obj = p.toObject();
            obj.id = String(obj._id);
            return obj;
        })
    });
});

/* ============================================================
   CREATE SHOP
   ============================================================ */
exports.createShop = asyncHandler(async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    const body = req.body || {};
    const payload = {
        ...body,
        vendor: req.user._id,
        isActive: true
    };

    /* Frontend sends `{ category, address, lat, lng, description }` */
    if (!payload.location && (body.address || body.lat || body.lng)) {
        payload.location = {
            address: body.address || '',
            lat: body.lat != null ? Number(body.lat) : null,
            lng: body.lng != null ? Number(body.lng) : null
        };
    }

    const shop = await Shop.create(payload);

    const obj = shop.toObject();
    obj.id = String(obj._id);
    res.status(201).json({ success: true, shop: obj });
});

/* ============================================================
   UPDATE SHOP
   ============================================================ */
exports.updateShop = asyncHandler(async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    const shop = await Shop.findOneAndUpdate(
        { _id: req.params.id, vendor: req.user._id },
        req.body || {},
        { new: true, runValidators: true }
    );

    if (!shop) {
        return res.status(404).json({ success: false, message: 'Not found or not yours' });
    }
    res.json({ success: true, shop });
});

/* ============================================================
   DELETE SHOP
   ============================================================ */
exports.deleteShop = asyncHandler(async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    const shop = await Shop.findOneAndDelete({
        _id: req.params.id,
        vendor: req.user._id
    });

    if (!shop) {
        return res.status(404).json({ success: false, message: 'Not found or not yours' });
    }
    await HardwareItem.updateMany({ shop: shop._id }, { isActive: false });
    res.json({ success: true, message: 'Deleted' });
});

/* ============================================================
   MY SHOPS
   ============================================================ */
exports.myShops = asyncHandler(async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    const shops = await Shop.find({ vendor: req.user._id });
    res.json({
        success: true,
        shops: shops.map((s) => {
            const obj = s.toObject();
            obj.id = String(obj._id);
            return obj;
        })
    });
});

/* ============================================================
   VENDOR REGISTER
   ============================================================ */
exports.vendorRegister = asyncHandler(async (req, res) => {
    const { name, email, password, phone, country } = req.body || {};

    if (!name || !email || !password) {
        return res.status(400).json({
            success: false,
            message: 'name, email and password are required'
        });
    }

    if (await User.findOne({ email: String(email).toLowerCase() })) {
        return res.status(409).json({ success: false, message: 'Email already registered' });
    }

    const user = await User.create({
        name,
        email: String(email).toLowerCase(),
        password,
        phone: phone || '+260000000000',
        country: country || 'ZM',
        role: 'vendor',
        isVerified: true
    });

    res.status(201).json({
        success: true,
        token: signToken(user),
        user: user.toPublic()
    });
});

/* ============================================================
   CREATE ORDER
   ============================================================ */
exports.createOrder = asyncHandler(async (req, res) => {
    const {
        items = [],
        subtotal = 0,
        tax = 0,
        deliveryFee = 0,
        total = 0,
        type = 'market',
        paymentMethod = 'cash',
        delivery,
        customer
    } = req.body || {};

    const order = await Order.create({
        user: req.user?._id,
        items, subtotal, tax, deliveryFee, total, type,
        paymentMethod, delivery, customer
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
   LIST MY ORDERS
   ============================================================ */
exports.listMyOrders = asyncHandler(async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    const { page, limit, skip } = paginate(req.query);
    const filter = { user: req.user._id };
    if (req.query.type) filter.type = req.query.type;
    if (req.query.status) filter.status = req.query.status;

    const [orders, total] = await Promise.all([
        Order.find(filter).skip(skip).limit(limit).sort({ createdAt: -1 }),
        Order.countDocuments(filter)
    ]);

    res.json({
        success: true,
        total,
        page,
        orders: orders.map((o) => {
            const obj = o.toObject();
            obj.id = String(obj._id);
            return obj;
        })
    });
});

/* ============================================================
   GET ORDER
   ============================================================ */
exports.getOrder = asyncHandler(async (req, res) => {
    const o = await Order.findById(req.params.id);
    if (!o) {
        return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const isAdmin = req.user?.role === 'admin';
    const isOwner = String(o.user) === String(req.user?._id);
    if (!isAdmin && !isOwner) {
        return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const obj = o.toObject();
    obj.id = String(obj._id);
    res.json({ success: true, order: obj });
});

/* ============================================================
   UPDATE ORDER STATUS (admin)
   ============================================================ */
exports.updateOrderStatus = asyncHandler(async (req, res) => {
    const { status } = req.body || {};
    if (!status) {
        return res.status(400).json({ success: false, message: 'status is required' });
    }

    const o = await Order.findByIdAndUpdate(
        req.params.id,
        { status },
        { new: true, runValidators: true }
    );

    if (!o) {
        return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const obj = o.toObject();
    obj.id = String(obj._id);
    res.json({ success: true, order: obj });
});

/* ============================================================
   GENERIC DISPATCHER — POST /api/market with { type, ... }
   ============================================================ */
exports.create = asyncHandler(async (req, res) => {
    const type = (req.body || {}).type;

    switch (type) {
        case 'shop':    return exports.createShop(req, res);
        case 'product': return createProductHandler(req, res);
        case 'order':   return exports.createOrder(req, res);
        default:
            return res.status(400).json({
                success: false,
                message: "type must be 'shop', 'product', or 'order'"
            });
    }
});

/* Product creation handler — used by the dispatcher */
async function createProductHandler(req, res) {
    if (!req.user) {
        return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    const body = req.body || {};
    const product = await HardwareItem.create({
        vendor: req.user._id,
        shop: body.shopId || body.shop,
        listingType: 'market',
        name: body.name,
        description: body.description || '',
        category: body.category || '',
        price: Number(body.price) || 0,
        stock: Number(body.stock || body.quantity) || 0,
        unit: body.unit || '',
        isActive: true
    });

    const obj = product.toObject();
    obj.id = String(obj._id);
    return res.status(201).json({ success: true, product: obj, item: obj });
}

/* ============================================================
   LIST dispatcher — GET /api/market?type=...
   ============================================================ */
exports.list = asyncHandler(async (req, res) => {
    const type = req.query.type;
    switch (type) {
        case 'shop':    return exports.listShops(req, res);
        case 'product': return listProductsHandler(req, res);
        case 'order':   return exports.listMyOrders(req, res);
        default:
            return res.status(400).json({
                success: false,
                message: "type must be 'shop', 'product', or 'order'"
            });
    }
});

async function listProductsHandler(req, res) {
    const { q, category, shopId } = req.query;
    const { page, limit, skip } = paginate(req.query);

    const filter = { isActive: true, listingType: 'market' };
    if (category) filter.category = category;
    if (shopId) filter.shop = shopId;
    if (q) {
        filter.$or = [
            { name: { $regex: q, $options: 'i' } },
            { description: { $regex: q, $options: 'i' } }
        ];
    }

    const [products, total] = await Promise.all([
        HardwareItem.find(filter).skip(skip).limit(limit).sort({ createdAt: -1 }),
        HardwareItem.countDocuments(filter)
    ]);

    return res.json({
        success: true,
        total,
        page,
        products: products.map((p) => {
            const obj = p.toObject();
            obj.id = String(obj._id);
            return obj;
        })
    });
}