const mongoose = require('mongoose');

const institutionSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true, maxlength: 200 },
        type: {
            type: String, required: true,
            enum: ['university', 'college', 'highschool', 'primaryschool']
        },
        logo: String,
        banner: String,
        location: { city: String, country: String, address: String },

        description: { type: String, maxlength: 3000 },
        rating: { type: Number, default: 0, min: 0, max: 5 },
        ratingCount: { type: Number, default: 0 },
        established: Number,
        studentCount: Number,
        programCount: Number,

        programs: [{ name: String, duration: String, level: String }],
        highlights: [String],

        contact: { phone: String, email: String, website: String },
        fees: [
            {
                program: String, tuition: Number,
                currency: { type: String, default: 'ZMW' }, period: String
            }
        ],

        isActive: { type: Boolean, default: true }
    },
    { timestamps: true }
);

institutionSchema.index({ type: 1, isActive: 1 });
institutionSchema.index({ name: 'text', description: 'text' });

const libraryBookSchema = new mongoose.Schema(
    {
        title: { type: String, required: true, trim: true },
        author: { type: String, trim: true },
        cover: String,
        description: { type: String, maxlength: 1500 },
        category: String,
        level: String,
        language: String,

        isFree: { type: Boolean, default: true },
        price: { type: Number, default: 0, min: 0 },
        currency: { type: String, default: 'ZMW' },

        fileUrl: String,
        externalUrl: String,

        downloads: { type: Number, default: 0 },
        rating: { type: Number, default: 0 }
    },
    { timestamps: true }
);

libraryBookSchema.index({ title: 'text', author: 'text', description: 'text' });

const tutorRequestSchema = new mongoose.Schema(
    {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        reference: { type: String, unique: true, sparse: true },

        subject: { type: String, required: true },
        level: { type: String, required: true },
        mode: { type: String, default: 'Online (Video Call)' },
        schedule: String,

        name: { type: String, required: true },
        contact: { type: String, required: true },
        notes: { type: String, maxlength: 1000 },

        status: {
            type: String,
            enum: ['pending', 'assigned', 'completed', 'cancelled'],
            default: 'pending'
        },

        assignedTutor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
    },
    { timestamps: true }
);

module.exports = {
    Institution: mongoose.model('Institution', institutionSchema),
    LibraryBook: mongoose.model('LibraryBook', libraryBookSchema),
    TutorRequest: mongoose.model('TutorRequest', tutorRequestSchema)
};