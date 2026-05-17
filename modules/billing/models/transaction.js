/**
 * Transaction Model
 */

const mongoose = require('mongoose');

var TransactionSchema = new mongoose.Schema({
    shopId: mongoose.Schema.Types.ObjectId,
    type: { type: String, enum: ['credit', 'debit'] },
    amount: { type: Number, default: 0 },
    description: String,
    status: { type: String, enum: ['pending', 'completed', 'failed'], default: 'pending' },
}, { toJSON: { virtuals: true }, toObject: { virtuals: true }, timestamps: true });

TransactionSchema.index({ shopId: 1, createdAt: -1 }, {});

module.exports = mongoose.model("Transaction", TransactionSchema);
