/* ============================================================
   CONTACT CONTROLLER
   ============================================================ */
const Contact = require('../models/Contact');
const { asyncHandler, paginate } = require('../utils/helpers');

/* ============================================================
   CREATE
   ============================================================ */
exports.create = asyncHandler(async (req, res) => {
    const body = req.body || {};

    const doc = await Contact.create({
        name: body.name || body.fullName || 'Guest',
        email: body.email || '',
        phone: body.phone || '',
        subject: body.subject || body.topic || '',
        message: body.message || body.body || body.text || '',
        ip: req.ip,
        userAgent: req.get('user-agent')
    });

    const obj = doc.toObject();
    obj.id = String(obj._id);
    res.status(201).json({ success: true, message: 'Message received', contact: obj });
});

/* ============================================================
   LIST (admin)
   ============================================================ */
exports.list = asyncHandler(async (req, res) => {
    const { page, limit, skip } = paginate(req.query);
    const filter = {};
    if (req.query.status) filter.status = req.query.status;

    const [contacts, total] = await Promise.all([
        Contact.find(filter).skip(skip).limit(limit).sort({ createdAt: -1 }),
        Contact.countDocuments(filter)
    ]);

    res.json({
        success: true,
        total,
        page,
        contacts: contacts.map((c) => {
            const obj = c.toObject();
            obj.id = String(obj._id);
            return obj;
        })
    });
});

/* ============================================================
   UPDATE STATUS
   ============================================================ */
exports.updateStatus = asyncHandler(async (req, res) => {
    const { status } = req.body || {};
    if (!status) {
        return res.status(400).json({ success: false, message: 'status is required' });
    }

    const c = await Contact.findByIdAndUpdate(
        req.params.id,
        { status },
        { new: true, runValidators: true }
    );

    if (!c) {
        return res.status(404).json({ success: false, message: 'Not found' });
    }

    const obj = c.toObject();
    obj.id = String(obj._id);
    res.json({ success: true, contact: obj });
});

/* ============================================================
   DELETE
   ============================================================ */
exports.remove = asyncHandler(async (req, res) => {
    const c = await Contact.findByIdAndDelete(req.params.id);
    if (!c) {
        return res.status(404).json({ success: false, message: 'Not found' });
    }
    res.json({ success: true, message: 'Deleted' });
});