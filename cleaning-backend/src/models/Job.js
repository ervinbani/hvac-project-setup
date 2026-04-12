const mongoose = require("mongoose");

const jobSchema = new mongoose.Schema(
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
    serviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Service",
    },
    title: String,
    propertyAddress: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: { type: String, default: "US" },
      location: {
        lat: Number,
        lng: Number,
      },
    },
    scheduledStart: { type: Date, required: true },
    scheduledEnd: Date,
    status: {
      type: String,
      enum: [
        "scheduled",
        "confirmed",
        "in_progress",
        "completed",
        "canceled",
        "no_show",
      ],
      default: "scheduled",
    },
    assignedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    checklist: [
      {
        label: { en: String, es: String },
        completed: { type: Boolean, default: false },
      },
    ],
    notesInternal: String,
    notesCustomer: String,
    recurringRuleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "RecurringRule",
    },
    price: Number,
    priceUnit: {
      type: String,
      enum: ['per_hour', 'per_job', 'per_day'],
      default: 'per_job',
    },
    timeDuration: { type: Number, default: 0 },
    invoiceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Invoice",
    },
  },
  { timestamps: true },
);

jobSchema.index({ tenantId: 1, scheduledStart: 1 });
jobSchema.index({ tenantId: 1, customerId: 1 });
jobSchema.index({ tenantId: 1, status: 1 });

module.exports = mongoose.model("Job", jobSchema);
