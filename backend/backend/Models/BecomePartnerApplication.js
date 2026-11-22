const mongoose = require('mongoose');

const becomePartnerSchema = new mongoose.Schema(
  {
    companyName: { type: String, required: true, maxlength: 120 },
    category: { type: String, required: true },
    yearsInBusiness: { type: Number, min: 0, max: 99 },
    website: { type: String, maxlength: 200 },
    city: { type: String, required: true, maxlength: 120 },
    employees: { type: String },
    contactName: { type: String, required: true, maxlength: 120 },
    contactRole: { type: String, maxlength: 80 },
    email: { type: String, required: true, maxlength: 150 },
    phone: { type: String, required: true, maxlength: 40 },
    services: { type: String, required: true, maxlength: 500 },
    motivation: { type: String, maxlength: 400 },
    status: { type: String, enum: ['pending', 'reviewed', 'accepted', 'rejected'], default: 'pending', index: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model('BecomePartnerApplication', becomePartnerSchema);