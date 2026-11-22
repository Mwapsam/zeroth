const mongoose = require('mongoose');

const constructionServiceSchema = new mongoose.Schema(
    {
        code: { type: String, required: true, unique: true, trim: true },
        name: { type: String, required: true, trim: true },
        bucket: { type: String, required: true },
        description: { type: String, maxlength: 1500 },
        price: { type: Number, default: 0, min: 0 },
        unit: { type: String, default: 'job' },
        currency: { type: String, default: 'ZMW' },
        isActive: { type: Boolean, default: true }
    },
    { timestamps: true }
);

constructionServiceSchema.index({ bucket: 1, isActive: 1 });
constructionServiceSchema.index({ name: 'text', code: 'text', description: 'text' });

const constructionCompanySchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true },
        logo: String,
        description: String,
        services: [{ type: String }],
        country: String,
        city: String,
        phone: String,
        email: String,
        website: String,
        isVerified: { type: Boolean, default: false }
    },
    { timestamps: true }
);

const contractorSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true },
        company: String,
        avatar: String,
        country: { type: String, required: true },
        province: String,
        city: String,
        specialities: [{ type: String }],
        experience: Number,
        rating: { type: Number, default: 0 },
        ratingCount: { type: Number, default: 0 },
        phone: String,
        email: String,
        isVerified: { type: Boolean, default: false }
    },
    { timestamps: true }
);

const constructionBookingSchema = new mongoose.Schema(
    {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        reference: { type: String, unique: true, sparse: true },

        type: { type: String, enum: ['quote', 'booking'], required: true },
        services: [
            {
                serviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'ConstructionService' },
                name: String, price: Number, quantity: Number
            }
        ],
        total: { type: Number, required: true, min: 0 },

        contact: { name: String, phone: String, email: String },
        location: String,
        notes: String,

        status: {
            type: String,
            enum: ['pending', 'reviewed', 'scheduled', 'in-progress', 'completed', 'cancelled'],
            default: 'pending'
        }
    },
    { timestamps: true }
);

module.exports = {
    ConstructionService: mongoose.model('ConstructionService', constructionServiceSchema),
    ConstructionCompany: mongoose.model('ConstructionCompany', constructionCompanySchema),
    Contractor: mongoose.model('Contractor', contractorSchema),
    ConstructionBooking: mongoose.model('ConstructionBooking', constructionBookingSchema)
};