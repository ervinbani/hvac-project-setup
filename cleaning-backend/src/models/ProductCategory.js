const mongoose = require("mongoose");

const productCategorySchema = new mongoose.Schema(
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
    color: { type: String, default: null },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

productCategorySchema.index({ tenantId: 1, "name.en": 1 });

module.exports = mongoose.model("ProductCategory", productCategorySchema);
