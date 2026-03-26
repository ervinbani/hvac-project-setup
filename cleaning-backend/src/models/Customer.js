const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true,
    },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: String,
    phone: String,
    preferredLanguage: { type: String, enum: ['en', 'es'], default: 'en' },
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: { type: String, default: 'US' },
      location: {
        lat: Number,
        lng: Number,
      },
    },
    notes: String,
    tags: [String],
    status: {
      type: String,
      enum: ['lead', 'active', 'inactive'],
      default: 'lead',
    },
    source: {
      type: String,
      enum: ['manual', 'website', 'phone', 'referral', 'facebook', 'google'],
      default: 'manual',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Customer', customerSchema);
