const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { ROLES } = require('../config/constants');

const userSchema = new mongoose.Schema(
  {
    fullName: { type: String, trim: true, maxlength: 120 },
    email: { type: String, trim: true, lowercase: true, unique: true, sparse: true, index: true },
    phone: { type: String, trim: true, unique: true, sparse: true, index: true },
    passwordHash: { type: String, required: true, select: false },
    country: { type: String, required: true, uppercase: true, maxlength: 2 },
    currency: { type: String, required: true },
    role: { type: String, enum: Object.values(ROLES), default: ROLES.USER, index: true },
    avatar: { type: String, default: 'images/default-avatar.png' },
    isActive: { type: Boolean, default: true },
    lastLoginAt: Date,
    refreshTokens: [{ token: String, createdAt: { type: Date, default: Date.now } }]
  },
  { timestamps: true }
);

userSchema.methods.comparePassword = function (plain) {
  return bcrypt.compare(plain, this.passwordHash);
};

userSchema.statics.hashPassword = async function (plain) {
  const rounds = Number(process.env.BCRYPT_ROUNDS || 12);
  return bcrypt.hash(plain, rounds);
};

userSchema.methods.toSafeJSON = function () {
  const obj = this.toObject();
  delete obj.passwordHash;
  delete obj.refreshTokens;
  return obj;
};

module.exports = mongoose.model('User', userSchema);