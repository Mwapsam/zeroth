/* ============================================================
   RENTAL CONTROLLER
   ============================================================ */
const Rental = require('../models/Rental');
const Application = require('../models/Application');
const User = require('../models/User');
const { asyncHandler, paginate, distanceKm } = require('../utils/helpers');

/* ============================================================
   LIST
   ============================================================ */
exports.list = asyncHandler(async (req, res) => {
    const {
        type, city, beds, minRent, maxRent, pets, furnished,
        q, sort = 'newest', lat, lng, radius
    } = req.query;
    const { page, limit, skip } = paginate(req.query);

    const filter = { status: 'available' };
    if (type) filter.type = type;
    if (city) filter.city = city;
    if (beds) filter.bedrooms = { $gte: parseInt(beds, 10) };
    if (minRent || maxRent) {
        filter.rent = {};
        if (minRent) filter.rent.$gte = Number(minRent);
        if (maxRent) filter.rent.$lte = Number(maxRent);
    }
    if (pets === 'true') filter['amenities.pets'] = true;
    if (furnished === 'true') filter['amenities.furnished'] = true;

    if (q) {
        filter.$or = [
            { title: { $regex: q, $options: 'i' } },
            { description: { $regex: q, $options: 'i' } },
            { address: { $regex: q, $options: 'i' } },
            { city: { $regex: q, $options: 'i' } }
        ];
    }

    let sortBy = { createdAt: -1 };
    if (sort === 'price-asc') sortBy = { rent: 1 };
    if (sort === 'price-desc') sortBy = { rent: -1 };

    let rentals = await Rental.find(filter).sort(sortBy);

    if (lat && lng && radius) {
        const c = { lat: parseFloat(lat), lng: parseFloat(lng) };
        const r = parseFloat(radius);
        rentals = rentals.filter((p) =>
            p.geo?.lat && p.geo?.lng
                ? distanceKm(c, { lat: p.geo.lat, lng: p.geo.lng }) <= r
                : true
        );
    }

    const total = rentals.length;
    rentals = rentals.slice(skip, skip + limit);

    res.json({
        success: true,
        total,
        page,
        rentals: rentals.map((r) => {
            const obj = r.toObject();
            obj.id = String(obj._id);
            return obj;
        })
    });
});

/* ============================================================
   GET ONE
   ============================================================ */
exports.getOne = asyncHandler(async (req, res) => {
    const rental = await Rental.findById(req.params.id)
        .populate('landlord', 'name email phone avatar');

    if (!rental) {
        return res.status(404).json({ success: false, message: 'Rental not found' });
    }

    rental.views = (rental.views || 0) + 1;
    await rental.save({ validateBeforeSave: false });

    const obj = rental.toObject();
    obj.id = String(obj._id);
    res.json({ success: true, rental: obj });
});

/* ============================================================
   CREATE LISTING
   ============================================================ */
exports.createListing = asyncHandler(async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    const body = req.body || {};
    const payload = { ...body, landlord: req.user._id };

    if (!payload.geo && (body.lat != null || body.lng != null)) {
        payload.geo = {
            lat: Number(body.lat) || null,
            lng: Number(body.lng) || null
        };
    }

    const rental = await Rental.create(payload);

    const obj = rental.toObject();
    obj.id = String(obj._id);
    res.status(201).json({ success: true, rental: obj });
});

/* ============================================================
   MY LISTINGS
   ============================================================ */
exports.myListings = asyncHandler(async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    const rentals = await Rental.find({ landlord: req.user._id })
        .sort({ createdAt: -1 });

    res.json({
        success: true,
        count: rentals.length,
        rentals: rentals.map((r) => {
            const obj = r.toObject();
            obj.id = String(obj._id);
            return obj;
        })
    });
});

/* ============================================================
   UPDATE LISTING
   ============================================================ */
exports.updateListing = asyncHandler(async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    const rental = await Rental.findOneAndUpdate(
        { _id: req.params.id, landlord: req.user._id },
        req.body || {},
        { new: true, runValidators: true }
    );

    if (!rental) {
        return res.status(404).json({ success: false, message: 'Not found or not yours' });
    }

    const obj = rental.toObject();
    obj.id = String(obj._id);
    res.json({ success: true, rental: obj });
});

/* ============================================================
   DELETE LISTING
   ============================================================ */
exports.deleteListing = asyncHandler(async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    const rental = await Rental.findOneAndDelete({
        _id: req.params.id,
        landlord: req.user._id
    });

    if (!rental) {
        return res.status(404).json({ success: false, message: 'Not found or not yours' });
    }
    res.json({ success: true, message: 'Deleted' });
});

/* ============================================================
   APPLY TO RENT
   ============================================================ */
exports.apply = asyncHandler(async (req, res) => {
    const rental = await Rental.findById(req.params.id);
    if (!rental) {
        return res.status(404).json({ success: false, message: 'Rental not found' });
    }

    const {
        fullName, phone, email, idNumber, employment, employer,
        income, moveIn, occupants, pets, refName, refPhone, message
    } = req.body || {};

    const application = await Application.create({
        user: req.user?._id,
        type: 'rental',
        applicantName: fullName,
        applicantEmail: email,
        applicantPhone: phone,
        data: {
            rentalId: rental._id,
            rentalTitle: rental.title,
            idNumber, employment, employer, income, moveIn,
            occupants, pets,
            references: { name: refName, phone: refPhone },
            message
        }
    });

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
   MY APPLICATIONS
   ============================================================ */
exports.myApplications = asyncHandler(async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    const apps = await Application.find({
        user: req.user._id,
        type: 'rental'
    }).sort({ createdAt: -1 });

    res.json({
        success: true,
        count: apps.length,
        applications: apps.map((a) => {
            const obj = a.toObject();
            obj.id = String(obj._id);
            return obj;
        })
    });
});

/* ============================================================
   TOGGLE FAVORITE
   ============================================================ */
exports.toggleFavorite = asyncHandler(async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    const user = await User.findById(req.user._id);
    const id = req.params.id;
    const idx = user.favorites.indexOf(id);

    if (idx === -1) user.favorites.push(id);
    else user.favorites.splice(idx, 1);

    await user.save();
    res.json({ success: true, favorites: user.favorites });
});

/* ============================================================
   MY FAVORITES
   ============================================================ */
exports.myFavorites = asyncHandler(async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    const rentals = await Rental.find({ _id: { $in: req.user.favorites } });
    res.json({
        success: true,
        count: rentals.length,
        rentals: rentals.map((r) => {
            const obj = r.toObject();
            obj.id = String(obj._id);
            return obj;
        })
    });
});

/* ============================================================
   CITIES
   ============================================================ */
exports.cities = asyncHandler(async (_req, res) => {
    const cities = await Rental.distinct('city', { status: 'available' });
    res.json({ success: true, cities });
});