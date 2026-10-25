const Service = require('../models/Service');
const { asyncHandler, paginate } = require('../utils/helpers');

exports.list = asyncHandler(async (req, res) => {
    const { category, q, hub } = req.query;
    const { page, limit, skip } = paginate(req.query);

    const filter = { isActive: true };
    if (category) filter.category = category;
    if (hub) filter.hub = hub;
    if (q) filter.$or = [
        { name: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } }
    ];

    const [services, total] = await Promise.all([
        Service.find(filter).skip(skip).limit(limit).sort({ order: 1, createdAt: -1 }),
        Service.countDocuments(filter)
    ]);
    res.json({ success: true, count: services.length, total, page, services });
});

exports.getOne = asyncHandler(async (req, res) => {
    const s = await Service.findById(req.params.id);
    if (!s) return res.status(404).json({ success: false, message: 'Service not found' });
    res.json({ success: true, service: s });
});

exports.create = asyncHandler(async (req, res) => {
    const s = await Service.create(req.body);
    res.status(201).json({ success: true, service: s });
});

exports.update = asyncHandler(async (req, res) => {
    const s = await Service.findByIdAndUpdate(req.params.id, req.body, {
        new: true, runValidators: true
    });
    if (!s) return res.status(404).json({ success: false, message: 'Service not found' });
    res.json({ success: true, service: s });
});

exports.remove = asyncHandler(async (req, res) => {
    const s = await Service.findByIdAndDelete(req.params.id);
    if (!s) return res.status(404).json({ success: false, message: 'Service not found' });
    res.json({ success: true, message: 'Deleted' });
});