/* ============================================================
   APPLICATION CONTROLLER
   Handles loans, share purchases, partner applications, etc.
   The frontend sends a flat payload; we normalise it here.
   ============================================================ */
const Application = require('../models/Application');
const { asyncHandler, paginate } = require('../utils/helpers');
const { sendApplicationAck } = require('../utils/mailer');

/* ---------- Normaliser ---------- */
function normalizePayload(body = {}) {
    /* New frontend shape (financial-hub, agriculture, etc.) */
    const flatName =
        body.applicantName ||
        [body.firstName, body.surname].filter(Boolean).join(' ') ||
        body.fullName ||
        body.name ||
        '';

    const flatEmail = (body.applicantEmail || body.email || '').toLowerCase().trim();
    const flatPhone = body.applicantPhone || body.phone || body.phoneNumber || '';

    /* Everything else becomes the application's `data` blob */
    const data = { ...body };
    delete data.applicantName;
    delete data.applicantEmail;
    delete data.applicantPhone;
    delete data.type;
    delete data.notes;

    return {
        type: body.type || 'loan',
        applicantName: flatName,
        applicantEmail: flatEmail,
        applicantPhone: flatPhone,
        data,
        notes: body.notes || ''
    };
}

/* ============================================================
   CREATE
   ============================================================ */
exports.create = asyncHandler(async (req, res) => {
    const payload = normalizePayload(req.body);

    if (!payload.applicantName && !payload.applicantEmail) {
        return res.status(400).json({
            success: false,
            message: 'At least applicantName or applicantEmail is required'
        });
    }

    const application = await Application.create({
        user: req.user?._id,
        ...payload
    });

    /* Fire-and-forget ack email — never blocks the response */
    sendApplicationAck(application).catch(() => {});

    const obj = application.toObject();
    obj.id = String(obj._id);
    res.status(201).json({
        success: true,
        message: 'Application submitted',
        reference: application.reference,
        application: obj
    });
});

/* ============================================================
   LIST MINE
   ============================================================ */
exports.listMine = asyncHandler(async (req, res) => {
    const { page, limit, skip } = paginate(req.query);

    const filter = req.user
        ? { user: req.user._id }
        : { applicantEmail: String(req.query.email || '').toLowerCase() };

    const [applications, total] = await Promise.all([
        Application.find(filter).skip(skip).limit(limit).sort({ createdAt: -1 }),
        Application.countDocuments(filter)
    ]);

    res.json({
        success: true,
        total,
        page,
        applications: applications.map((a) => {
            const obj = a.toObject();
            obj.id = String(obj._id);
            return obj;
        })
    });
});

/* ============================================================
   GET ONE
   ============================================================ */
exports.getOne = asyncHandler(async (req, res) => {
    const a = await Application.findById(req.params.id);
    if (!a) {
        return res.status(404).json({ success: false, message: 'Not found' });
    }

    const isAdmin = req.user?.role === 'admin';
    const isOwner = String(a.user) === String(req.user?._id);
    const isEmailOwner = a.applicantEmail === req.user?.email;
    if (!isAdmin && !isOwner && !isEmailOwner) {
        return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const obj = a.toObject();
    obj.id = String(obj._id);
    res.json({ success: true, application: obj });
});

/* ============================================================
   LIST ALL (admin)
   ============================================================ */
exports.listAll = asyncHandler(async (req, res) => {
    const { page, limit, skip } = paginate(req.query);
    const filter = {};
    if (req.query.type) filter.type = req.query.type;
    if (req.query.status) filter.status = req.query.status;

    const [applications, total] = await Promise.all([
        Application.find(filter).skip(skip).limit(limit)
            .sort({ createdAt: -1 })
            .populate('user', 'name email'),
        Application.countDocuments(filter)
    ]);

    res.json({
        success: true,
        total,
        page,
        applications: applications.map((a) => {
            const obj = a.toObject();
            obj.id = String(obj._id);
            return obj;
        })
    });
});

/* ============================================================
   UPDATE STATUS (admin)
   ============================================================ */
exports.updateStatus = asyncHandler(async (req, res) => {
    const { status, adminNotes } = req.body || {};

    if (status && !['pending', 'reviewing', 'approved', 'rejected', 'cancelled'].includes(status)) {
        return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const a = await Application.findByIdAndUpdate(
        req.params.id,
        {
            ...(status && { status }),
            ...(adminNotes != null && { adminNotes }),
            reviewedBy: req.user?._id,
            reviewedAt: new Date()
        },
        { new: true, runValidators: true }
    );

    if (!a) {
        return res.status(404).json({ success: false, message: 'Not found' });
    }

    const obj = a.toObject();
    obj.id = String(obj._id);
    res.json({ success: true, application: obj });
});