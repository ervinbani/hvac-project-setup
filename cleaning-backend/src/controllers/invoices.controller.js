const Invoice = require("../models/Invoice");
const Tenant = require("../models/Tenant");
const Customer = require("../models/Customer");
const Job = require("../models/Job");

const generateInvoiceNumber = async (tenantId) => {
  const tenant = await Tenant.findById(tenantId).select("slug");
  const slug = tenant ? tenant.slug.toUpperCase() : "INV";
  const count = await Invoice.countDocuments({ tenantId });
  const seq = String(count + 1).padStart(5, "0");
  return `INV-${slug}-${seq}`;
};

const buildCustomerSnapshot = (customer) => ({
  name: [customer.firstName, customer.lastName].filter(Boolean).join(" "),
  email: customer.email || "",
  address: customer.address || "",
  vatNumber: customer.vatNumber || "",
});

const VALID_PRICE_UNITS = ["per_hour", "per_job", "per_day", "no_price"];

const sanitizeItems = (items = []) =>
  items.map((item) => {
    const isNoPrice = item.priceUnit === "no_price";
    const qty = isNoPrice ? 0 : Math.max(0, parseFloat(item.quantity) || 1);
    const price = isNoPrice ? 0 : Math.max(0, parseFloat(item.unitPrice) || 0);
    const sanitized = {
      description: String(item.description || "").slice(0, 500),
      serviceType: String(item.serviceType || "").slice(0, 100),
      quantity: qty,
      unit: isNoPrice ? "no_price" : String(item.unit || "hours").slice(0, 20),
      unitPrice: price,
      total: isNoPrice ? 0 : parseFloat((qty * price).toFixed(2)),
    };
    if (item.priceUnit && VALID_PRICE_UNITS.includes(item.priceUnit)) {
      sanitized.priceUnit = item.priceUnit;
    }
    return sanitized;
  });

// GET /api/invoices
const listInvoices = async (req, res, next) => {
  try {
    const VALID_STATUSES = [
      "draft",
      "sent",
      "paid",
      "partially_paid",
      "overdue",
      "void",
    ];
    const MAX_LIMIT = 100;

    const rawStatus =
      typeof req.query.status === "string" ? req.query.status : undefined;
    const rawCustomerId =
      typeof req.query.customerId === "string"
        ? req.query.customerId
        : undefined;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(
      MAX_LIMIT,
      Math.max(1, parseInt(req.query.limit) || 20),
    );

    const filter = { tenantId: req.user.tenantId };
    if (rawStatus && VALID_STATUSES.includes(rawStatus))
      filter.status = rawStatus;
    if (rawCustomerId) filter.customerId = String(rawCustomerId);

    const skip = (page - 1) * limit;

    const [invoices, total] = await Promise.all([
      Invoice.find(filter)
        .populate("customerId", "firstName lastName email")
        .populate("jobId", "title scheduledStart")
        .populate("jobIds", "title scheduledStart price priceUnit timeDuration")
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
      .populate("customerId", "firstName lastName email phone address")
      .populate("jobId", "title scheduledStart propertyAddress")
      .populate("jobIds", "title scheduledStart price priceUnit timeDuration");

    if (!invoice) {
      return res
        .status(404)
        .json({ success: false, error: "Invoice not found" });
    }

    res.json({ success: true, data: invoice });
  } catch (err) {
    next(err);
  }
};

// POST /api/invoices
const createInvoice = async (req, res, next) => {
  try {
    const {
      customerId,
      jobId,
      jobIds,
      items,
      currency,
      dueDate,
      discount,
      taxRate,
      notes,
      servicePeriod,
      issuedDate,
    } = req.body;

    if (!customerId) {
      return res
        .status(400)
        .json({ success: false, error: "customerId is required" });
    }

    const customer = await Customer.findOne({
      _id: customerId,
      tenantId: req.user.tenantId,
    });
    if (!customer) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid customerId" });
    }
    if (jobId) {
      const job = await Job.findOne({
        _id: jobId,
        tenantId: req.user.tenantId,
      });
      if (!job) {
        return res.status(400).json({ success: false, error: "Invalid jobId" });
      }
    }
    if (jobIds && jobIds.length > 0) {
      const jobCount = await Job.countDocuments({
        _id: { $in: jobIds },
        tenantId: req.user.tenantId,
      });
      if (jobCount !== jobIds.length) {
        return res
          .status(400)
          .json({ success: false, error: "One or more jobIds are invalid" });
      }
    }

    const sanitizedItems = sanitizeItems(items);
    const safeTaxRate = Math.max(0, parseFloat(taxRate) || 0);
    const safeSubtotal = parseFloat(req.body.subtotal) || 0;
    const safeTax = parseFloat(req.body.tax) || 0;
    const safeTotal = parseFloat(req.body.total) || 0;

    const invoiceNumber = await generateInvoiceNumber(req.user.tenantId);

    const invoice = await Invoice.create({
      tenantId: req.user.tenantId,
      customerId,
      jobId,
      jobIds: jobIds || [],
      invoiceNumber,
      customerSnapshot: buildCustomerSnapshot(customer),
      issuedDate: issuedDate || new Date(),
      dueDate,
      servicePeriod: servicePeriod || {},
      items: sanitizedItems,
      subtotal: safeSubtotal,
      discount: discount || { type: "fixed", value: 0, amount: 0 },
      taxRate: safeTaxRate,
      tax: safeTax,
      total: safeTotal,
      currency: currency || "USD",
      status: "draft",
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
    const VALID_STATUSES = [
      "draft",
      "sent",
      "paid",
      "partially_paid",
      "overdue",
      "void",
    ];
    const VALID_METHODS = [
      "cash",
      "card",
      "bank_transfer",
      "stripe",
      "paypal",
      "other",
    ];
    const updates = {};

    // Fetch current invoice to use existing discount/taxRate as defaults
    const current = await Invoice.findOne({
      _id: req.params.id,
      tenantId: req.user.tenantId,
    });
    if (!current) {
      return res
        .status(404)
        .json({ success: false, error: "Invoice not found" });
    }

    if (req.body.discount !== undefined) updates.discount = req.body.discount;
    if (req.body.taxRate !== undefined)
      updates.taxRate = Math.max(0, parseFloat(req.body.taxRate) || 0);
    if (req.body.subtotal !== undefined)
      updates.subtotal = parseFloat(req.body.subtotal) || 0;
    if (req.body.tax !== undefined)
      updates.tax = parseFloat(req.body.tax) || 0;
    if (req.body.total !== undefined)
      updates.total = parseFloat(req.body.total) || 0;

    if (req.body.items !== undefined) {
      updates.items = sanitizeItems(req.body.items);
    }

    if (req.body.currency)
      updates.currency = String(req.body.currency).slice(0, 3).toUpperCase();
    if (req.body.status && VALID_STATUSES.includes(req.body.status))
      updates.status = req.body.status;
    if (req.body.dueDate) updates.dueDate = req.body.dueDate;
    if (req.body.paidAt) updates.paidAt = req.body.paidAt;
    if (
      req.body.paymentMethod &&
      VALID_METHODS.includes(req.body.paymentMethod)
    )
      updates.paymentMethod = req.body.paymentMethod;
    if (req.body.notes !== undefined)
      updates.notes = String(req.body.notes).slice(0, 1000);
    if (req.body.servicePeriod) updates.servicePeriod = req.body.servicePeriod;
    if (req.body.issuedDate) updates.issuedDate = req.body.issuedDate;
    if (req.body.jobIds !== undefined) updates.jobIds = req.body.jobIds;

    const invoice = await Invoice.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.user.tenantId },
      { $set: updates },
      { new: true, runValidators: true },
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
      { $set: { status: "sent" } },
      { new: true },
    );

    if (!invoice) {
      return res
        .status(404)
        .json({ success: false, error: "Invoice not found" });
    }

    res.json({
      success: true,
      data: { message: "Invoice marked as sent", invoice },
    });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/invoices/:id
const deleteInvoice = async (req, res, next) => {
  try {
    const invoice = await Invoice.findOneAndDelete({
      _id: req.params.id,
      tenantId: req.user.tenantId,
    });

    if (!invoice) {
      return res
        .status(404)
        .json({ success: false, error: "Invoice not found" });
    }

    res.json({ success: true, data: { message: "Invoice deleted" } });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  listInvoices,
  getInvoice,
  createInvoice,
  updateInvoice,
  sendInvoice,
  deleteInvoice,
};
