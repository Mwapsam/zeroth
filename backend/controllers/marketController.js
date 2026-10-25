const Shop = require('../models/Shop');
const HardwareItem = require('../models/HardwareItem');
const Order = require('../models/Order');
const User = require('../models/User');
const { signToken } = require('../config/passport');
const { asyncHandler, paginate, distanceKm } = require('../utils/helpers');

exports.listShops = asyncHandler(async (req, res) => {
    const { category, q, city, lat, lng, radius } = req.query;
    const { page, limit, skip } = paginate(req.query);

    const filter = { isActive: true };
    if (category) filter.category = category;
    if (city) filter['location.city'] = city;
    if (q) filter.$or = [
        { name: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } }
    ];

    let shops = await Shop.find(filter).sort({ createdAt: -1 });
    if (lat && lng && radius) {
        const c = { lat: parseFloat(lat), lng: parseFloat(lng) };
        const r = parseFloat(radius);
        shops = shops.filter((s) => distanceKm(c, {
            lat: s.location.lat, lng: s.location.lng
        }) <= r);
    }

    const total = shops.length;
    shops = shops.slice(skip, skip + limit);
    res.json({ success: true, total, page, shops });
});

exports.getShop = asyncHandler(async (req, res) => {
    const shop = await Shop.findById(req.params.id).populate('vendor', 'name email phone');
    if (!shop) return res.status(404).json({ success: false, message: 'Shop not found' });

    const products = await HardwareItem.find({ shop: shop._id, isActive: true });
    res.json({ success: true, shop, products });
});

exports.createShop = asyncHandler(async (req, res) => {
    const shop = await Shop.create({ ...req.body, vendor: req.user._id });
    res.status(201).json({ success: true, shop });
});

exports.updateShop = asyncHandler(async (req, res) => {
    const shop = await Shop.findOneAndUpdate(
        { _id: req.params.id, vendor: req.user._id },
        req.body, { new: true, runValidators: true }
    );
    if (!shop) return res.status(404).json({ success: false, message: 'Not found or not yours' });
    res.json({ success: true, shop });
});

exports.deleteShop = asyncHandler(async (req, res) => {
    const shop = await Shop.findOneAndDelete({ _id: req.params.id, vendor: req.user._id });
    if (!shop) return res.status(404).json({ success: false, message: 'Not found or not yours' });
    await HardwareItem.updateMany({ shop: shop._id }, { isActive: false });
    res.json({ success: true, message: 'Deleted' });
});

exports.myShops = asyncHandler(async (req, res) => {
    const shops = await Shop.find({ vendor: req.user._id });
    res.json({ success: true, shops });
});

exports.vendorRegister = asyncHandler(async (req, res) => {
    const { name, email, password, phone, country } = req.body;
    if (await User.findOne({ email }))
        return res.status(409).json({ success: false, message: 'Email already registered' });

    const user = await User.create({
        name, email, password,
        phone: phone || '+260000000000',
        country: country || 'ZM',
        role: 'vendor', isVerified: true
    });
    res.status(201).json({
        success: true, token: signToken(user), user: user.toPublic()
    });
});

exports.createOrder = asyncHandler(async (req, res) => {
    const { items, subtotal, tax = 0, deliveryFee = 0, total,
            type = 'market', paymentMethod = 'cash', delivery, customer } = req.body;

    const order = await Order.create({
        user: req.user?._id, items, subtotal, tax, deliveryFee, total, type,
        paymentMethod, delivery, customer
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

exports.listMyOrders = asyncHandler(async (req, res) => {
    const { page, limit, skip } = paginate(req.query);
    const filter = { user: req.user._id };
    if (req.query.type) filter.type = req.query.type;
    if (req.query.status) filter.status = req.query.status;

    const [orders, total] = await Promise.all([
        Order.find(filter).skip(skip).limit(limit).sort({ createdAt: -1 }),
        Order.countDocuments(filter)
    ]);
    res.json({ success: true, total, page, orders });
});

exports.getOrder = asyncHandler(async (req, res) => {
    const o = await Order.findById(req.params.id);
    if (!o) return res.status(404).json({ success: false, message: 'Order not found' });
    if (req.user.role !== 'admin' && String(o.user) !== String(req.user._id)) {
        return res.status(403).json({ success: false, message: 'Forbidden' });
    }
    res.json({ success: true, order: o });
});

exports.updateOrderStatus = asyncHandler(async (req, res) => {
    const o = await Order.findByIdAndUpdate(req.params.id, { status: req.body.status },
        { new: true, runValidators: true });
    if (!o) return res.status(404).json({ success: false, message: 'Order not found' });
    res.json({ success: true, order: o });
});