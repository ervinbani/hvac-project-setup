const bcrypt = require('bcryptjs');
const Tenant = require('../models/Tenant');
const User = require('../models/User');
const Role = require('../models/Role');
const Customer = require('../models/Customer');
const Job = require('../models/Job');
const Invoice = require('../models/Invoice');
const Service = require('../models/Service');
const RecurringRule = require('../models/RecurringRule');
const AutomationRule = require('../models/AutomationRule');
const MessageLog = require('../models/MessageLog');
const InternalMessage = require('../models/InternalMessage');
const AuditLog = require('../models/AuditLog');

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

// DELETE /api/tenant — elimina il tenant e tutta la sua data (solo owner)
const deleteTenant = async (req, res, next) => {
  try {
    // Require password confirmation to prevent accidental deletion
    const { password } = req.body;
    if (!password) {
      return res.status(400).json({ success: false, error: 'Password confirmation required' });
    }

    const owner = await User.findById(req.user.id).select('passwordHash').lean();
    if (!owner) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const valid = await bcrypt.compare(password, owner.passwordHash);
    if (!valid) {
      return res.status(403).json({ success: false, error: 'Invalid password' });
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

    res.json({ success: true, message: 'Account and all associated data permanently deleted' });
  } catch (err) {
    next(err);
  }
};

module.exports = { getTenant, updateTenant, deleteTenant };
