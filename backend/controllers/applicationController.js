const Application = require('../models/Application');
const { asyncHandler, paginate } = require('../utils/helpers');
const { sendApplicationAck } = require('../utils/mailer');

exports.create = asyncHandler(async (req, res) => {
    const { type, applicantName, applicantEmail, applicantPhone, data, notes } = req.body;

    const application = await Application.create({
        user: req.user?._id,
        type: type || 'loan',
        applicantName,
        applicantEmail,
        applicantPhone,
        data: data || {},
        notes
    });

    sendApplicationAck(application).catch(() => {});

    res.status(201).json({
        success: true, message: 'Application submitted',
        reference: application.reference, application
    });
});

exports.listMine = asyncHandler(async (req, res) => {
    const { page, limit, skip } = paginate(req.query);
    const filter = req.user
        ? { user: req.user._id }
        : { applicantEmail: (req.query.email || '').toLowerCase() };

    const [applications, total] = await Promise.all([
        Application.find(filter).skip(skip).limit(limit).sort({ createdAt: -1 }),
        Application.countDocuments(filter)
    ]);
    res.json({ success: true, total, page, applications });
});

exports.getOne = asyncHandler(async (req, res) => {
    const a = await Application.findById(req.params.id);
    if (!a) return res.status(404).json({ success: false, message: 'Not found' });

    const isOwner = String(a.user) === String(req.user?._id);
    const isEmailOwner = a.applicantEmail === req.user?.email;
    if (req.user?.role !== 'admin' && !isOwner && !isEmailOwner) {
        return res.status(403).json({ success: false, message: 'Forbidden' });
    }
    res.json({ success: true, application: a });
});

exports.listAll = asyncHandler(async (req, res) => {
    const { page, limit, skip } = paginate(req.query);
    const filter = {};
    if (req.query.type) filter.type = req.query.type;
    if (req.query.status) filter.status = req.query.status;

    const [applications, total] = await Promise.all([
        Application.find(filter).skip(skip).limit(limit)
            .sort({ createdAt: -1 }).populate('user', 'name email'),
        Application.countDocuments(filter)
    ]);
    res.json({ success: true, total, page, applications });
});

exports.updateStatus = asyncHandler(async (req, res) => {
    const { status, adminNotes } = req.body;
    const a = await Application.findByIdAndUpdate(
        req.params.id,
        {
            ...(status && { status }),
            ...(adminNotes && { adminNotes }),
            reviewedBy: req.user._id,
            reviewedAt: new Date()
        },
        { new: true, runValidators: true }
    );
    if (!a) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, application: a });
});