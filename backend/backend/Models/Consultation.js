const mongoose = require('mongoose');

const consultantSchema = new mongoose.Schema(
    {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        name: { type: String, required: true, trim: true },
        title: { type: String, trim: true },
        avatar: String,
        emoji: { type: String, default: '👤' },

        category: {
            type: String, required: true,
            enum: ['health', 'education', 'business', 'legal', 'tech', 'agriculture', 'personal']
        },

        specialities: [{ type: String }],
        bio: { type: String, maxlength: 1500 },

        pricePerSession: { type: Number, required: true, min: 0 },
        currency: { type: String, default: 'ZMW' },
        sessionLengths: [{ type: Number }],

        rating: { type: Number, default: 0, min: 0, max: 5 },
        ratingCount: { type: Number, default: 0 },
        sessionsCompleted: { type: Number, default: 0 },

        languages: [{ type: String }],
        isAvailable: { type: Boolean, default: true },
        isVetted: { type: Boolean, default: false }
    },
    { timestamps: true }
);

consultantSchema.index({ category: 1, isAvailable: 1 });

const consultationBookingSchema = new mongoose.Schema(
    {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        consultant: { type: mongoose.Schema.Types.ObjectId, ref: 'Consultant' },
        reference: { type: String, unique: true, index: true },

        category: { type: String, required: true },
        topic: { type: String, required: true, maxlength: 200 },
        date: { type: Date, required: true },
        time: { type: String, required: true },
        duration: { type: Number, required: true },
        mode: { type: String, enum: ['video', 'audio', 'chat'], default: 'video' },

        name: { type: String, required: true },
        contact: { type: String, required: true },
        notes: { type: String, maxlength: 1000 },

        amount: { type: Number, required: true, min: 0 },
        currency: { type: String, default: 'ZMW' },

        status: {
            type: String,
            enum: ['pending', 'confirmed', 'completed', 'cancelled', 'no-show'],
            default: 'pending'
        },

        payment: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment' }
    },
    { timestamps: true }
);

consultationBookingSchema.pre('save', function (next) {
    if (!this.reference) {
        this.reference = `CONS-${Date.now().toString(36).toUpperCase()}-${Math.random()
            .toString(36).slice(2, 5).toUpperCase()}`;
    }
    next();
});

module.exports = {
    Consultant: mongoose.model('Consultant', consultantSchema),
    ConsultationBooking: mongoose.model('ConsultationBooking', consultationBookingSchema)
};