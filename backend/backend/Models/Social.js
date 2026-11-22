const mongoose = require('mongoose');

const socialAccountSchema = new mongoose.Schema(
    {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        platform: {
            type: String, required: true,
            enum: ['facebook', 'twitter', 'instagram', 'linkedin', 'youtube',
                   'tiktok', 'whatsapp', 'telegram']
        },
        handle: { type: String, required: true },
        displayName: String,
        avatar: String,
        accessToken: { type: String, select: false },
        refreshToken: { type: String, select: false },
        isActive: { type: Boolean, default: true },
        connectedAt: { type: Date, default: Date.now }
    },
    { timestamps: true }
);

socialAccountSchema.index({ user: 1, platform: 1 }, { unique: true });

const socialMessageSchema = new mongoose.Schema(
    {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        platform: { type: String, required: true },
        from: { name: String, handle: String, avatar: String },
        content: { type: String, maxlength: 5000 },
        attachments: [
            { type: { type: String }, url: String, name: String, size: Number }
        ],
        direction: { type: String, enum: ['inbox', 'outbox'], required: true },
        isRead: { type: Boolean, default: false },
        externalId: String,
        receivedAt: { type: Date, default: Date.now }
    },
    { timestamps: true }
);

socialMessageSchema.index({ user: 1, direction: 1, isRead: 1, receivedAt: -1 });

module.exports = {
    SocialAccount: mongoose.model('SocialAccount', socialAccountSchema),
    SocialMessage: mongoose.model('SocialMessage', socialMessageSchema)
};