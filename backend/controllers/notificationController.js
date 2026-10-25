const Notification = require('../models/Notification');
const { asyncHandler, paginate } = require('../utils/helpers');

exports.list = asyncHandler(async (req, res) => {
    const { page, limit, skip } = paginate(req.query);
    const filter = { user: req.user._id };
    if (req.query.unread === 'true') filter.isRead = false;

    const [notifications, total] = await Promise.all([
        Notification.find(filter).skip(skip).limit(limit).sort({ createdAt: -1 }),
        Notification.countDocuments(filter)
    ]);
    const unreadCount = await Notification.countDocuments({
        user: req.user._id, isRead: false
    });
    res.json({ success: true, total, page, unreadCount, notifications });
});

exports.markRead = asyncHandler(async (req, res) => {
    await Notification.findOneAndUpdate(
        { _id: req.params.id, user: req.user._id },
        { isRead: true, readAt: new Date() }
    );
    res.json({ success: true });
});

exports.markAllRead = asyncHandler(async (req, res) => {
    await Notification.updateMany(
        { user: req.user._id, isRead: false },
        { isRead: true, readAt: new Date() }
    );
    res.json({ success: true });
});

exports.remove = asyncHandler(async (req, res) => {
    await Notification.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    res.json({ success: true });
});