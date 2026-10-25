const Contact = require('../models/Contact');
const { asyncHandler, paginate } = require('../utils/helpers');

exports.create = asyncHandler(async (req, res) => {
    const c = await Contact.create({
        ...req.body, ip: req.ip, userAgent: req.get('user-agent')
    });
    res.status(201).json({ success: true, message: 'Message received', contact: c });
});

exports.list = asyncHandler(async (req, res) => {
    const { page, limit, skip } = paginate(req.query);
    const filter = {};
    if (req.query.status) filter.status = req.query.status;

    const [contacts, total] = await Promise.all([
        Contact.find(filter).skip(skip).limit(limit).sort({ createdAt: -1 }),
        Contact.countDocuments(filter)
    ]);
    res.json({ success: true, total, page, contacts });
});

exports.updateStatus = asyncHandler(async (req, res) => {
    const c = await Contact.findByIdAndUpdate(req.params.id, { status: req.body.status },
        { new: true, runValidators: true });
    if (!c) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, contact: c });
});

exports.remove = asyncHandler(async (req, res) => {
    const c = await Contact.findByIdAndDelete(req.params.id);
    if (!c) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, message: 'Deleted' });
});