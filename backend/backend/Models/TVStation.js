const mongoose = require('mongoose');

const tvSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, maxlength: 60 },
    type: { type: String, enum: ['streaming', 'live', 'vod', 'app'], default: 'streaming' },
    url: { type: String, maxlength: 300 },
    icon: { type: String, default: '📺', maxlength: 4 },
    addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model('TVStation', tvSchema);