const mongoose = require('mongoose');

const internalMessageSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    fromUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    toUserId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    subject:    { type: String, maxlength: 255, default: null },
    body:       { type: String, required: true, maxlength: 2000 },
    isRead:     { type: Boolean, default: false },
    readAt:     { type: Date, default: null },
  },
  { timestamps: true }
);

// Compound index for fast thread queries
internalMessageSchema.index({ tenantId: 1, fromUserId: 1, toUserId: 1, createdAt: -1 });

module.exports = mongoose.model('InternalMessage', internalMessageSchema);
