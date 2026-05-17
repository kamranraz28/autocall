/**
 * Wallet Model
 */

const mongoose = require('mongoose');

var WalletSchema = new mongoose.Schema({
    shopId: { type: mongoose.Schema.Types.ObjectId, unique: true },
    currency: { type: String, default: 'USD' },
    balance: { type: Number, default: 0 },
    availableBalance: { type: Number, default: 0 },
    pendingCharges: { type: Number, default: 0 },
    autoRecharge: {
        enabled: { type: Boolean, default: false },
        threshold: { type: Number, default: 0 },
        amount: { type: Number, default: 0 },
        paymentMethodId: String,
    },
    billingAddress: {
        country: String,
        timezone: String,
    },
}, { toJSON: { virtuals: true }, toObject: { virtuals: true }, timestamps: true });

WalletSchema.index({ shopId: 1 }, {});

module.exports = mongoose.model("Wallet", WalletSchema);
