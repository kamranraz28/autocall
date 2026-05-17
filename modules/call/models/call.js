/**
 * Call Model
 */

const mongoose = require('mongoose');

var CallSchema = new mongoose.Schema({
    callId: { type: String, unique: true },
    shopId: mongoose.Schema.Types.ObjectId,
    status: { type: String, enum: ['queued', 'ringing', 'in-progress', 'completed', 'failed', 'no-answer', 'busy'], default: 'queued' },
    direction: { type: String, enum: ['outbound', 'inbound'], default: 'outbound' },
    to: String,
    from: String,
    recordingId: String,
    scriptId: String,
    variables: mongoose.Schema.Types.Mixed,
    webhookUrl: String,
    startedAt: Date,
    answeredAt: Date,
    endedAt: Date,
    duration: { type: Number, default: 0 },
    maxDuration: { type: Number, default: 300 },
    recordCall: { type: Boolean, default: true },
    estimatedCost: { type: Number, default: 0 },
    cost: { type: Number, default: 0 },
    currency: { type: String, default: 'USD' },
    callRecordingUrl: String,
    disposition: { type: String, enum: ['answered', 'busy', 'no-answer', 'failed'] },
    metadata: mongoose.Schema.Types.Mixed,
}, { toJSON: { virtuals: true }, toObject: { virtuals: true }, timestamps: true });

CallSchema.index({ shopId: 1, createdAt: -1 }, {});
CallSchema.index({ shopId: 1, status: 1 }, {});
CallSchema.index({ shopId: 1, to: 1 }, {});
CallSchema.index({ shopId: 1, from: 1 }, {});
CallSchema.index({ shopId: 1, recordingId: 1 }, {});
CallSchema.index({ shopId: 1, startedAt: -1 }, {});
CallSchema.index({ callId: 1 }, {});

module.exports = mongoose.model("Call", CallSchema);
