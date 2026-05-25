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
      default: "job",
    },
    overtime: {
      isEnabled: { type: Boolean, default: false },
      unit: {
        type: String,
        default: "hour",
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
