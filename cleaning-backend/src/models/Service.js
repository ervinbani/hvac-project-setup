const mongoose = require("mongoose");

const serviceSchema = new mongoose.Schema(
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
      default: null,
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
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Service", serviceSchema);
