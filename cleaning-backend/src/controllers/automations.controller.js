const AutomationRule = require('../models/AutomationRule');

// GET /api/automations
const listAutomations = async (req, res, next) => {
  try {
    const { isActive } = req.query;
    const filter = { tenantId: req.user.tenantId };
    if (isActive !== undefined) filter.isActive = isActive === 'true';

    const rules = await AutomationRule.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, data: rules });
  } catch (err) {
    next(err);
  }
};

// POST /api/automations
const createAutomation = async (req, res, next) => {
  try {
    const { name, trigger, channel, templateKey, isActive } = req.body;

    if (!trigger) {
      return res.status(400).json({ success: false, error: 'trigger is required' });
    }

    const rule = await AutomationRule.create({
      tenantId: req.user.tenantId,
      name,
      trigger,
      channel,
      templateKey,
      isActive,
    });

    res.status(201).json({ success: true, data: rule });
  } catch (err) {
    next(err);
  }
};

// PUT /api/automations/:id
const updateAutomation = async (req, res, next) => {
  try {
    const allowedFields = ['name', 'trigger', 'channel', 'templateKey', 'isActive'];
    const updates = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    const rule = await AutomationRule.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.user.tenantId },
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!rule) {
      return res.status(404).json({ success: false, error: 'Automation rule not found' });
    }

    res.json({ success: true, data: rule });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/automations/:id
const deleteAutomation = async (req, res, next) => {
  try {
    const rule = await AutomationRule.findOneAndDelete({
      _id: req.params.id,
      tenantId: req.user.tenantId,
    });

    if (!rule) {
      return res.status(404).json({ success: false, error: 'Automation rule not found' });
    }

    res.json({ success: true, data: { message: 'Automation rule deleted' } });
  } catch (err) {
    next(err);
  }
};

module.exports = { listAutomations, createAutomation, updateAutomation, deleteAutomation };
