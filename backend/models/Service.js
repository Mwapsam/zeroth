const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true, maxlength: 160 },
        slug: { type: String, unique: true, sparse: true, lowercase: true, trim: true },
        category: {
            type: String, required: true,
            enum: ['agricultural', 'brokerage', 'financial',
                   'technology', 'construction', 'education', 'other']
        },
        hub: { type: String, trim: true },
        description: { type: String, maxlength: 1000 },
        icon: { type: String, default: '' },
        features: [{ type: String, maxlength: 160 }],
        price: { type: Number, default: 0, min: 0 },
        currency: { type: String, default: 'ZMW' },
        isActive: { type: Boolean, default: true },
        order: { type: Number, default: 0 }
    },
    { timestamps: true }
);

serviceSchema.index({ category: 1, isActive: 1 });
serviceSchema.index({ name: 'text', description: 'text' });

module.exports = mongoose.model('Service', serviceSchema);