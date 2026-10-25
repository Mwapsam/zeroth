const { SocialAccount, SocialMessage } = require('../models/Social');
const { asyncHandler, paginate } = require('../utils/helpers');

exports.listAccounts = asyncHandler(async (req, res) => {
    const accounts = await SocialAccount.find({ user: req.user._id });
    res.json({ success: true, accounts });
});

exports.connectAccount = asyncHandler(async (req, res) => {
    const { platform, handle, displayName, avatar } = req.body;
    const account = await SocialAccount.findOneAndUpdate(
        { user: req.user._id, platform },
        { user: req.user._id, platform, handle, displayName, avatar },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    res.status(201).json({ success: true, account });
});

exports.disconnectAccount = asyncHandler(async (req, res) => {
    await SocialAccount.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    res.json({ success: true, message: 'Disconnected' });
});

exports.listInbox = asyncHandler(async (req, res) => {
    const { platform, unread } = req.query;
    const { page, limit, skip } = paginate(req.query);

    const filter = { user: req.user._id, direction: 'inbox' };
    if (platform) filter.platform = platform;
    if (unread === 'true') filter.isRead = false;

    const [messages, total] = await Promise.all([
        SocialMessage.find(filter).skip(skip).limit(limit).sort({ receivedAt: -1 }),
        SocialMessage.countDocuments(filter)
    ]);

    const unreadCount = await SocialMessage.countDocuments({
        user: req.user._id, direction: 'inbox', isRead: false
    });

    res.json({ success: true, total, page, unreadCount, messages });
});

exports.markRead = asyncHandler(async (req, res) => {
    await SocialMessage.findOneAndUpdate(
        { _id: req.params.id, user: req.user._id },
        { isRead: true, readAt: new Date() }
    );
    res.json({ success: true });
});

exports.markAllRead = asyncHandler(async (req, res) => {
    await SocialMessage.updateMany(
        { user: req.user._id, isRead: false },
        { isRead: true, readAt: new Date() }
    );
    res.json({ success: true });
});

exports.broadcast = asyncHandler(async (req, res) => {
    const { platforms, content, attachments } = req.body;
    if (!platforms?.length)
        return res.status(400).json({ success: false, message: 'No targets' });

    const created = await SocialMessage.insertMany(
        platforms.map((platform) => ({
            user: req.user._id,
            platform,
            direction: 'outbox',
            content,
            attachments: attachments || [],
            from: { name: req.user.name, handle: req.user.email }
        }))
    );

    res.status(201).json({ success: true, sent: created.length, messages: created });
});