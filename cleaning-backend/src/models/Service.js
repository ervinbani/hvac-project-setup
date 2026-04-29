const mongoose = require("mongoose");

const serviceSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true,
    },
    name: {
      en: { type: String, required: true },
      es: { type: String, required: true },
    },
    description: {
      en: String,
      es: String,
    },
    durationMinutes: Number,
    basePrice: Number,
    priceUnit: {
      type: String,
      enum: ["per_hour", "per_job", "per_day"],
      default: "per_job",
    },
    overtime: {
      isEnabled: { type: Boolean, default: false },
      unit: {
        type: String,
        enum: ["per_hour", "per_job", "per_day"],
        default: "per_hour",
      },
      extraPercentage: {
        type: Number,
        min: 0,
        max: 1000,
        default: null,
      },
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Service", serviceSchema);
