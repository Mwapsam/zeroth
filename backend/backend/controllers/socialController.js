/* ============================================================
   SOCIAL CONTROLLER
   ============================================================ */
const { SocialAccount, SocialMessage } = require('../models/Social');
const { asyncHandler, paginate } = require('../utils/helpers');

/* ============================================================
   LIST ACCOUNTS
   ============================================================ */
exports.listAccounts = asyncHandler(async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    const accounts = await SocialAccount.find({ user: req.user._id });
    res.json({
        success: true,
        accounts: accounts.map((a) => {
            const obj = a.toObject();
            obj.id = String(obj._id);
            return obj;
        })
    });
});

/* ============================================================
   CONNECT ACCOUNT
   ============================================================ */
exports.connectAccount = asyncHandler(async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    const { platform, handle, displayName, avatar } = req.body || {};
    if (!platform || !handle) {
        return res.status(400).json({
            success: false,
            message: 'platform and handle are required'
        });
    }

    const account = await SocialAccount.findOneAndUpdate(
        { user: req.user._id, platform },
        { user: req.user._id, platform, handle, displayName, avatar },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    const obj = account.toObject();
    obj.id = String(obj._id);
    res.status(201).json({ success: true, account: obj });
});

/* ============================================================
   DISCONNECT
   ============================================================ */
exports.disconnectAccount = asyncHandler(async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    await SocialAccount.findOneAndDelete({
        _id: req.params.id,
        user: req.user._id
    });
    res.json({ success: true, message: 'Disconnected' });
});

/* ============================================================
   LIST INBOX
   ============================================================ */
exports.listInbox = asyncHandler(async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    const { platform, unread } = req.query;
    const { page, limit, skip } = paginate(req.query);

    const filter = { user: req.user._id, direction: 'inbox' };
    if (platform) filter.platform = platform;
    if (unread === 'true') filter.isRead = false;

    const [messages, total, unreadCount] = await Promise.all([
        SocialMessage.find(filter).skip(skip).limit(limit).sort({ receivedAt: -1 }),
        SocialMessage.countDocuments(filter),
        SocialMessage.countDocuments({
            user: req.user._id,
            direction: 'inbox',
            isRead: false
        })
    ]);

    res.json({
        success: true,
        total,
        page,
        unreadCount,
        messages: messages.map((m) => {
            const obj = m.toObject();
            obj.id = String(obj._id);
            return obj;
        })
    });
});

/* ============================================================
   MARK ONE READ
   ============================================================ */
exports.markRead = asyncHandler(async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    await SocialMessage.findOneAndUpdate(
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

    await SocialMessage.updateMany(
        { user: req.user._id, isRead: false },
        { isRead: true, readAt: new Date() }
    );
    res.json({ success: true });
});

/* ============================================================
   BROADCAST
   ============================================================ */
exports.broadcast = asyncHandler(async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    const { platforms, content, attachments } = req.body || {};

    if (!Array.isArray(platforms) || platforms.length === 0) {
        return res.status(400).json({ success: false, message: 'No targets' });
    }

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

    res.status(201).json({
        success: true,
        sent: created.length,
        messages: created.map((m) => {
            const obj = m.toObject();
            obj.id = String(obj._id);
            return obj;
        })
    });
});