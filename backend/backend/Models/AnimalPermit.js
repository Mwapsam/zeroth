const mongoose = require('mongoose');

const animalEntrySchema = new mongoose.Schema(
    {
        seller: {
            name: String, nrc: String, phone: String,
            photo: String, village: String, district: String, province: String,
            date: Date
        },
        animal: {
            description: String,
            code: String,
            photo: String,
            colour: String
        },
        confirmState: {
            type: String,
            enum: ['pending', 'confirmed', 'declined'],
            default: 'pending'
        },
        notifiedAt: Date
    },
    { _id: true }
);

const clearanceSchema = new mongoose.Schema(
    {
        role: { type: String, required: true },
        name: String,
        nrc: String,
        phone: String,
        animalCode: String,
        village: String,
        district: String,
        province: String,
        awareness: { type: String, enum: ['aware', 'ignorant', ''], default: '' },
        date: Date,
        notifiedAt: Date
    },
    { _id: false }
);

const animalPermitSchema = new mongoose.Schema(
    {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        reference: { type: String, unique: true, index: true },

        from: { type: String, required: true, trim: true },
        to: { type: String, required: true, trim: true },

        animals: [animalEntrySchema],
        clearances: [clearanceSchema],

        zbsRep: {
            name: { type: String, required: true },
            signature: String,
            date: { type: Date, required: true }
        },

        status: {
            type: String,
            enum: ['draft', 'submitted', 'approved', 'rejected', 'completed'],
            default: 'submitted'
        },

        submittedBy: { name: String, phone: String, email: String }
    },
    { timestamps: true }
);

animalPermitSchema.pre('save', function (next) {
    if (!this.reference) {
        this.reference = `ZBS-PMT-${Date.now().toString(36).toUpperCase()}-${Math.random()
            .toString(36).slice(2, 5).toUpperCase()}`;
    }
    next();
});

module.exports = mongoose.model('AnimalPermit', animalPermitSchema);