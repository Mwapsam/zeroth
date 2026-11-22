/* ============================================================
   NOTIFICATION CONTROLLER
   ============================================================ */
const Notification = require('../models/Notification');
const { asyncHandler, paginate } = require('../utils/helpers');

/* ============================================================
   LIST
   ============================================================ */
exports.list = asyncHandler(async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    const { page, limit, skip } = paginate(req.query);
    const filter = { user: req.user._id };
    if (req.query.unread === 'true') filter.isRead = false;

    const [notifications, total, unreadCount] = await Promise.all([
        Notification.find(filter).skip(skip).limit(limit).sort({ createdAt: -1 }),
        Notification.countDocuments(filter),
        Notification.countDocuments({ user: req.user._id, isRead: false })
    ]);

    res.json({ success: true, total, page, unreadCount, notifications });
});

/* ============================================================
   MARK ONE READ
   ============================================================ */
exports.markRead = asyncHandler(async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    await Notification.findOneAndUpdate(
        { _id: req.params.id, user: req.user._id },
        { isRead: true, readAt: new Date() }
    );
    res.json({ success: true });
});

/* ============================================================
   MARK ALL READ
   ============================================================ */
exports.markAllRead = asyncHandler(async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    await Notification.updateMany(
        { user: req.user._id, isRead: false },
        { isRead: true, readAt: new Date() }
    );
    res.json({ success: true });
});

/* ============================================================
   REMOVE
   ============================================================ */
exports.remove = asyncHandler(async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    await Notification.findOneAndDelete({
        _id: req.params.id,
        user: req.user._id
    });
    res.json({ success: true });
});