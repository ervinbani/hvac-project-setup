const Service = require('../models/Service');

// GET /api/services
const listServices = async (req, res, next) => {
  try {
    const { isActive } = req.query;
    const filter = { tenantId: req.user.tenantId };
    if (isActive !== undefined) filter.isActive = isActive === 'true';

    const services = await Service.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, data: services });
  } catch (err) {
    next(err);
  }
};

// POST /api/services
const createService = async (req, res, next) => {
  try {
    const { name, description, durationMinutes, basePrice, isActive } = req.body;

    if (!name || !name.en || !name.es) {
      return res.status(400).json({
        success: false,
        error: 'Service name is required in both English (name.en) and Spanish (name.es)',
      });
    }

    const service = await Service.create({
      tenantId: req.user.tenantId,
      name,
      description,
      durationMinutes,
      basePrice,
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
    const allowedFields = ['name', 'description', 'durationMinutes', 'basePrice', 'isActive'];
    const updates = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    const service = await Service.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.user.tenantId },
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!service) {
      return res.status(404).json({ success: false, error: 'Service not found' });
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
      return res.status(404).json({ success: false, error: 'Service not found' });
    }

    res.json({ success: true, data: { message: 'Service deleted' } });
  } catch (err) {
    next(err);
  }
};

module.exports = { listServices, createService, updateService, deleteService };
