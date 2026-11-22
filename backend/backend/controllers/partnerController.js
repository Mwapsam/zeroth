/* ============================================================
   PARTNER CONTROLLER
   ============================================================ */
const Partner = require('../models/Partner');
const Application = require('../models/Application');
const { asyncHandler } = require('../utils/helpers');

/* ============================================================
   LIST
   ============================================================ */
exports.list = asyncHandler(async (_req, res) => {
    const partners = await Partner.find({ isActive: true }).sort({ slot: 1 });
    res.json({
        success: true,
        count: partners.length,
        partners: partners.map((p) => {
            const obj = p.toObject();
            obj.id = String(obj._id);
            return obj;
        })
    });
});

/* ============================================================
   GET ONE
   ============================================================ */
exports.getOne = asyncHandler(async (req, res) => {
    const partner = await Partner.findOne({
        $or: [{ _id: req.params.id }, { slot: req.params.id }]
    });

    if (!partner) {
        return res.status(404).json({ success: false, message: 'Partner not found' });
    }

    const obj = partner.toObject();
    obj.id = String(obj._id);
    res.json({ success: true, partner: obj });
});

/* ============================================================
   APPLY (partner-specific service request)
   ============================================================ */
exports.apply = asyncHandler(async (req, res) => {
    const {
        name, email, phone, serviceRequired,
        notes, partnerSlot, partnerName
    } = req.body || {};

    if (!name || !email || !phone) {
        return res.status(400).json({
            success: false,
            message: 'name, email and phone are required'
        });
    }

    const app = await Application.create({
        user: req.user?._id,
        type: 'partner',
        applicantName: name,
        applicantEmail: email,
        applicantPhone: phone,
        data: { serviceRequired, partnerSlot, partnerName },
        notes
    });

    const obj = app.toObject();
    obj.id = String(obj._id);
    res.status(201).json({
        success: true,
        message: 'Partner application submitted',
        reference: app.reference,
        application: obj
    });
});

/* ============================================================
   BECOME A PARTNER (registration)
   ============================================================ */
exports.becomePartner = asyncHandler(async (req, res) => {
    const {
        company, category, years, website, city, employees,
        contactName, contactRole, email, phone, services, motivation
    } = req.body || {};

    if (!company || !email || !phone) {
        return res.status(400).json({
            success: false,
            message: 'company, email and phone are required'
        });
    }

    const app = await Application.create({
        user: req.user?._id,
        type: 'become-partner',
        applicantName: contactName || company,
        applicantEmail: email,
        applicantPhone: phone,
        data: {
            company, category, years, website, city, employees,
            contactName, contactRole, services, motivation
        }
    });

    const obj = app.toObject();
    obj.id = String(obj._id);
    res.status(201).json({
        success: true,
        message: 'Partnership application received',
        reference: app.reference,
        application: obj
    });
});

/* ============================================================
   CREATE (admin)
   ============================================================ */
exports.create = asyncHandler(async (req, res) => {
    const partner = await Partner.create(req.body || {});
    const obj = partner.toObject();
    obj.id = String(obj._id);
    res.status(201).json({ success: true, partner: obj });
});

/* ============================================================
   UPDATE (admin)
   ============================================================ */
exports.update = asyncHandler(async (req, res) => {
    const partner = await Partner.findByIdAndUpdate(
        req.params.id,
        req.body || {},
        { new: true, runValidators: true }
    );

    if (!partner) {
        return res.status(404).json({ success: false, message: 'Not found' });
    }
    res.json({ success: true, partner });
});

/* ============================================================
   REMOVE (admin)
   ============================================================ */
exports.remove = asyncHandler(async (req, res) => {
    const p = await Partner.findByIdAndDelete(req.params.id);
    if (!p) {
        return res.status(404).json({ success: false, message: 'Not found' });
    }
    res.json({ success: true, message: 'Deleted' });
});