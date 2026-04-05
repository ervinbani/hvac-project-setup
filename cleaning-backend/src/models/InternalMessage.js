const mongoose = require('mongoose');

const internalMessageSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true,
    },
    fromUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    toUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    body: {
      type: String,
      required: true,
      maxlength: 2000,
    },
    subject: {
      type: String,
      default: null,
      maxlength: 255,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    readAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

internalMessageSchema.index({ tenantId: 1, toUserId: 1, isRead: 1 });
internalMessageSchema.index({ tenantId: 1, fromUserId: 1, toUserId: 1, createdAt: -1 });

module.exports = mongoose.model('InternalMessage', internalMessageSchema);
