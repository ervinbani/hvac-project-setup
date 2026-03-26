const Customer = require('../models/Customer');

// GET /api/customers
const listCustomers = async (req, res, next) => {
  try {
    const VALID_STATUSES = ['lead', 'active', 'inactive'];
    const VALID_SOURCES  = ['manual', 'website', 'phone', 'referral', 'facebook', 'google'];
    const MAX_LIMIT      = 100;

    const rawStatus = typeof req.query.status === 'string' ? req.query.status : undefined;
    const rawSource = typeof req.query.source === 'string' ? req.query.source : undefined;
    const rawSearch = typeof req.query.search === 'string' ? req.query.search : undefined;
    const page      = Math.max(1, parseInt(req.query.page) || 1);
    const limit     = Math.min(MAX_LIMIT, Math.max(1, parseInt(req.query.limit) || 20));

    const filter = { tenantId: req.user.tenantId };
    if (rawStatus && VALID_STATUSES.includes(rawStatus)) filter.status = rawStatus;
    if (rawSource && VALID_SOURCES.includes(rawSource)) filter.source = rawSource;

    if (rawSearch) {
      // Escape special regex characters to prevent ReDoS
      const escaped = rawSearch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').slice(0, 100);
      const regex = new RegExp(escaped, 'i');
      filter.$or = [
        { firstName: regex },
        { lastName: regex },
        { email: regex },
        { phone: regex },
      ];
    }

    const skip = (page - 1) * limit;

    const [customers, total] = await Promise.all([
      Customer.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Customer.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: customers,
      pagination: { total, page, limit },
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/customers/:id
const getCustomer = async (req, res, next) => {
  try {
    const customer = await Customer.findOne({
      _id: req.params.id,
      tenantId: req.user.tenantId,
    });

    if (!customer) {
      return res.status(404).json({ success: false, error: 'Customer not found' });
    }

    res.json({ success: true, data: customer });
  } catch (err) {
    next(err);
  }
};

// POST /api/customers
const createCustomer = async (req, res, next) => {
  try {
    const {
      firstName,
      lastName,
      email,
      phone,
      preferredLanguage,
      address,
      notes,
      tags,
      status,
      source,
    } = req.body;

    if (!firstName || !lastName) {
      return res.status(400).json({ success: false, error: 'First name and last name are required' });
    }

    const customer = await Customer.create({
      tenantId: req.user.tenantId,
      firstName,
      lastName,
      email,
      phone,
      preferredLanguage,
      address,
      notes,
      tags,
      status,
      source,
    });

    res.status(201).json({ success: true, data: customer });
  } catch (err) {
    next(err);
  }
};

// PUT /api/customers/:id
const updateCustomer = async (req, res, next) => {
  try {
    const allowedFields = [
      'firstName',
      'lastName',
      'email',
      'phone',
      'preferredLanguage',
      'address',
      'notes',
      'tags',
      'status',
      'source',
    ];

    const updates = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    const customer = await Customer.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.user.tenantId },
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!customer) {
      return res.status(404).json({ success: false, error: 'Customer not found' });
    }

    res.json({ success: true, data: customer });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/customers/:id
const deleteCustomer = async (req, res, next) => {
  try {
    const customer = await Customer.findOneAndDelete({
      _id: req.params.id,
      tenantId: req.user.tenantId,
    });

    if (!customer) {
      return res.status(404).json({ success: false, error: 'Customer not found' });
    }

    res.json({ success: true, data: { message: 'Customer deleted' } });
  } catch (err) {
    next(err);
  }
};

module.exports = { listCustomers, getCustomer, createCustomer, updateCustomer, deleteCustomer };
