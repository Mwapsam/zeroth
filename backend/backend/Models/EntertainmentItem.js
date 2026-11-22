const mongoose = require('mongoose');

const entSchema = new mongoose.Schema(
  {
    uploader: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    title: { type: String, required: true, maxlength: 150 },
    category: { type: String, enum: ['cartoons', 'music', 'movies', 'sports'], required: true, index: true },
    description: String,
    mediaUrl: { type: String, required: true },
    thumbnailUrl: String,
    duration: Number,
    views: { type: Number, default: 0 },
    isApproved: { type: Boolean, default: false, index: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model('EntertainmentItem', entSchema);