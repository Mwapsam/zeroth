const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
    {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        icon: { type: String, default: '🔔' },
        title: String,
        text: { type: String, required: true, maxlength: 500 },
        link: String,
        category: {
            type: String,
            enum: ['general', 'order', 'payment', 'bet', 'etf',
                   'application', 'rental', 'social'],
            default: 'general'
        },
        isRead: { type: Boolean, default: false },
        readAt: Date
    },
    { timestamps: true }
);

notificationSchema.index({ user: 1, isRead: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);