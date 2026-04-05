const Job = require('../models/Job');
const Customer = require('../models/Customer');
const Service = require('../models/Service');
const User = require('../models/User');

const PRICE_HIDDEN_ROLES = ['cleaner', 'worker'];

// GET /api/jobs
const listJobs = async (req, res, next) => {
  try {
    const VALID_STATUSES = ['scheduled', 'confirmed', 'in_progress', 'completed', 'canceled', 'no_show'];
    const MAX_LIMIT      = 100;

    const rawStatus         = typeof req.query.status === 'string' ? req.query.status : undefined;
    const rawCustomerId     = typeof req.query.customerId === 'string' ? req.query.customerId : undefined;
    const rawAssignedUserId = typeof req.query.assignedUserId === 'string' ? req.query.assignedUserId : undefined;
    const rawDateFrom       = typeof req.query.dateFrom === 'string' ? req.query.dateFrom : undefined;
    const rawDateTo         = typeof req.query.dateTo === 'string' ? req.query.dateTo : undefined;
    const page              = Math.max(1, parseInt(req.query.page) || 1);
    const limit             = Math.min(MAX_LIMIT, Math.max(1, parseInt(req.query.limit) || 20));

    const filter = { tenantId: req.user.tenantId };
    if (rawStatus && VALID_STATUSES.includes(rawStatus)) filter.status = rawStatus;
    if (rawCustomerId) filter.customerId = String(rawCustomerId);
    if (rawAssignedUserId) filter.assignedUsers = String(rawAssignedUserId);

    if (rawDateFrom || rawDateTo) {
      filter.scheduledStart = {};
      if (rawDateFrom) filter.scheduledStart.$gte = new Date(rawDateFrom);
      if (rawDateTo)   filter.scheduledStart.$lte = new Date(rawDateTo);
    }

    // Cleaners only see their own jobs
    if (PRICE_HIDDEN_ROLES.includes(req.user.role)) {
      filter.assignedUsers = req.user.id;
    }

    const skip = (page - 1) * limit;

    const isCleaner = PRICE_HIDDEN_ROLES.includes(req.user.role);

    const [jobs, total] = await Promise.all([
      Job.find(filter)
        .populate('customerId', 'firstName lastName email phone')
        .populate('serviceId', isCleaner ? 'name' : 'name basePrice')
        .populate('assignedUsers', 'firstName lastName email')
        .sort({ scheduledStart: 1 })
        .skip(skip)
        .limit(limit),
      Job.countDocuments(filter),
    ]);

    const data = isCleaner
      ? jobs.map(j => { const o = j.toObject(); delete o.price; return o; })
      : jobs;

    res.json({
      success: true,
      data,
      pagination: { total, page, limit },
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/jobs/:id
const getJob = async (req, res, next) => {
  try {
    const isCleaner = PRICE_HIDDEN_ROLES.includes(req.user.role);

    const job = await Job.findOne({ _id: req.params.id, tenantId: req.user.tenantId })
      .populate('customerId', 'firstName lastName email phone address')
      .populate('serviceId', isCleaner ? 'name description durationMinutes' : 'name description basePrice durationMinutes')
      .populate('assignedUsers', 'firstName lastName email phone')
      .populate('invoiceId', 'invoiceNumber status total');

    if (!job) {
      return res.status(404).json({ success: false, error: 'Job not found' });
    }

    if (isCleaner) {
      const data = job.toObject();
      delete data.price;
      return res.json({ success: true, data });
    }

    res.json({ success: true, data: job });
  } catch (err) {
    next(err);
  }
};

// POST /api/jobs
const createJob = async (req, res, next) => {
  try {
    const {
      customerId,
      serviceId,
      title,
      propertyAddress,
      scheduledStart,
      scheduledEnd,
      status,
      assignedUsers,
      checklist,
      notesInternal,
      notesCustomer,
      recurringRuleId,
      price,
    } = req.body;

    if (!customerId || !scheduledStart) {
      return res.status(400).json({
        success: false,
        error: 'customerId and scheduledStart are required',
      });
    }

    // Verify referenced entities belong to this tenant (MED-1: cross-tenant protection)
    const customer = await Customer.findOne({ _id: customerId, tenantId: req.user.tenantId });
    if (!customer) {
      return res.status(400).json({ success: false, error: 'Invalid customerId' });
    }
    if (serviceId) {
      const service = await Service.findOne({ _id: serviceId, tenantId: req.user.tenantId });
      if (!service) {
        return res.status(400).json({ success: false, error: 'Invalid serviceId' });
      }
    }
    if (assignedUsers && assignedUsers.length > 0) {
      const userCount = await User.countDocuments({ _id: { $in: assignedUsers }, tenantId: req.user.tenantId });
      if (userCount !== assignedUsers.length) {
        return res.status(400).json({ success: false, error: 'One or more assignedUsers are invalid' });
      }
    }

    const job = await Job.create({
      tenantId: req.user.tenantId,
      customerId,
      serviceId,
      title,
      propertyAddress,
      scheduledStart,
      scheduledEnd,
      status,
      assignedUsers,
      checklist,
      notesInternal,
      notesCustomer,
      recurringRuleId,
      price,
    });

    res.status(201).json({ success: true, data: job });
  } catch (err) {
    next(err);
  }
};

// PUT /api/jobs/:id
const updateJob = async (req, res, next) => {
  try {
    const allowedFields = [
      'customerId',
      'serviceId',
      'title',
      'propertyAddress',
      'scheduledStart',
      'scheduledEnd',
      'status',
      'assignedUsers',
      'checklist',
      'notesInternal',
      'notesCustomer',
      'recurringRuleId',
      'price',
      'invoiceId',
    ];

    const updates = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    const job = await Job.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.user.tenantId },
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!job) {
      return res.status(404).json({ success: false, error: 'Job not found' });
    }

    res.json({ success: true, data: job });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/jobs/:id/status
const updateJobStatus = async (req, res, next) => {
  try {
    const { status } = req.body;

    const allStatuses     = ['scheduled', 'confirmed', 'in_progress', 'completed', 'canceled', 'no_show'];
    const cleanerStatuses = ['in_progress', 'completed', 'no_show']; // cleaners cannot cancel or reschedule

    if (!status || !allStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Invalid status. Must be one of: ${allStatuses.join(', ')}`,
      });
    }

    // Cleaners: only allowed statuses + must be assigned to the job
    if (PRICE_HIDDEN_ROLES.includes(req.user.role)) {
      if (!cleanerStatuses.includes(status)) {
        return res.status(403).json({
          success: false,
          error: `Cleaners can only set status to: ${cleanerStatuses.join(', ')}`,
        });
      }

      const job = await Job.findOne({ _id: req.params.id, tenantId: req.user.tenantId });
      if (!job) {
        return res.status(404).json({ success: false, error: 'Job not found' });
      }

      const isAssigned = job.assignedUsers.some((uid) => uid.toString() === req.user.id);
      if (!isAssigned) {
        return res.status(403).json({ success: false, error: 'You are not assigned to this job' });
      }

      job.status = status;
      await job.save();
      return res.json({ success: true, data: job });
    }

    const job = await Job.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.user.tenantId },
      { $set: { status } },
      { new: true }
    );

    if (!job) {
      return res.status(404).json({ success: false, error: 'Job not found' });
    }

    res.json({ success: true, data: job });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/jobs/:id
const deleteJob = async (req, res, next) => {
  try {
    const job = await Job.findOneAndDelete({
      _id: req.params.id,
      tenantId: req.user.tenantId,
    });

    if (!job) {
      return res.status(404).json({ success: false, error: 'Job not found' });
    }

    res.json({ success: true, data: { message: 'Job deleted' } });
  } catch (err) {
    next(err);
  }
};

module.exports = { listJobs, getJob, createJob, updateJob, updateJobStatus, deleteJob };
