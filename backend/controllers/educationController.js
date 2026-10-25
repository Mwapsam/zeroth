const { Institution, LibraryBook, TutorRequest } = require('../models/Education');
const { asyncHandler, paginate, generateRef } = require('../utils/helpers');

exports.listInstitutions = asyncHandler(async (req, res) => {
    const { type, q, city } = req.query;
    const { page, limit, skip } = paginate(req.query);

    const filter = { isActive: true };
    if (type) filter.type = type;
    if (city) filter['location.city'] = city;
    if (q) filter.$or = [
        { name: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } }
    ];

    const [institutions, total] = await Promise.all([
        Institution.find(filter).skip(skip).limit(limit).sort({ rating: -1 }),
        Institution.countDocuments(filter)
    ]);

    const counts = await Institution.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: '$type', count: { $sum: 1 } } }
    ]);

    res.json({ success: true, total, page, institutions, counts });
});

exports.getInstitution = asyncHandler(async (req, res) => {
    const inst = await Institution.findById(req.params.id);
    if (!inst) return res.status(404).json({ success: false, message: 'Institution not found' });
    res.json({ success: true, institution: inst });
});

exports.listLibrary = asyncHandler(async (req, res) => {
    const { filter = 'all', q } = req.query;
    const { page, limit, skip } = paginate(req.query);

    const dbFilter = {};
    if (filter === 'free') dbFilter.isFree = true;
    if (filter === 'paid') dbFilter.isFree = false;
    if (q) dbFilter.$or = [
        { title: { $regex: q, $options: 'i' } },
        { author: { $regex: q, $options: 'i' } }
    ];

    const [books, total] = await Promise.all([
        LibraryBook.find(dbFilter).skip(skip).limit(limit).sort({ createdAt: -1 }),
        LibraryBook.countDocuments(dbFilter)
    ]);
    res.json({ success: true, total, page, books });
});

exports.createTutorRequest = asyncHandler(async (req, res) => {
    const { subject, level, mode, schedule, name, contact, notes } = req.body;
    const tutor = await TutorRequest.create({
        user: req.user?._id,
        reference: generateRef('TUTOR'),
        subject, level, mode, schedule, name, contact, notes
    });
    res.status(201).json({ success: true, message: 'Tutor requested', tutor });
});