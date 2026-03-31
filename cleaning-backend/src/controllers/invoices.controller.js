const Invoice = require('../models/Invoice');
const Tenant = require('../models/Tenant');
const Customer = require('../models/Customer');
const Job = require('../models/Job');

const calcTotals = (items = [], discount = 0, taxRate = 0) => {
  const subtotal = items.reduce((sum, item) => sum + (item.quantity || 1) * (item.unitPrice || 0), 0);
  const discounted = Math.max(0, subtotal - discount);
  const tax = parseFloat((discounted * (taxRate / 100)).toFixed(2));
  const total = parseFloat((discounted + tax).toFixed(2));
  return {
    subtotal: parseFloat(subtotal.toFixed(2)),
    tax,
    total,
  };
};

const generateInvoiceNumber = async (tenantId) => {
  const tenant = await Tenant.findById(tenantId).select('slug');
  const slug = tenant ? tenant.slug.toUpperCase() : 'INV';
  const count = await Invoice.countDocuments({ tenantId });
  const seq = String(count + 1).padStart(5, '0');
  return `INV-${slug}-${seq}`;
};

const buildCustomerSnapshot = (customer) => ({
  name: [customer.firstName, customer.lastName].filter(Boolean).join(' '),
  email: customer.email || '',
  address: customer.address || '',
  vatNumber: customer.vatNumber || '',
});

const sanitizeItems = (items = []) =>
  items.map((item) => {
    const qty = Math.max(0, parseFloat(item.quantity) || 1);
    const price = Math.max(0, parseFloat(item.unitPrice) || 0);
    return {
      description: String(item.description || '').slice(0, 500),
      serviceType: String(item.serviceType || '').slice(0, 100),
      quantity: qty,
      unit: String(item.unit || 'hours').slice(0, 20),
      unitPrice: price,
      total: parseFloat((qty * price).toFixed(2)),
    };
  });

// GET /api/invoices
const listInvoices = async (req, res, next) => {
  try {
    const VALID_STATUSES = ['draft', 'sent', 'paid', 'partially_paid', 'overdue', 'void'];
    const MAX_LIMIT = 100;

    const rawStatus = typeof req.query.status === 'string' ? req.query.status : undefined;
    const rawCustomerId = typeof req.query.customerId === 'string' ? req.query.customerId : undefined;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(req.query.limit) || 20));

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
    const { customerId, jobId, items, currency, dueDate, discount, taxRate, notes, servicePeriod, issuedDate } = req.body;

    if (!customerId) {
      return res.status(400).json({ success: false, error: 'customerId is required' });
    }

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

    const sanitizedItems = sanitizeItems(items);
    const safeDiscount = Math.max(0, parseFloat(discount) || 0);
    const safeTaxRate = Math.max(0, parseFloat(taxRate) || 0);
    const { subtotal, tax, total } = calcTotals(sanitizedItems, safeDiscount, safeTaxRate);

    const invoiceNumber = await generateInvoiceNumber(req.user.tenantId);

    const invoice = await Invoice.create({
      tenantId: req.user.tenantId,
      customerId,
      jobId,
      invoiceNumber,
      customerSnapshot: buildCustomerSnapshot(customer),
      issuedDate: issuedDate || new Date(),
      dueDate,
      servicePeriod: servicePeriod || {},
      items: sanitizedItems,
      subtotal,
      discount: safeDiscount,
      taxRate: safeTaxRate,
      tax,
      total,
      currency: currency || 'USD',
      status: 'draft',
      notes: notes ? String(notes).slice(0, 1000) : undefined,
    });

    res.status(201).json({ success: true, data: invoice });
  } catch (err) {
    next(err);
  }
};

// PUT /api/invoices/:id
const updateInvoice = async (req, res, next) => {
  try {
    const VALID_STATUSES = ['draft', 'sent', 'paid', 'partially_paid', 'overdue', 'void'];
    const VALID_METHODS = ['cash', 'card', 'bank_transfer', 'stripe', 'paypal', 'other'];
    const updates = {};

    // Fetch current invoice to use existing discount/taxRate as defaults
    const current = await Invoice.findOne({ _id: req.params.id, tenantId: req.user.tenantId });
    if (!current) {
      return res.status(404).json({ success: false, error: 'Invoice not found' });
    }

    const newDiscount = req.body.discount !== undefined ? Math.max(0, parseFloat(req.body.discount) || 0) : current.discount;
    const newTaxRate = req.body.taxRate !== undefined ? Math.max(0, parseFloat(req.body.taxRate) || 0) : current.taxRate;

    if (req.body.discount !== undefined) updates.discount = newDiscount;
    if (req.body.taxRate !== undefined) updates.taxRate = newTaxRate;

    if (req.body.items !== undefined) {
      const sanitizedItems = sanitizeItems(req.body.items);
      const { subtotal, tax, total } = calcTotals(sanitizedItems, newDiscount, newTaxRate);
      updates.items = sanitizedItems;
      updates.subtotal = subtotal;
      updates.tax = tax;
      updates.total = total;
    } else if (req.body.discount !== undefined || req.body.taxRate !== undefined) {
      // Recalculate with existing items but new discount/taxRate
      const { subtotal, tax, total } = calcTotals(current.items, newDiscount, newTaxRate);
      updates.subtotal = subtotal;
      updates.tax = tax;
      updates.total = total;
    }

    if (req.body.currency) updates.currency = String(req.body.currency).slice(0, 3).toUpperCase();
    if (req.body.status && VALID_STATUSES.includes(req.body.status)) updates.status = req.body.status;
    if (req.body.dueDate) updates.dueDate = req.body.dueDate;
    if (req.body.paidAt) updates.paidAt = req.body.paidAt;
    if (req.body.paymentMethod && VALID_METHODS.includes(req.body.paymentMethod)) updates.paymentMethod = req.body.paymentMethod;
    if (req.body.notes !== undefined) updates.notes = String(req.body.notes).slice(0, 1000);
    if (req.body.servicePeriod) updates.servicePeriod = req.body.servicePeriod;
    if (req.body.issuedDate) updates.issuedDate = req.body.issuedDate;

    const invoice = await Invoice.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.user.tenantId },
      { $set: updates },
      { new: true, runValidators: true }
    );

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

    res.json({ success: true, data: { message: 'Invoice marked as sent', invoice } });
  } catch (err) {
    next(err);
  }
};

module.exports = { listInvoices, getInvoice, createInvoice, updateInvoice, sendInvoice };
