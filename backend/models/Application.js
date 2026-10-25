const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema(
    {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        reference: { type: String, unique: true, index: true },

        type: {
            type: String, required: true,
            enum: [
                'share-purchase', 'education', 'loan', 'partner', 'become-partner',
                'rental', 'construction', 'consultation', 'tutor', 'permit', 'etf', 'market'
            ]
        },

        status: {
            type: String,
            enum: ['pending', 'under-review', 'approved', 'rejected', 'cancelled'],
            default: 'pending'
        },

        applicantName: { type: String, required: true, trim: true, maxlength: 120 },
        applicantEmail: { type: String, required: true, lowercase: true, trim: true },
        applicantPhone: { type: String, required: true, trim: true, maxlength: 40 },

        data: { type: mongoose.Schema.Types.Mixed, default: {} },
        notes: { type: String, maxlength: 2000 },
        adminNotes: { type: String, maxlength: 2000 },
        reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        reviewedAt: Date
    },
    { timestamps: true }
);

applicationSchema.index({ type: 1, status: 1, createdAt: -1 });

applicationSchema.pre('save', function (next) {
    if (!this.reference) {
        const p = (this.type || 'APP').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4);
        this.reference = `${p}-${Date.now().toString(36).toUpperCase()}-${Math.random()
            .toString(36).slice(2, 6).toUpperCase()}`;
    }
    next();
});

module.exports = mongoose.model('Application', applicationSchema);