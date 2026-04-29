const Service = require("../models/Service");

const VALID_UNITS = ["per_hour", "per_job", "per_day"];

// Validates the overtime object provided by the user
function validateOvertime(overtime) {
  if (typeof overtime !== "object" || overtime === null) {
    return "overtime must be an object";
  }
  if (overtime.isEnabled && overtime.extraPercentage == null) {
    return "overtime.extraPercentage is required when overtime is enabled";
  }
  if (overtime.extraPercentage != null) {
    const pct = Number(overtime.extraPercentage);
    if (!Number.isFinite(pct) || pct < 0 || pct > 1000) {
      return "overtime.extraPercentage must be a number between 0 and 1000";
    }
  }
  if (overtime.unit != null && !VALID_UNITS.includes(overtime.unit)) {
    return `overtime.unit must be one of: ${VALID_UNITS.join(", ")}`;
  }
  return null;
}

// GET /api/services
const listServices = async (req, res, next) => {
  try {
    const MAX_LIMIT = 100;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(
      MAX_LIMIT,
      Math.max(1, parseInt(req.query.limit) || 20),
    );
    const skip = (page - 1) * limit;

    const { isActive } = req.query;
    const filter = { tenantId: req.user.tenantId };
    if (isActive !== undefined) filter.isActive = isActive === "true";

    const [services, total] = await Promise.all([
      Service.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Service.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: services,
      pagination: { total, page, limit },
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/services
const createService = async (req, res, next) => {
  try {
    const {
      name,
      description,
      durationMinutes,
      basePrice,
      priceUnit,
      overtime,
      isActive,
    } = req.body;

    if (!name || !name.en || !name.es) {
      return res.status(400).json({
        success: false,
        error:
          "Service name is required in both English (name.en) and Spanish (name.es)",
      });
    }

    if (overtime !== undefined) {
      const validationError = validateOvertime(overtime);
      if (validationError) {
        return res.status(400).json({ success: false, error: validationError });
      }
    }

    const service = await Service.create({
      tenantId: req.user.tenantId,
      name,
      description,
      durationMinutes,
      basePrice,
      priceUnit,
      overtime,
      isActive,
    });

    res.status(201).json({ success: true, data: service });
  } catch (err) {
    next(err);
  }
};

// PUT /api/services/:id
const updateService = async (req, res, next) => {
  try {
    const allowedFields = [
      "name",
      "description",
      "durationMinutes",
      "basePrice",
      "priceUnit",
      "overtime",
      "isActive",
    ];
    const updates = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    if (updates.overtime !== undefined) {
      const validationError = validateOvertime(updates.overtime);
      if (validationError) {
        return res.status(400).json({ success: false, error: validationError });
      }
    }

    const service = await Service.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.user.tenantId },
      { $set: updates },
      { new: true, runValidators: true },
    );

    if (!service) {
      return res
        .status(404)
        .json({ success: false, error: "Service not found" });
    }

    res.json({ success: true, data: service });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/services/:id
const deleteService = async (req, res, next) => {
  try {
    const service = await Service.findOneAndDelete({
      _id: req.params.id,
      tenantId: req.user.tenantId,
    });

    if (!service) {
      return res
        .status(404)
        .json({ success: false, error: "Service not found" });
    }

    res.json({ success: true, data: { message: "Service deleted" } });
  } catch (err) {
    next(err);
  }
};

module.exports = { listServices, createService, updateService, deleteService };
