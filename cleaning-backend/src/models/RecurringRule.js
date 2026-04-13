const mongoose = require("mongoose");

const recurringRuleSchema = new mongoose.Schema(
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
    frequency: {
      type: String,
      enum: ["daily", "weekly", "monthly"],
      required: true,
    },
    dayOfWeek: Number, // deprecated — use daysOfWeek
    daysOfWeek: { type: [Number], default: [0, 1, 2, 3, 4, 5, 6] }, // 0=Sun … 6=Sat
    dayOfMonth: Number, // 1-31, used for monthly
    monthsOfYear: {
      type: [Number],
      default: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    }, // 1-12
    startDate: { type: Date, required: true },
    endDate: Date,

    // Job template fields — copied into each generated Job
    title: String,
    startTime: { type: String, required: true }, // "HH:MM" UTC
    timeDuration: { type: Number, default: 0 }, // hours
    price: Number,
    priceUnit: {
      type: String,
      enum: ["per_hour", "per_job", "per_day"],
      default: "per_job",
    },
    propertyAddress: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: { type: String, default: "US" },
    },
    assignedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

module.exports = mongoose.model("RecurringRule", recurringRuleSchema);
