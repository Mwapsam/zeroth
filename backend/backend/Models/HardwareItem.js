const mongoose = require('mongoose');

const hardwareItemSchema = new mongoose.Schema(
    {
        vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        shop: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop' },
        shopName: { type: String, maxlength: 160 },

        name: { type: String, required: true, trim: true, maxlength: 160 },
        code: { type: String, trim: true, maxlength: 60 },
        category: { type: String, required: true, trim: true, maxlength: 80 },
        subcategory: { type: String, maxlength: 80 },
        description: { type: String, maxlength: 1500 },

        price: { type: Number, required: true, min: 0 },
        unit: { type: String, default: 'pc', maxlength: 20 },
        stock: { type: Number, default: 0, min: 0 },

        images: [{ type: String }],
        coverImage: { type: String },

        location: {
            address: String, city: String, province: String, region: String,
            lat: Number, lng: Number
        },

        contact: { sellerName: String, phone: String },

        listingType: {
            type: String,
            enum: ['hardware', 'agriculture', 'construction'],
            default: 'hardware'
        },

        tags: [{ type: String }],
        isActive: { type: Boolean, default: true },
        isFeatured: { type: Boolean, default: false }
    },
    { timestamps: true }
);

hardwareItemSchema.index({ 'location.city': 1, category: 1, listingType: 1 });
hardwareItemSchema.index({ name: 'text', description: 'text' });

module.exports = mongoose.model('HardwareItem', hardwareItemSchema);