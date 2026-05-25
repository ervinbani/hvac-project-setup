const mongoose = require("mongoose");
const { AVAILABLE_LANG_CODES } = require("../config/languages");

const languageEntrySchema = new mongoose.Schema(
  {
    lang: { type: String, required: true, enum: AVAILABLE_LANG_CODES },
    label: { type: String, required: true },
    active: { type: Boolean, default: false },
    isDefault: { type: Boolean, default: false },
  },
  { _id: false },
);

const tenantSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    businessType: { type: String, default: "cleaning" },
    languages: {
      type: [languageEntrySchema],
      default: [],
    },
    timezone: { type: String, default: "America/New_York" },
    contactEmail: String,
    contactPhone: String,
    branding: {
      logoUrl: String,
      primaryColor: String,
    },
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: String,
    },
    subscription: {
      plan: {
        type: String,
        enum: ["trial", "basic", "pro", "enterprise"],
        default: "trial",
      },
      status: {
        type: String,
        enum: ["active", "past_due", "canceled"],
        default: "active",
      },
      renewalDate: Date,
    },

    // Per-tenant unit customisation (extends the businessType defaults)
    unitSettings: {
      productUnits: { type: [String], default: [] },
      priceUnits: { type: [String], default: [] },
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Tenant", tenantSchema);
