/* ============================================================
   MESSAGE CONTROLLER — real user-to-user chat
   ============================================================ */
'use strict';

const path = require('path');
const Message = require('../models/Message');
const User = require('../models/User');
const { asyncHandler, paginate } = require('../utils/helpers');

/* ============================================================
   GET /api/messages/conversations
   Returns the current user's inbox: one row per conversation
   with the other participant, last message, and unread count.
   ============================================================ */
exports.listConversations = asyncHandler(async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    const me = req.user._id;

    /* Aggregate one row per conversation */
    const rows = await Message.aggregate([
        { $match: { participants: me } },
        { $sort: { createdAt: -1 } },
        {
            $group: {
                _id: '$conversationId',
                participants: { $first: '$participants' },
                lastMessage:  { $first: '$$ROOT' },
                unread: {
                    $sum: {
                        $cond: [
                            { $and: [
                                { $eq: ['$to', me] },
                                { $eq: ['$isRead', false] }
                            ] },
                            1,
                            0
                        ]
                    }
                }
            }
        },
        { $sort: { 'lastMessage.createdAt': -1 } },
        { $limit: 100 }
    ]);

    /* Hydrate the other participant + unread count */
    const otherIds = new Set();
    for (const r of rows) {
        for (const p of r.participants) {
            if (String(p) !== String(me)) otherIds.add(String(p));
        }
    }
    const others = await User.find({ _id: { $in: [...otherIds] } })
        .select('name email avatar lastLoginAt');

    const otherMap = new Map(others.map(u => [String(u._id), u.toPublic()]));

    const conversations = rows.map(r => {
        const otherId = r.participants
            .map(String)
            .find(id => id !== String(me));
        const other = otherMap.get(otherId) || { id: otherId, name: 'Unknown', email: '' };

        return {
            id: r._id,
            other,
            lastMessage: r.lastMessage,
            unread: r.unread
        };
    });

    res.json({
        success: true,
        total: conversations.length,
        conversations
    });
});

/* ============================================================
   GET /api/messages/:otherId
   Returns message history for a specific conversation.
   ============================================================ */
exports.getConversation = asyncHandler(async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    const me = req.user._id;
    const { otherId } = req.params;

    if (String(me) === String(otherId)) {
        return res.status(400).json({ success: false, message: 'Cannot message yourself' });
    }

    const other = await User.findById(otherId).select('name email avatar lastLoginAt');
    if (!other) {
        return res.status(404).json({ success: false, message: 'Recipient not found' });
    }

    const conversationId = Message.buildConversationId(me, otherId);
    const { page, limit, skip } = paginate(req.query);

    const [messages, total] = await Promise.all([
        Message.find({ conversationId })
            .skip(skip)
            .limit(limit)
            .sort({ createdAt: -1 })
            .populate('from', 'name email avatar')
            .populate('to',   'name email avatar'),
        Message.countDocuments({ conversationId })
    ]);

    /* Mark as read — everything addressed to me in this thread */
    await Message.updateMany(
        { conversationId, to: me, isRead: false },
        { isRead: true, readAt: new Date() }
    );

    res.json({
        success: true,
        total,
        page,
        other: other.toPublic(),
        messages: messages.reverse()   // oldest → newest for the UI
    });
});

/* ============================================================
   POST /api/messages/:otherId
   Send a message (text + optional attachments already uploaded).
   Attachments arrive as an array of
     { kind, url, name, mime, size, meta }
   because the client first uploads to /api/messages/upload
   and then posts the resulting URLs here.
   ============================================================ */
exports.send = asyncHandler(async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    const me = req.user._id;
    const { otherId } = req.params;

    if (String(me) === String(otherId)) {
        return res.status(400).json({ success: false, message: 'Cannot message yourself' });
    }

    const other = await User.findById(otherId);
    if (!other) {
        return res.status(404).json({ success: false, message: 'Recipient not found' });
    }

    const { text = '', attachments = [] } = req.body || {};

    if (!text.trim() && attachments.length === 0) {
        return res.status(400).json({ success: false, message: 'Message is empty' });
    }
    if (text.length > 4000) {
        return res.status(400).json({ success: false, message: 'Message too long (max 4000 chars)' });
    }

    const conversationId = Message.buildConversationId(me, otherId);

    const message = await Message.create({
        participants: [me, otherId],
        conversationId,
        from: me,
        to: otherId,
        text: text.trim(),
        attachments: Array.isArray(attachments) ? attachments.slice(0, 10) : []
    });

    await message.populate('from', 'name email avatar');
    await message.populate('to',   'name email avatar');

    /* Real-time delivery — Socket.IO emits to both participants */
    try {
        const io = req.app.get('io');
        if (io) {
            io.to(`user:${otherId}`).emit('message:new', message);
            io.to(`user:${me}`).emit('message:new', message);
        }
    } catch (_) {}

    res.status(201).json({ success: true, message });
});

/* ============================================================
   POST /api/messages/upload
   Multer uploads the file, this endpoint returns its URL.
   ============================================================ */
exports.uploadAttachment = asyncHandler(async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const baseUrl = process.env.PUBLIC_URL ||
        `${req.protocol}://${req.get('host')}`;
    const url = `${baseUrl}/uploads/${req.file.filename}`;

    const mime = req.file.mimetype || '';
    const kind = mime.startsWith('image/') ? 'image'
               : mime.startsWith('audio/') ? 'audio'
               : mime.startsWith('video/') ? 'video'
               : 'file';

    res.status(201).json({
        success: true,
        attachment: {
            kind,
            url,
            name: req.file.originalname || path.basename(req.file.filename),
            mime,
            size: req.file.size
        }
    });
});

/* ============================================================
   POST /api/messages/:id/read
   ============================================================ */
exports.markRead = asyncHandler(async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    const m = await Message.findOneAndUpdate(
        { _id: req.params.id, to: req.user._id },
        { isRead: true, readAt: new Date() },
        { new: true }
    );

    if (!m) return res.status(404).json({ success: false, message: 'Not found' });

    try {
        const io = req.app.get('io');
        if (io) io.to(`user:${m.from}`).emit('message:read', { messageId: m.id, readAt: m.readAt });
    } catch (_) {}

    res.json({ success: true });
});

/* ============================================================
   POST /api/messages/mark-all-read
   ============================================================ */
exports.markAllRead = asyncHandler(async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    await Message.updateMany(
        { to: req.user._id, isRead: false },
        { isRead: true, readAt: new Date() }
    );
    res.json({ success: true });
});

/* ============================================================
   GET /api/messages/unread-count
   ============================================================ */
exports.unreadCount = asyncHandler(async (req, res) => {
    if (!req.user) {
        return res.json({ success: true, unread: 0 });
    }
    const unread = await Message.countDocuments({ to: req.user._id, isRead: false });
    res.json({ success: true, unread });
});