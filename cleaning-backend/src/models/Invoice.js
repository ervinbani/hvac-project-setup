const mongoose = require("mongoose");

const invoiceSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job",
      // keep for backward compat, deprecated
    },
    jobIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Job",
      },
    ],
    invoiceNumber: { type: String, required: true },

    // Snapshot cliente al momento dell'emissione
    customerSnapshot: {
      name: String,
      email: String,
      address: String,
      vatNumber: String,
    },

    issuedDate: { type: Date, default: Date.now },
    dueDate: Date,

    // Periodo del servizio
    servicePeriod: {
      from: Date,
      to: Date,
    },

    items: [
      {
        description: String,
        serviceType: String,
        quantity: Number,
        unit: { type: String, default: "hours" },
        unitPrice: Number,
        priceUnit: {
          type: String,
          enum: ["per_hour", "per_job", "per_day", "no_price"],
        },
        total: Number,
      },
    ],

    subtotal: Number,
    discount: {
      type: { type: String, enum: ["percentage", "fixed"], default: "fixed" },
      value: { type: Number, default: 0, min: 0 },
      // Computed and stored at save time – do NOT recompute on read
      amount: { type: Number, default: 0 },
    },
    taxRate: { type: Number, default: 0 },
    tax: Number,
    total: Number,
    currency: { type: String, enum: ["USD", "EUR"], default: "USD" },

    status: {
      type: String,
      enum: ["draft", "sent", "paid", "partially_paid", "overdue", "void"],
      default: "draft",
    },

    paidAt: Date,
    paymentMethod: {
      type: String,
      enum: ["cash", "card", "bank_transfer", "stripe", "paypal", "other"],
    },

    notes: String,
  },
  { timestamps: true },
);

invoiceSchema.index({ tenantId: 1, invoiceNumber: 1 }, { unique: true });
invoiceSchema.index({ tenantId: 1, customerId: 1 });
invoiceSchema.index({ tenantId: 1, jobIds: 1 });
invoiceSchema.index({ tenantId: 1, status: 1 });

module.exports = mongoose.model("Invoice", invoiceSchema);
