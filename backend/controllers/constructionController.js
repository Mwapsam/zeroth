const {
    ConstructionService, ConstructionCompany, Contractor, ConstructionBooking
} = require('../models/Construction');
const { asyncHandler, paginate, generateRef } = require('../utils/helpers');

exports.listServices = asyncHandler(async (req, res) => {
    const { bucket, q } = req.query;
    const filter = { isActive: true };
    if (bucket) filter.bucket = bucket;
    if (q) filter.$text = { $search: q };

    const services = await ConstructionService.find(filter).sort({ bucket: 1, name: 1 });
    res.json({ success: true, count: services.length, services });
});

exports.listCompanies = asyncHandler(async (req, res) => {
    const { city, country, service } = req.query;
    const { page, limit, skip } = paginate(req.query);

    const filter = {};
    if (city) filter.city = city;
    if (country) filter.country = country;
    if (service) filter.services = service;

    const [companies, total] = await Promise.all([
        ConstructionCompany.find(filter).skip(skip).limit(limit).sort({ isVerified: -1, name: 1 }),
        ConstructionCompany.countDocuments(filter)
    ]);
    res.json({ success: true, total, page, companies });
});

exports.listContractors = asyncHandler(async (req, res) => {
    const { country, province, city, speciality } = req.query;
    const { page, limit, skip } = paginate(req.query);

    const filter = {};
    if (country) filter.country = country;
    if (province) filter.province = province;
    if (city) filter.city = city;
    if (speciality) filter.specialities = speciality;

    const [contractors, total] = await Promise.all([
        Contractor.find(filter).skip(skip).limit(limit).sort({ rating: -1 }),
        Contractor.countDocuments(filter)
    ]);
    res.json({ success: true, total, page, contractors });
});

exports.createBooking = asyncHandler(async (req, res) => {
    const { type, services, total, contact, location, notes } = req.body;

    const booking = await ConstructionBooking.create({
        user: req.user?._id,
        reference: generateRef('CON'),
        type, services, total, contact, location, notes
    });
    res.status(201).json({
        success: true, message: type === 'quote' ? 'Quote request received' : 'Booking received',
        reference: booking.reference, booking
    });
});
