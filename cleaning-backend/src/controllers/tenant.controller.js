const Tenant = require('../models/Tenant');

// GET /api/tenant
const getTenant = async (req, res, next) => {
  try {
    const tenant = await Tenant.findById(req.user.tenantId);
    if (!tenant) {
      return res.status(404).json({ success: false, error: 'Tenant not found' });
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
      'name',
      'defaultLanguage',
      'supportedLanguages',
      'timezone',
      'contactEmail',
      'contactPhone',
      'branding',
      'address',
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
      { new: true, runValidators: true }
    );

    if (!tenant) {
      return res.status(404).json({ success: false, error: 'Tenant not found' });
    }

    res.json({ success: true, data: tenant });
  } catch (err) {
    next(err);
  }
};

module.exports = { getTenant, updateTenant };
