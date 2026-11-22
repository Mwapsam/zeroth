/* ============================================================
   CONSULTATION CONTROLLER
   ============================================================ */
const { Consultant, ConsultationBooking } = require('../models/Consultation');
const { asyncHandler, paginate } = require('../utils/helpers');

/* ============================================================
   LIST CONSULTANTS
   ============================================================ */
exports.listConsultants = asyncHandler(async (req, res) => {
    const { category, q, available } = req.query;
    const { page, limit, skip } = paginate(req.query);

    const filter = {};
    if (category && category !== 'all') filter.category = category;
    if (available === 'true') filter.isAvailable = true;
    if (q) {
        filter.$or = [
            { name: { $regex: q, $options: 'i' } },
            { bio: { $regex: q, $options: 'i' } },
            { specialities: { $regex: q, $options: 'i' } }
        ];
    }

    const [consultants, total] = await Promise.all([
        Consultant.find(filter).skip(skip).limit(limit).sort({ rating: -1 }),
        Consultant.countDocuments(filter)
    ]);

    const counts = await Consultant.aggregate([
        { $group: { _id: '$category', count: { $sum: 1 } } }
    ]);

    res.json({ success: true, total, page, consultants, counts });
});

/* ============================================================
   GET ONE
   ============================================================ */
exports.getConsultant = asyncHandler(async (req, res) => {
    const c = await Consultant.findById(req.params.id);
    if (!c) {
        return res.status(404).json({ success: false, message: 'Consultant not found' });
    }
    res.json({ success: true, consultant: c });
});

/* ============================================================
   BOOK
   ============================================================ */
exports.book = asyncHandler(async (req, res) => {
    const {
        consultantId, category, topic, date, time, duration,
        mode, name, contact, notes, amount
    } = req.body || {};

    if (!name || !contact) {
        return res.status(400).json({
            success: false,
            message: 'name and contact are required'
        });
    }

    const booking = await ConsultationBooking.create({
        user: req.user?._id,
        consultant: consultantId,
        category, topic, date, time, duration, mode,
        name, contact, notes, amount
    });

    const obj = booking.toObject();
    obj.id = String(obj._id);
    res.status(201).json({
        success: true,
        message: 'Booking confirmed',
        reference: booking.reference,
        booking: obj
    });
});

/* ============================================================
   MY BOOKINGS
   ============================================================ */
exports.myBookings = asyncHandler(async (req, res) => {
    const { page, limit, skip } = paginate(req.query);
    const filter = { user: req.user._id };
    if (req.query.status) filter.status = req.query.status;

    const [bookings, total] = await Promise.all([
        ConsultationBooking.find(filter)
            .skip(skip)
            .limit(limit)
            .sort({ createdAt: -1 })
            .populate('consultant', 'name title emoji category'),
        ConsultationBooking.countDocuments(filter)
    ]);

    res.json({
        success: true,
        total,
        page,
        bookings: bookings.map((b) => {
            const obj = b.toObject();
            obj.id = String(obj._id);
            return obj;
        })
    });
});

/* ============================================================
   CANCEL
   ============================================================ */
exports.cancelBooking = asyncHandler(async (req, res) => {
    const b = await ConsultationBooking.findOneAndUpdate(
        {
            _id: req.params.id,
            user: req.user._id,
            status: { $in: ['pending', 'confirmed'] }
        },
        { status: 'cancelled' },
        { new: true }
    );

    if (!b) {
        return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    const obj = b.toObject();
    obj.id = String(obj._id);
    res.json({ success: true, booking: obj });
});