const bcrypt = require("bcryptjs");
const Tenant = require("../models/Tenant");
const {
  AVAILABLE_LANGUAGES,
  AVAILABLE_LANG_CODES,
} = require("../config/languages");
const { BUSINESS_UNITS, getEffectiveUnits } = require("../config/businessUnits");
const User = require("../models/User");
const Role = require("../models/Role");
const Customer = require("../models/Customer");
const Job = require("../models/Job");
const Invoice = require("../models/Invoice");
const Service = require("../models/Service");
const RecurringRule = require("../models/RecurringRule");
const AutomationRule = require("../models/AutomationRule");
const MessageLog = require("../models/MessageLog");
const InternalMessage = require("../models/InternalMessage");
const AuditLog = require("../models/AuditLog");

// GET /api/tenant
const getTenant = async (req, res, next) => {
  try {
    const tenant = await Tenant.findById(req.user.tenantId);
    if (!tenant) {
      return res
        .status(404)
        .json({ success: false, error: "Tenant not found" });
    }

    res.json({ success: true, data: tenant });
  } catch (err) {
    next(err);
  }
};

// PUT /api/tenant
const updateTenant = async (req, res, next) => {
  try {
    const allowedFields = [
      "name",
      "timezone",
      "contactEmail",
      "contactPhone",
      "branding",
      "address",
    ];

    const updates = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    const tenant = await Tenant.findByIdAndUpdate(
      req.user.tenantId,
      { $set: updates },
      { new: true, runValidators: true },
    );

    if (!tenant) {
      return res
        .status(404)
        .json({ success: false, error: "Tenant not found" });
    }

    res.json({ success: true, data: tenant });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/tenant — elimina il tenant e tutta la sua data (solo owner)
const deleteTenant = async (req, res, next) => {
  try {
    // Require password confirmation to prevent accidental deletion
    const { password } = req.body;
    if (!password) {
      return res
        .status(400)
        .json({ success: false, error: "Password confirmation required" });
    }

    const owner = await User.findById(req.user.id)
      .select("passwordHash")
      .lean();
    if (!owner) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    const valid = await bcrypt.compare(password, owner.passwordHash);
    if (!valid) {
      return res
        .status(403)
        .json({ success: false, error: "Invalid password" });
    }

    const tid = req.user.tenantId;

    // Delete all tenant-scoped data in parallel
    await Promise.all([
      User.deleteMany({ tenantId: tid }),
      Role.deleteMany({ tenantId: tid }),
      Customer.deleteMany({ tenantId: tid }),
      Job.deleteMany({ tenantId: tid }),
      Invoice.deleteMany({ tenantId: tid }),
      Service.deleteMany({ tenantId: tid }),
      RecurringRule.deleteMany({ tenantId: tid }),
      AutomationRule.deleteMany({ tenantId: tid }),
      MessageLog.deleteMany({ tenantId: tid }),
      InternalMessage.deleteMany({ tenantId: tid }),
      AuditLog.deleteMany({ tenantId: tid }),
    ]);

    // Finally delete the tenant itself
    await Tenant.findByIdAndDelete(tid);

    res.json({
      success: true,
      message: "Account and all associated data permanently deleted",
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/tenant/languages — list available system languages
const getAvailableLanguages = async (req, res) => {
  res.json({ success: true, data: AVAILABLE_LANGUAGES });
};

// PUT /api/tenant/languages — replace the tenant's languages array
const updateLanguages = async (req, res, next) => {
  try {
    const { languages } = req.body;

    if (!Array.isArray(languages) || languages.length === 0) {
      return res
        .status(400)
        .json({ success: false, error: "languages must be a non-empty array" });
    }

    // Validate each entry
    for (const entry of languages) {
      if (!AVAILABLE_LANG_CODES.includes(entry.lang)) {
        return res.status(400).json({
          success: false,
          error: `Unsupported language code: ${entry.lang}`,
        });
      }
    }

    // Exactly one isDefault must exist and it must be active
    const defaults = languages.filter((l) => l.isDefault);
    if (defaults.length !== 1) {
      return res.status(400).json({
        success: false,
        error: "Exactly one language must be set as default",
      });
    }
    if (!defaults[0].active) {
      return res.status(400).json({
        success: false,
        error: "The default language must be active",
      });
    }

    // Enrich each entry with the canonical label from the registry
    const enriched = languages.map((entry) => {
      const meta = AVAILABLE_LANGUAGES.find((l) => l.lang === entry.lang);
      return {
        lang: entry.lang,
        label: meta ? meta.label : entry.label,
        active: Boolean(entry.active),
        isDefault: Boolean(entry.isDefault),
      };
    });

    const tenant = await Tenant.findByIdAndUpdate(
      req.user.tenantId,
      { $set: { languages: enriched } },
      { new: true, runValidators: true },
    );

    if (!tenant) {
      return res
        .status(404)
        .json({ success: false, error: "Tenant not found" });
    }

    res.json({ success: true, data: tenant.languages });
  } catch (err) {
    next(err);
  }
};

// GET /api/tenant/units — returns effective unit sets for this tenant
const getUnits = async (req, res, next) => {
  try {
    const tenant = await Tenant.findById(req.user.tenantId)
      .select("businessType unitSettings")
      .lean();
    if (!tenant) {
      return res.status(404).json({ success: false, error: "Tenant not found" });
    }

    const effective = getEffectiveUnits(tenant.businessType, tenant.unitSettings);
    const defaults = (BUSINESS_UNITS[tenant.businessType] || BUSINESS_UNITS.default);

    res.json({
      success: true,
      data: {
        businessType: tenant.businessType,
        productUnits: effective.productUnits,
        priceUnits: effective.priceUnits,
        defaults: {
          productUnits: defaults.productUnits,
          priceUnits: defaults.priceUnits,
        },
        custom: {
          productUnits: tenant.unitSettings?.productUnits || [],
          priceUnits: tenant.unitSettings?.priceUnits || [],
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

// PUT /api/tenant/units — updates custom unit additions for this tenant
const updateUnits = async (req, res, next) => {
  try {
    const { productUnits, priceUnits } = req.body;
    const updates = {};

    if (productUnits !== undefined) {
      if (
        !Array.isArray(productUnits) ||
        !productUnits.every((u) => typeof u === "string" && u.trim().length > 0)
      ) {
        return res.status(400).json({
          success: false,
          error: "productUnits must be an array of non-empty strings",
        });
      }
      updates["unitSettings.productUnits"] = [
        ...new Set(productUnits.map((u) => u.trim().toLowerCase())),
      ];
    }

    if (priceUnits !== undefined) {
      if (
        !Array.isArray(priceUnits) ||
        !priceUnits.every((u) => typeof u === "string" && u.trim().length > 0)
      ) {
        return res.status(400).json({
          success: false,
          error: "priceUnits must be an array of non-empty strings",
        });
      }
      updates["unitSettings.priceUnits"] = [
        ...new Set(priceUnits.map((u) => u.trim().toLowerCase())),
      ];
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        error: "Provide at least one of: productUnits, priceUnits",
      });
    }

    const tenant = await Tenant.findByIdAndUpdate(
      req.user.tenantId,
      { $set: updates },
      { new: true, runValidators: true },
    ).select("businessType unitSettings");

    if (!tenant) {
      return res.status(404).json({ success: false, error: "Tenant not found" });
    }

    const effective = getEffectiveUnits(tenant.businessType, tenant.unitSettings);
    res.json({ success: true, data: { effective, custom: tenant.unitSettings } });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getTenant,
  updateTenant,
  deleteTenant,
  getAvailableLanguages,
  updateLanguages,
  getUnits,
  updateUnits,
};
