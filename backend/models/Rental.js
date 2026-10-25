const mongoose = require('mongoose');

const rentalSchema = new mongoose.Schema(
    {
        landlord: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

        title: { type: String, required: true, trim: true, maxlength: 160 },
        type: {
            type: String, required: true,
            enum: ['apartment', 'house', 'room', 'studio', 'office', 'shop', 'warehouse', 'land']
        },
        description: { type: String, required: true, maxlength: 2000 },
        images: [{ type: String }],

        address: { type: String, required: true, maxlength: 300 },
        city: { type: String, required: true, trim: true, maxlength: 120 },
        province: { type: String, maxlength: 80 },
        area: { type: String, maxlength: 80 },
        zip: { type: String, maxlength: 20 },
        geo: { lat: Number, lng: Number },

        rent: { type: Number, required: true, min: 0 },
        deposit: { type: Number, default: 0, min: 0 },
        currency: { type: String, default: 'ZMW' },

        bedrooms: { type: Number, required: true, min: 0 },
        bathrooms: { type: Number, required: true, min: 0 },
        squareMeters: { type: Number, min: 0 },

        availableFrom: { type: Date, required: true },

        amenities: {
            pets: Boolean, furnished: Boolean, parking: Boolean, laundry: Boolean,
            water: Boolean, power: Boolean, security: Boolean, wifi: Boolean
        },

        contact: { phone: { type: String, required: true, maxlength: 40 } },

        status: {
            type: String,
            enum: ['available', 'rented', 'pending', 'inactive'],
            default: 'available'
        },

        views: { type: Number, default: 0 },
        favorites: { type: Number, default: 0 }
    },
    { timestamps: true }
);

rentalSchema.index({ city: 1, type: 1, rent: 1, status: 1 });
rentalSchema.index({ title: 'text', description: 'text', address: 'text' });

module.exports = mongoose.model('Rental', rentalSchema);