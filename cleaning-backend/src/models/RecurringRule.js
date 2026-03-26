const mongoose = require('mongoose');

const recurringRuleSchema = new mongoose.Schema(
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
      required: true,
    },
    serviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Service',
    },
    frequency: {
      type: String,
      enum: ['weekly', 'biweekly', 'monthly'],
      required: true,
    },
    dayOfWeek: Number,
    dayOfMonth: Number,
    startDate: Date,
    endDate: Date,
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('RecurringRule', recurringRuleSchema);
