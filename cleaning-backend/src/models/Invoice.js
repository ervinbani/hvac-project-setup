const mongoose = require('mongoose');

const invoiceSchema = new mongoose.Schema(
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
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job',
    },
    invoiceNumber: { type: String, required: true },
    items: [
      {
        description: String,
        quantity: Number,
        unitPrice: Number,
        total: Number,
      },
    ],
    subtotal: Number,
    tax: Number,
    total: Number,
    currency: { type: String, default: 'USD' },
    status: {
      type: String,
      enum: ['draft', 'sent', 'paid', 'overdue', 'void'],
      default: 'draft',
    },
    dueDate: Date,
    paidAt: Date,
    paymentMethod: {
      type: String,
      enum: ['cash', 'card', 'bank_transfer', 'stripe', 'other'],
    },
  },
  { timestamps: true }
);

invoiceSchema.index({ tenantId: 1, invoiceNumber: 1 }, { unique: true });
invoiceSchema.index({ tenantId: 1, customerId: 1 });

module.exports = mongoose.model('Invoice', invoiceSchema);
