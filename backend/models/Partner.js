const mongoose = require('mongoose');

const partnerSchema = new mongoose.Schema(
    {
        slot: { type: String, required: true, unique: true },
        name: { type: String, required: true, trim: true },
        logo: String,
        category: {
            type: String,
            enum: ['agricultural', 'brokerage', 'financial', 'technology',
                   'construction', 'education', 'other'],
            default: 'brokerage'
        },
        description: { type: String, maxlength: 1500 },
        services: [{ type: String }],
        contact: { phone: String, email: String, website: String },
        meta: { type: mongoose.Schema.Types.Mixed },
        isActive: { type: Boolean, default: true }
    },
    { timestamps: true }
);

module.exports = mongoose.model('Partner', partnerSchema);