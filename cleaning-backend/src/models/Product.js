const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true,
    },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProductCategory",
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
    sku: { type: String, default: null },
    barcode: { type: String, default: null },
    unit: {
      type: String,
      default: "piece",
    },
    unitPrice: { type: Number, min: 0, default: 0 },
    cost: { type: Number, min: 0, default: null },
    stock: {
      tracked: { type: Boolean, default: false },
      quantity: { type: Number, default: 0 },
      lowStockAlert: { type: Number, default: null },
    },
    taxable: { type: Boolean, default: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

productSchema.index({ tenantId: 1, sku: 1 }, { unique: true, sparse: true });
productSchema.index({ tenantId: 1, categoryId: 1 });
productSchema.index({ tenantId: 1, isActive: 1 });

module.exports = mongoose.model("Product", productSchema);
