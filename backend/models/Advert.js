const mongoose = require('mongoose');

const advertSchema = new mongoose.Schema(
    {
        advertiser: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        title: { type: String, required: true, trim: true, maxlength: 200 },
        text: { type: String, maxlength: 500 },
        imageUrl: String,
        linkUrl: String,

        placement: {
            type: String,
            enum: ['banner', 'sidebar', 'popup', 'footer'],
            default: 'banner'
        },

        startsAt: { type: Date, default: Date.now },
        endsAt: Date,

        impressions: { type: Number, default: 0 },
        clicks: { type: Number, default: 0 },

        price: { type: Number, default: 0 },
        payment: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment' },

        status: {
            type: String,
            enum: ['pending', 'approved', 'active', 'expired', 'rejected'],
            default: 'pending'
        }
    },
    { timestamps: true }
);

advertSchema.index({ status: 1, placement: 1, startsAt: -1 });

module.exports = mongoose.model('Advert', advertSchema);