const mongoose = require('mongoose');

const eduBookSchema = new mongoose.Schema(
    {
        title:       { type: String, required: true, trim: true, maxlength: 200 },
        author:      { type: String, default: 'Unknown', trim: true, maxlength: 120 },
        price:       { type: Number, default: 0, min: 0 },
        filename:    { type: String, required: true },   // stored name on disk
        originalName:{ type: String },
        size:        { type: Number },
        uploadedBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
    },
    { timestamps: true }
);

module.exports = mongoose.model('EduBook', eduBookSchema);