const mongoose = require('mongoose');

const contactSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true, maxlength: 120 },
        email: { type: String, required: true, lowercase: true, trim: true },
        phone: { type: String, trim: true, maxlength: 40 },
        subject: { type: String, maxlength: 200 },
        message: { type: String, required: true, minlength: 5, maxlength: 2000 },
        status: {
            type: String,
            enum: ['new', 'read', 'replied', 'closed'],
            default: 'new'
        },
        ip: String,
        userAgent: String
    },
    { timestamps: true }
);

module.exports = mongoose.model('Contact', contactSchema);