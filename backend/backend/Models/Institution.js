const mongoose = require('mongoose');

const instSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, maxlength: 150 },
    type: { type: String, enum: ['university', 'college', 'highschool', 'primaryschool'], required: true, index: true },
    location: String,
    website: String,
    logo: String,
    description: String
  },
  { timestamps: true }
);

module.exports = mongoose.model('Institution', instSchema);