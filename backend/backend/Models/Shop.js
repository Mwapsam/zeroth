const mongoose = require('mongoose');

const shopSchema = new mongoose.Schema(
    {
        vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        name: { type: String, required: true, trim: true, maxlength: 160 },
        slug: { type: String, unique: true, sparse: true, lowercase: true },

        category: {
            type: String, required: true,
            enum: ['grocery', 'agriculture', 'electronics', 'fashion',
                   'hardware', 'pharmacy', 'services', 'other']
        },
        description: { type: String, maxlength: 800 },
        image: String,

        location: {
            address: { type: String, required: true },
            city: { type: String, required: true },
            province: String,
            lat: { type: Number, required: true },
            lng: { type: Number, required: true }
        },

        contact: { phone: String, email: String, whatsapp: String },

        rating: { type: Number, default: 0, min: 0, max: 5 },
        ratingCount: { type: Number, default: 0 },
        verified: { type: Boolean, default: false },
        isActive: { type: Boolean, default: true }
    },
    { timestamps: true }
);

shopSchema.index({ category: 1, isActive: 1 });
shopSchema.index({ 'location.city': 1 });
shopSchema.index({ name: 'text', description: 'text' });

module.exports = mongoose.model('Shop', shopSchema);