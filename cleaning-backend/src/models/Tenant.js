const mongoose = require('mongoose');

const tenantSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    businessType: { type: String, default: 'cleaning' },
    defaultLanguage: { type: String, enum: ['en', 'es'], default: 'en' },
    supportedLanguages: { type: [String], enum: ['en', 'es'], default: ['en', 'es'] },
    timezone: { type: String, default: 'America/New_York' },
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
        enum: ['trial', 'basic', 'pro', 'enterprise'],
        default: 'trial',
      },
      status: {
        type: String,
        enum: ['active', 'past_due', 'canceled'],
        default: 'active',
      },
      renewalDate: Date,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Tenant', tenantSchema);
