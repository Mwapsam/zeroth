const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true, maxlength: 120 },
        email: {
            type: String, required: true, unique: true, lowercase: true, trim: true,
            match: [/^\S+@\S+\.\S+$/, 'Invalid email']
        },
        password: { type: String, required: true, minlength: 6, select: false },
        phone: { type: String, required: true, trim: true, maxlength: 40 },
        country: { type: String, default: 'ZM', trim: true, maxlength: 4 },
        role: {
            type: String,
            enum: ['user', 'admin', 'vendor', 'landlord', 'consultant'],
            default: 'user'
        },
        isVerified: { type: Boolean, default: false },
        avatar: { type: String, default: 'images/default-avatar.png' },
        bio: { type: String, maxlength: 500 },

        wallet: {
            balance: { type: Number, default: 0, min: 0 },
            currency: { type: String, default: 'ZMW' }
        },

        favorites: [{ type: String }],
        etfWatchlist: [{ type: String }],
        etfHoldings: [
            {
                symbol: { type: String, required: true },
                company: String,
                shares: { type: Number, default: 0, min: 0 },
                avgPrice: { type: Number, default: 0, min: 0 },
                exchange: String,
                currency: { type: String, default: 'ZMW' }
            }
        ],

        preferences: {
            notifications: { type: Boolean, default: true },
            language: { type: String, default: 'en' }
        },

        lastLoginAt: Date
    },
    { timestamps: true }
);

userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password, 12);
    next();
});

userSchema.methods.comparePassword = function (candidate) {
    return bcrypt.compare(candidate, this.password);
};

userSchema.methods.toPublic = function () {
    return {
        id: this._id,
        name: this.name,
        email: this.email,
        phone: this.phone,
        country: this.country,
        role: this.role,
        isVerified: this.isVerified,
        avatar: this.avatar,
        bio: this.bio,
        wallet: this.wallet,
        etfWatchlist: this.etfWatchlist,
        etfHoldings: this.etfHoldings,
        favorites: this.favorites,
        createdAt: this.createdAt
    };
};

module.exports = mongoose.model('User', userSchema);