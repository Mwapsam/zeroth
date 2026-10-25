const mongoose = require('mongoose');

const entertainmentSchema = new mongoose.Schema(
    {
        uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        uploaderName: String,

        type: {
            type: String, required: true,
            enum: ['cartoons', 'music', 'movies']
        },

        title: { type: String, required: true, trim: true, maxlength: 200 },
        artist: { type: String, maxlength: 200 },
        description: { type: String, maxlength: 1500 },

        fileUrl: { type: String, required: true },
        coverUrl: String,
        fileSize: Number,
        mimeType: String,

        duration: Number,

        views: { type: Number, default: 0 },
        likes: { type: Number, default: 0 },

        isApproved: { type: Boolean, default: true },
        isFeatured: { type: Boolean, default: false },

        tags: [{ type: String }]
    },
    { timestamps: true }
);

entertainmentSchema.index({ type: 1, isApproved: 1, createdAt: -1 });
entertainmentSchema.index({ title: 'text', artist: 'text', description: 'text' });

module.exports = mongoose.model('Entertainment', entertainmentSchema);