const mongoose = require('mongoose');

const partnerAppSchema = new mongoose.Schema(
  {
    partner: { type: mongoose.Schema.Types.ObjectId, ref: 'Partner', index: true },
    applicantUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    fullName: { type: String, required: true, maxlength: 120 },
    email: { type: String, required: true, maxlength: 150 },
    phone: { type: String, required: true, maxlength: 40 },
    serviceRequired: { type: String, maxlength: 150 },
    notes: { type: String, maxlength: 1000 },
    status: { type: String, enum: ['pending', 'reviewed', 'accepted', 'rejected'], default: 'pending', index: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model('PartnerApplication', partnerAppSchema);