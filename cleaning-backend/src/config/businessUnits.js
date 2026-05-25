/**
 * Default unit sets per business type.
 * Each tenant inherits these defaults based on its businessType,
 * and can extend them via unitSettings in the Tenant model.
 *
 * productUnits  → physical units used for products/inventory
 * priceUnits    → billing units used for services, jobs and invoice items
 */

const BUSINESS_UNITS = {
  default: {
    productUnits: ["piece", "box", "pack", "other"],
    priceUnits: ["hour", "job", "day"],
  },

  cleaning: {
    productUnits: ["piece", "box", "liter", "kg", "gallon", "pack", "other"],
    priceUnits: ["hour", "job", "day", "sqft", "m2"],
  },

  hvac: {
    productUnits: [
      "piece",
      "unit",
      "meter",
      "kg",
      "liter",
      "pack",
      "roll",
      "other",
    ],
    priceUnits: ["hour", "job", "day", "unit"],
  },

  plumbing: {
    productUnits: [
      "piece",
      "meter",
      "connection",
      "kg",
      "liter",
      "pack",
      "other",
    ],
    priceUnits: ["hour", "job", "day", "meter"],
  },

  landscaping: {
    productUnits: ["piece", "bag", "kg", "liter", "m2", "sqft", "pack", "other"],
    priceUnits: ["hour", "job", "day", "m2", "sqft"],
  },

  electrical: {
    productUnits: [
      "piece",
      "meter",
      "roll",
      "pack",
      "unit",
      "box",
      "other",
    ],
    priceUnits: ["hour", "job", "day", "point"],
  },

  painting: {
    productUnits: ["liter", "kg", "piece", "m2", "sqft", "roll", "pack", "other"],
    priceUnits: ["hour", "job", "day", "m2", "sqft"],
  },
};

/**
 * Returns the merged (effective) unit sets for a tenant.
 *
 * @param {string} businessType  - tenant.businessType
 * @param {{ productUnits?: string[], priceUnits?: string[] }} unitSettings - tenant.unitSettings
 * @returns {{ productUnits: string[], priceUnits: string[] }}
 */
function getEffectiveUnits(businessType, unitSettings = {}) {
  const base = BUSINESS_UNITS[businessType] || BUSINESS_UNITS.default;

  const productUnits = [
    ...new Set([
      ...base.productUnits,
      ...(unitSettings.productUnits || []),
    ]),
  ];

  const priceUnits = [
    ...new Set([
      ...base.priceUnits,
      ...(unitSettings.priceUnits || []),
    ]),
  ];

  return { productUnits, priceUnits };
}

module.exports = { BUSINESS_UNITS, getEffectiveUnits };
