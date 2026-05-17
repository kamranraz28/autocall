/**
 * Recording Model
 */

const mongoose = require('mongoose');

var RecordingSchema = new mongoose.Schema({
    shopId: mongoose.Schema.Types.ObjectId,
    textMessage: String,
    type: { type: String, enum: ['welcome', 'success', 'cancel'] },
    language: { type: String, default: 'en-US' },
    fileUrl: String,
    duration: { type: Number, default: 0 },
    status: { type: String, enum: ['active', 'archived', 'processing', 'failed'], default: 'processing' },
}, { toJSON: { virtuals: true }, toObject: { virtuals: true }, timestamps: true });

RecordingSchema.index({ shopId: 1, createdAt: -1 }, {});
RecordingSchema.index({ shopId: 1, type: 1 }, {});
RecordingSchema.index({ shopId: 1, status: 1 }, {});
RecordingSchema.index({ shopId: 1, language: 1 }, {});

module.exports = mongoose.model("Recording", RecordingSchema);
