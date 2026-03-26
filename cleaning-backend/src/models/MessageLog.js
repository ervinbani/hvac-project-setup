const mongoose = require('mongoose');

const messageLogSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
    },
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job',
    },
    channel: {
      type: String,
      enum: ['sms', 'email', 'whatsapp'],
      required: true,
    },
    direction: {
      type: String,
      enum: ['outbound', 'inbound'],
      required: true,
    },
    language: { type: String, enum: ['en', 'es'], default: 'en' },
    templateKey: String,
    subject: String,
    body: String,
    provider: String,
    providerMessageId: String,
    status: {
      type: String,
      enum: ['queued', 'sent', 'delivered', 'failed', 'opened'],
      default: 'queued',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('MessageLog', messageLogSchema);
