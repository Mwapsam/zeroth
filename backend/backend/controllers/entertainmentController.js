/* ============================================================
   ENTERTAINMENT CONTROLLER
   ============================================================ */
const Entertainment = require('../models/Entertainment');
const { asyncHandler, paginate } = require('../utils/helpers');

/* ============================================================
   LIST
   ============================================================ */
exports.list = asyncHandler(async (req, res) => {
    const { type, q } = req.query;
    const { page, limit, skip } = paginate(req.query);

    const filter = { isApproved: true };
    if (type) filter.type = type;
    if (q) {
        filter.$or = [
            { title: { $regex: q, $options: 'i' } },
            { artist: { $regex: q, $options: 'i' } }
        ];
    }

    const [items, total] = await Promise.all([
        Entertainment.find(filter).skip(skip).limit(limit).sort({ createdAt: -1 }),
        Entertainment.countDocuments(filter)
    ]);

    const counts = await Entertainment.aggregate([
        { $match: { isApproved: true } },
        { $group: { _id: '$type', count: { $sum: 1 } } }
    ]);

    res.json({
        success: true,
        total,
        page,
        items: items.map((it) => {
            const obj = it.toObject();
            obj.id = String(obj._id);
            return obj;
        }),
        counts
    });
});

/* ============================================================
   GET ONE (increments views)
   ============================================================ */
exports.getOne = asyncHandler(async (req, res) => {
    const item = await Entertainment.findById(req.params.id);
    if (!item) {
        return res.status(404).json({ success: false, message: 'Not found' });
    }
    item.views += 1;
    await item.save({ validateBeforeSave: false });

    const obj = item.toObject();
    obj.id = String(obj._id);
    res.json({ success: true, item: obj });
});

/* ============================================================
   UPLOAD
   ============================================================ */
exports.upload = asyncHandler(async (req, res) => {
    const provided = req.headers['x-admin-key'];
    const expected = process.env.ADMIN_KEY || process.env.ADMIN_ACCESS_KEY;
    const isAdmin = Boolean(provided && expected && provided === expected);

    const { type, title, artist, description } = req.body || {};

    if (!req.file) {
        return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const baseUrl = process.env.PUBLIC_URL ||
        `${req.protocol}://${req.get('host')}`;
    const fileUrl = `${baseUrl}/uploads/${req.file.filename}`;

    const item = await Entertainment.create({
        uploadedBy: req.user?._id,
        uploaderName: req.user?.name || 'Admin',
        type, title, artist, description,
        fileUrl,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        isApproved: isAdmin
    });

    const obj = item.toObject();
    obj.id = String(obj._id);
    res.status(201).json({ success: true, item: obj });
});

/* ============================================================
   LIKE
   ============================================================ */
exports.like = asyncHandler(async (req, res) => {
    const item = await Entertainment.findByIdAndUpdate(
        req.params.id,
        { $inc: { likes: 1 } },
        { new: true }
    );
    if (!item) {
        return res.status(404).json({ success: false, message: 'Not found' });
    }
    res.json({ success: true, likes: item.likes });
});

/* ============================================================
   REMOVE
   ============================================================ */
exports.remove = asyncHandler(async (req, res) => {
    const item = await Entertainment.findByIdAndDelete(req.params.id);
    if (!item) {
        return res.status(404).json({ success: false, message: 'Not found' });
    }
    res.json({ success: true, message: 'Deleted' });
});