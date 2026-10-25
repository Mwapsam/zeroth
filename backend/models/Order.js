const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema(
    {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

        type: {
            type: String,
            enum: ['market', 'hardware', 'agriculture'],
            default: 'market'
        },

        items: {
            type: [
                {
                    item: { type: mongoose.Schema.Types.ObjectId, ref: 'HardwareItem' },
                    name: String,
                    price: { type: Number, min: 0 },
                    quantity: { type: Number, default: 1, min: 1 }
                }
            ],
            validate: [(v) => Array.isArray(v) && v.length > 0, 'Order must contain at least one item']
        },

        subtotal: { type: Number, required: true, min: 0 },
        tax: { type: Number, default: 0, min: 0 },
        deliveryFee: { type: Number, default: 0, min: 0 },
        total: { type: Number, required: true, min: 0 },
        currency: { type: String, default: 'ZMW' },

        paymentMethod: {
            type: String,
            enum: ['airtel', 'mtn', 'zamtel', 'bank', 'card', 'cash', 'wallet'],
            default: 'cash'
        },

        delivery: {
            method: String,
            address: String,
            city: String,
            notes: String
        },
        customer: { name: String, phone: String, email: String },

        status: {
            type: String,
            enum: ['pending', 'confirmed', 'processing', 'dispatched', 'delivered', 'cancelled'],
            default: 'pending'
        }
    },
    { timestamps: true }
);

orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ type: 1, status: 1 });

module.exports = mongoose.model('Order', orderSchema);
