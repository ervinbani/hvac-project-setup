const RecurringRule = require('../models/RecurringRule');

// GET /api/recurring
const listRecurringRules = async (req, res, next) => {
  try {
    const { customerId, isActive } = req.query;
    const filter = { tenantId: req.user.tenantId };
    if (customerId) filter.customerId = customerId;
    if (isActive !== undefined) filter.isActive = isActive === 'true';

    const rules = await RecurringRule.find(filter)
      .populate('customerId', 'firstName lastName email')
      .populate('serviceId', 'name basePrice')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: rules });
  } catch (err) {
    next(err);
  }
};

// POST /api/recurring
const createRecurringRule = async (req, res, next) => {
  try {
    const {
      customerId,
      serviceId,
      frequency,
      dayOfWeek,
      dayOfMonth,
      startDate,
      endDate,
      isActive,
    } = req.body;

    if (!customerId || !frequency) {
      return res.status(400).json({ success: false, error: 'customerId and frequency are required' });
    }

    const rule = await RecurringRule.create({
      tenantId: req.user.tenantId,
      customerId,
      serviceId,
      frequency,
      dayOfWeek,
      dayOfMonth,
      startDate,
      endDate,
      isActive,
    });

    res.status(201).json({ success: true, data: rule });
  } catch (err) {
    next(err);
  }
};

// PUT /api/recurring/:id
const updateRecurringRule = async (req, res, next) => {
  try {
    const allowedFields = [
      'serviceId',
      'frequency',
      'dayOfWeek',
      'dayOfMonth',
      'startDate',
      'endDate',
      'isActive',
    ];

    const updates = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    const rule = await RecurringRule.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.user.tenantId },
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!rule) {
      return res.status(404).json({ success: false, error: 'Recurring rule not found' });
    }

    res.json({ success: true, data: rule });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/recurring/:id
const deleteRecurringRule = async (req, res, next) => {
  try {
    const rule = await RecurringRule.findOneAndDelete({
      _id: req.params.id,
      tenantId: req.user.tenantId,
    });

    if (!rule) {
      return res.status(404).json({ success: false, error: 'Recurring rule not found' });
    }

    res.json({ success: true, data: { message: 'Recurring rule deleted' } });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  listRecurringRules,
  createRecurringRule,
  updateRecurringRule,
  deleteRecurringRule,
};
