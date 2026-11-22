/* ============================================================
   MESSAGE — user-to-user conversation message
   ============================================================ */
'use strict';

const mongoose = require('mongoose');

const attachmentSchema = new mongoose.Schema({
    kind: { type: String, enum: ['image', 'file', 'audio', 'video', 'contact', 'location', 'poll'], required: true },
    url:      { type: String, required: true },      // /uploads/...
    name:     { type: String, default: '' },
    mime:     { type: String, default: '' },
    size:     { type: Number, default: 0 },
    meta:     { type: mongoose.Schema.Types.Mixed, default: {} }
}, { _id: false });

const messageSchema = new mongoose.Schema({
    // Conversation participants — sorted by id to make `conversationId` deterministic
    participants: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }],

    // Deterministic conversation key: `${idA}_${idB}` with ids sorted ascending
    conversationId: { type: String, required: true, index: true },

    from: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    to:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    text: { type: String, default: '', maxlength: 4000 },
    attachments: { type: [attachmentSchema], default: [] },

    // Read receipt
    readAt: { type: Date, default: null },
    isRead: { type: Boolean, default: false, index: true },

    createdAt: { type: Date, default: Date.now, index: true }
}, {
    timestamps: false,
    toJSON: {
        transform: (_doc, ret) => {
            ret.id = String(ret._id);
            delete ret.__v;
            return ret;
        }
    }
});

/* Fast lookup of a conversation, sorted newest-first */
messageSchema.index({ conversationId: 1, createdAt: -1 });

/* Count unread for a user across all conversations */
messageSchema.index({ to: 1, isRead: 1 });

/* Helper to build a deterministic conversationId */
messageSchema.statics.buildConversationId = function (userIdA, userIdB) {
    const a = String(userIdA);
    const b = String(userIdB);
    return a < b ? `${a}_${b}` : `${b}_${a}`;
};

module.exports = mongoose.model('Message', messageSchema);