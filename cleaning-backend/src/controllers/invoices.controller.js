const Invoice = require('../models/Invoice');
const Tenant = require('../models/Tenant');
const Customer = require('../models/Customer');
const Job = require('../models/Job');

const TAX_RATE = 0.07; // 7% — move to tenant settings in future

const calcTotals = (items = []) => {
  const subtotal = items.reduce((sum, item) => sum + (item.quantity || 1) * (item.unitPrice || 0), 0);
  const tax      = parseFloat((subtotal * TAX_RATE).toFixed(2));
  const total    = parseFloat((subtotal + tax).toFixed(2));
  return { subtotal: parseFloat(subtotal.toFixed(2)), tax, total };
};

const generateInvoiceNumber = async (tenantId) => {
  const tenant = await Tenant.findById(tenantId).select('slug');
  const slug = tenant ? tenant.slug.toUpperCase() : 'INV';
  const count = await Invoice.countDocuments({ tenantId });
  const seq = String(count + 1).padStart(5, '0');
  return `INV-${slug}-${seq}`;
};

// GET /api/invoices
const listInvoices = async (req, res, next) => {
  try {
    const VALID_STATUSES = ['draft', 'sent', 'paid', 'overdue', 'void'];
    const MAX_LIMIT      = 100;

    const rawStatus     = typeof req.query.status === 'string' ? req.query.status : undefined;
    const rawCustomerId = typeof req.query.customerId === 'string' ? req.query.customerId : undefined;
    const page          = Math.max(1, parseInt(req.query.page) || 1);
    const limit         = Math.min(MAX_LIMIT, Math.max(1, parseInt(req.query.limit) || 20));

    const filter = { tenantId: req.user.tenantId };
    if (rawStatus && VALID_STATUSES.includes(rawStatus)) filter.status = rawStatus;
    if (rawCustomerId) filter.customerId = String(rawCustomerId);

    const skip = (page - 1) * limit;

    const [invoices, total] = await Promise.all([
      Invoice.find(filter)
        .populate('customerId', 'firstName lastName email')
        .populate('jobId', 'title scheduledStart')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Invoice.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: invoices,
      pagination: { total, page, limit },
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/invoices/:id
const getInvoice = async (req, res, next) => {
  try {
    const invoice = await Invoice.findOne({
      _id: req.params.id,
      tenantId: req.user.tenantId,
    })
      .populate('customerId', 'firstName lastName email phone address')
      .populate('jobId', 'title scheduledStart propertyAddress');

    if (!invoice) {
      return res.status(404).json({ success: false, error: 'Invoice not found' });
    }

    res.json({ success: true, data: invoice });
  } catch (err) {
    next(err);
  }
};

// POST /api/invoices
const createInvoice = async (req, res, next) => {
  try {
    const { customerId, jobId, items, currency, dueDate } = req.body;

    if (!customerId) {
      return res.status(400).json({ success: false, error: 'customerId is required' });
    }

    // MED-1: verify cross-tenant references
    const customer = await Customer.findOne({ _id: customerId, tenantId: req.user.tenantId });
    if (!customer) {
      return res.status(400).json({ success: false, error: 'Invalid customerId' });
    }
    if (jobId) {
      const job = await Job.findOne({ _id: jobId, tenantId: req.user.tenantId });
      if (!job) {
        return res.status(400).json({ success: false, error: 'Invalid jobId' });
      }
    }

    // MED-2: always calculate totals server-side
    const sanitizedItems = (items || []).map((item) => ({
      description: String(item.description || '').slice(0, 500),
      quantity:    Math.max(0, parseFloat(item.quantity) || 1),
      unitPrice:   Math.max(0, parseFloat(item.unitPrice) || 0),
      total:       parseFloat((Math.max(0, parseFloat(item.quantity) || 1) * Math.max(0, parseFloat(item.unitPrice) || 0)).toFixed(2)),
    }));
    const { subtotal, tax, total } = calcTotals(sanitizedItems);

    const invoiceNumber = await generateInvoiceNumber(req.user.tenantId);

    const invoice = await Invoice.create({
      tenantId: req.user.tenantId,
      customerId,
      jobId,
      invoiceNumber,
      items: sanitizedItems,
      subtotal,
      tax,
      total,
      currency: currency || 'USD',
      status: 'draft',
      dueDate,
    });

    res.status(201).json({ success: true, data: invoice });
  } catch (err) {
    next(err);
  }
};

// PUT /api/invoices/:id
const updateInvoice = async (req, res, next) => {
  try {
    const VALID_STATUSES  = ['draft', 'sent', 'paid', 'overdue', 'void'];
    const VALID_METHODS   = ['cash', 'card', 'bank_transfer', 'stripe', 'other'];
    const updates = {};

    if (req.body.items !== undefined) {
      const sanitizedItems = (req.body.items || []).map((item) => ({
        description: String(item.description || '').slice(0, 500),
        quantity:    Math.max(0, parseFloat(item.quantity) || 1),
        unitPrice:   Math.max(0, parseFloat(item.unitPrice) || 0),
        total:       parseFloat((Math.max(0, parseFloat(item.quantity) || 1) * Math.max(0, parseFloat(item.unitPrice) || 0)).toFixed(2)),
      }));
      const { subtotal, tax, total } = calcTotals(sanitizedItems);
      updates.items    = sanitizedItems;
      updates.subtotal = subtotal;
      updates.tax      = tax;
      updates.total    = total;
    }
    if (req.body.currency)       updates.currency      = String(req.body.currency).slice(0, 3).toUpperCase();
    if (req.body.status && VALID_STATUSES.includes(req.body.status)) updates.status = req.body.status;
    if (req.body.dueDate)        updates.dueDate       = req.body.dueDate;
    if (req.body.paidAt)         updates.paidAt        = req.body.paidAt;
    if (req.body.paymentMethod && VALID_METHODS.includes(req.body.paymentMethod)) updates.paymentMethod = req.body.paymentMethod;

    const invoice = await Invoice.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.user.tenantId },
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!invoice) {
      return res.status(404).json({ success: false, error: 'Invoice not found' });
    }

    res.json({ success: true, data: invoice });
  } catch (err) {
    next(err);
  }
};

// POST /api/invoices/:id/send
const sendInvoice = async (req, res, next) => {
  try {
    const invoice = await Invoice.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.user.tenantId },
      { $set: { status: 'sent' } },
      { new: true }
    );

    if (!invoice) {
      return res.status(404).json({ success: false, error: 'Invoice not found' });
    }

    // Future: trigger email/SMS notification here

    res.json({ success: true, data: { message: 'Invoice marked as sent', invoice } });
  } catch (err) {
    next(err);
  }
};

module.exports = { listInvoices, getInvoice, createInvoice, updateInvoice, sendInvoice };
