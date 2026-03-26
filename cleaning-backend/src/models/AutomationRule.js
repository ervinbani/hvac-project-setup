const mongoose = require('mongoose');

const automationRuleSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true,
    },
    name: String,
    trigger: {
      type: String,
      enum: ['job_created', 'job_reminder_24h', 'job_completed', 'invoice_overdue'],
      required: true,
    },
    channel: {
      type: String,
      enum: ['sms', 'email'],
    },
    templateKey: String,
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('AutomationRule', automationRuleSchema);
