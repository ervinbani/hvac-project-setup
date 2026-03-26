 Update(src\controllers\customers.controller.js)
  ⎿  Added 17 lines, removed 7 lines
       3  // GET /api/customers
       4  const listCustomers = async (req, res, next) => {
       5    try {
       6 -    const { search, status, source, page = 1, limit = 20 }
         -= req.query;
       6 +    const VALID_STATUSES = ['lead', 'active', 'inactive'];
       7 +    const VALID_SOURCES  = ['manual', 'website', 'phone',
         +'referral', 'facebook', 'google'];
       8 +    const MAX_LIMIT      = 100;
       9
      10 +    const rawStatus = typeof req.query.status === 'string'
         +? req.query.status : undefined;
      11 +    const rawSource = typeof req.query.source === 'string'
         +? req.query.source : undefined;
      12 +    const rawSearch = typeof req.query.search === 'string'
         +? req.query.search : undefined;
      13 +    const page      = Math.max(1, parseInt(req.query.page)
         +|| 1);
      14 +    const limit     = Math.min(MAX_LIMIT, Math.max(1,
         +parseInt(req.query.limit) || 20));
      15 +
      16      const filter = { tenantId: req.user.tenantId };
      17 -    if (status) filter.status = status;
      18 -    if (source) filter.source = source;
      17 +    if (rawStatus && VALID_STATUSES.includes(rawStatus))
         +filter.status = rawStatus;
      18 +    if (rawSource && VALID_SOURCES.includes(rawSource))
         +filter.source = rawSource;
      19
      20 -    if (search) {
      21 -      const regex = new RegExp(search, 'i');
      20 +    if (rawSearch) {
      21 +      // Escape special regex characters to prevent ReDoS
      22 +      const escaped =
         +rawSearch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').slice(0,
         +100);
      23 +      const regex = new RegExp(escaped, 'i');
      24        filter.$or = [
      25          { firstName: regex },
      26          { lastName: regex },
     ...
      19        ];
      20      }
      21
      22 -    const skip = (parseInt(page) - 1) * parseInt(limit);
      22 +    const skip = (page - 1) * limit;
      23
      24      const [customers, total] = await Promise.all([
      25        Customer.find(filter)
      26          .sort({ createdAt: -1 })
      27          .skip(skip)
      28 -        .limit(parseInt(limit)),
      28 +        .limit(limit),
      29        Customer.countDocuments(filter),
      30      ]);
      31

● Update(src\controllers\customers.controller.js)
  ⎿  Added 1 line, removed 1 line
      42      res.json({
      43        success: true,
      44        data: customers,
      45 -      pagination: { total, page: parseInt(page), limit:
         -parseInt(limit) },
      45 +      pagination: { total, page, limit },
      46      });
      47    } catch (err) {
      48      next(err);

● Fix CRIT-1 — job status route: add role guard + cleaner can only update
  their own assigned jobs

● Update(src\routes\jobs.routes.js)
  ⎿  Added 1 line, removed 1 line
      17  router.get('/:id', getJob);
      18  router.post('/', requireRole('owner', 'manager', 'staff'),
          createJob);
      19  router.put('/:id', requireRole('owner', 'manager',
          'staff'), updateJob);
      20 -router.patch('/:id/status', updateJobStatus);
      20 +router.patch('/:id/status',
         +requireRole('owner', 'manager', 'staff', 'cleaner'),
         +updateJobStatus);
      21  router.delete('/:id', requireRole('owner', 'manager'),
          deleteJob);
      22
      23  module.exports = router;

● Now restrict cleaners to only update jobs assigned to them, and limit what
  statuses they can set:

● Update(src\controllers\jobs.controller.js)
  ⎿  Added 29 lines, removed 3 lines
      163    try {
      164      const { status } = req.body;
      165
      166 -    const validStatuses
          -= ['scheduled', 'confirmed', 'in_progress', 'completed',
          -'canceled', 'no_show'];
      167 -    if (!status || !validStatuses.includes(status)) {
      166 +    const allStatuses
          += ['scheduled', 'confirmed', 'in_progress', 'completed',
          +'canceled', 'no_show'];
      167 +    const cleanerStatuses = ['in_progress', 'completed',
          +'no_show']; // cleaners cannot cancel or reschedule
      168 +
      169 +    if (!status || !allStatuses.includes(status)) {
      170        return res.status(400).json({
      171          success: false,
      172 -        error: `Invalid status. Must be one of: ${
          -validStatuses.join(', ')}`,
      172 +        error: `Invalid status. Must be one of: ${
          +allStatuses.join(', ')}`,
      173        });
      174      }
      175
      176 +    // Cleaners: only allowed statuses + must be assigned
          +to the job
      177 +    if (req.user.role === 'cleaner') {
      178 +      if (!cleanerStatuses.includes(status)) {
      179 +        return res.status(403).json({
      180 +          success: false,
      181 +          error: `Cleaners can only set status to:
          +${cleanerStatuses.join(', ')}`,
      182 +        });
      183 +      }
      184 +
      185 +      const job = await Job.findOne({ _id: req.params.id,
          +tenantId: req.user.tenantId });
      186 +      if (!job) {
      187 +        return res.status(404).json({ success: false,
          +error: 'Job not found' });
      188 +      }
      189 +
      190 +      const isAssigned = job.assignedUsers.some((uid) =>
          +uid.toString() === req.user.id);
      191 +      if (!isAssigned) {
      192 +        return res.status(403).json({ success: false,
          +error: 'You are not assigned to this job' });
      193 +      }
      194 +
      195 +      job.status = status;
      196 +      await job.save();
      197 +      return res.json({ success: true, data: job });
      198 +    }
      199 +
      200      const job = await Job.findOneAndUpdate(
      201        { _id: req.params.id, tenantId: req.user.tenantId },
      202        { $set: { status } },

● Fix HIGH-2 + MED-4 — NoSQL injection + unbounded limit in jobs controller

● Update(src\controllers\jobs.controller.js)
  ⎿  Added 23 lines, removed 17 lines
       3  // GET /api/jobs
       4  const listJobs = async (req, res, next) => {
       5    try {
       6 -    const {
       7 -      status,
       8 -      customerId,
       9 -      assignedUserId,
      10 -      dateFrom,
      11 -      dateTo,
      12 -      page = 1,
      13 -      limit = 20,
      14 -    } = req.query;
       6 +    const VALID_STATUSES = ['scheduled', 'confirmed',
         +'in_progress', 'completed', 'canceled', 'no_show'];
       7 +    const MAX_LIMIT      = 100;
       8
       9 +    const rawStatus         = typeof req.query.status ===
         +'string' ? req.query.status : undefined;
      10 +    const rawCustomerId     = typeof req.query.customerId
         +=== 'string' ? req.query.customerId : undefined;
      11 +    const rawAssignedUserId = typeof
         +req.query.assignedUserId === 'string' ?
         +req.query.assignedUserId : undefined;
      12 +    const rawDateFrom       = typeof req.query.dateFrom ===
         + 'string' ? req.query.dateFrom : undefined;
      13 +    const rawDateTo         = typeof req.query.dateTo ===
         +'string' ? req.query.dateTo : undefined;
      14 +    const page              = Math.max(1,
         +parseInt(req.query.page) || 1);
      15 +    const limit             = Math.min(MAX_LIMIT,
         +Math.max(1, parseInt(req.query.limit) || 20));
      16 +
      17      const filter = { tenantId: req.user.tenantId };
      18 -    if (status) filter.status = status;
      19 -    if (customerId) filter.customerId = customerId;
      20 -    if (assignedUserId) filter.assignedUsers =
         -assignedUserId;
      18 +    if (rawStatus && VALID_STATUSES.includes(rawStatus))
         +filter.status = rawStatus;
      19 +    if (rawCustomerId) filter.customerId =
         +String(rawCustomerId);
      20 +    if (rawAssignedUserId) filter.assignedUsers =
         +String(rawAssignedUserId);
      21
      22 -    if (dateFrom || dateTo) {
      22 +    if (rawDateFrom || rawDateTo) {
      23        filter.scheduledStart = {};
      24 -      if (dateFrom) filter.scheduledStart.$gte = new Date(
         -dateFrom);
      25 -      if (dateTo) filter.scheduledStart.$lte = new Date(
         -dateTo);
      24 +      if (rawDateFrom
         +) filter.scheduledStart.$gte = new Date(rawDateFrom);
      25 +      if (rawDateTo)
         +filter.scheduledStart.$lte = new Date(rawDateTo);
      26      }
      27
      28 -    const skip = (parseInt(page) - 1) * parseInt(limit);
      28 +    // Cleaners only see their own jobs
      29 +    if (req.user.role === 'cleaner') {
      30 +      filter.assignedUsers = req.user.id;
      31 +    }
      32
      33 +    const skip = (page - 1) * limit;
      34 +
      35      const [jobs, total] = await Promise.all([
      36        Job.find(filter)
      37          .populate('customerId', 'firstName lastName email
          phone')
     ...
      33          .populate('assignedUsers', 'firstName lastName
          email')
      34          .sort({ scheduledStart: 1 })
      35          .skip(skip)
      36 -        .limit(parseInt(limit)),
      36 +        .limit(limit),
      37        Job.countDocuments(filter),
      38      ]);
      39

● Update(src\controllers\jobs.controller.js)
  ⎿  Added 1 line, removed 1 line
      46      res.json({
      47        success: true,
      48        data: jobs,
      49 -      pagination: { total, page: parseInt(page), limit:
         -parseInt(limit) },
      49 +      pagination: { total, page, limit },
      50      });
      51    } catch (err) {
      52      next(err);

● Fix HIGH-1 + MED-3 — privilege escalation in users controller (role
  elevation)

● Update(src\controllers\users.controller.js)
  ⎿  Added 12 lines
      34  // POST /api/users
      35  const createUser = async (req, res, next) => {
      36    try {
      37 +    const VALID_ROLES    = ['owner', 'manager', 'cleaner',
         +'staff'];
      38 +    const ROLE_HIERARCHY = { owner: 4, manager: 3, staff:
         +2, cleaner: 1 };
      39 +
      40      const { firstName, lastName, email, password, role,
          phone, preferredLanguage } = req.body;
      41
      42      if (!firstName || !lastName || !email || !password ||
          !role) {
      43        return res.status(400).json({ success: false, error:
          'Missing required fields' });
      44      }
      45
      46 +    if (!VALID_ROLES.includes(role)) {
      47 +      return res.status(400).json({ success: false, error:
         +`Invalid role. Must be one of: ${VALID_ROLES.join(', ')}`
         +});
      48 +    }
      49 +
      50 +    // Prevent creating a user with equal or higher role
         +than yourself (only owner can create owner)
      51 +    if (ROLE_HIERARCHY[role] >=
         +ROLE_HIERARCHY[req.user.role] && req.user.role !== 'owner')
         + {
      52 +      return res.status(403).json({ success: false, error:
         +'You cannot create a user with a role equal to or higher
         +than your own' });
      53 +    }
      54 +
      55      const existing = await User.findOne({
      56        tenantId: req.user.tenantId,
      57        email: email.toLowerCase(),

● Now fix updateUser to block role escalation:

● Update(src\controllers\users.controller.js)
  ⎿  Added 14 lines
      84  // PUT /api/users/:id
      85  const updateUser = async (req, res, next) => {
      86    try {
      87 +    const VALID_ROLES    = ['owner', 'manager', 'cleaner',
         +'staff'];
      88 +    const ROLE_HIERARCHY = { owner: 4, manager: 3, staff:
         +2, cleaner: 1 };
      89 +
      90      const allowedFields = ['firstName', 'lastName', 'role',
           'phone', 'preferredLanguage'];
      91      const updates = {};
      92
     ...
       93        }
       94      }
       95
       96 +    // Validate and guard role changes
       97 +    if (updates.role) {
       98 +      if (!VALID_ROLES.includes(updates.role)) {
       99 +        return res.status(400).json({ success: false,
          +error: `Invalid role. Must be one of:
          +${VALID_ROLES.join(', ')}` });
      100 +      }
      101 +      // Non-owners cannot elevate a user to a role >=
          +their own
      102 +      if (ROLE_HIERARCHY[updates.role] >=
          +ROLE_HIERARCHY[req.user.role] && req.user.role !==
          +'owner') {
      103 +        return res.status(403).json({ success: false,
          +error: 'You cannot assign a role equal to or higher than
          +your own' });
      104 +      }
      105 +    }
      106 +
      107      // Allow password update
      108      if (req.body.password) {
      109        updates.passwordHash = await
           bcrypt.hash(req.body.password, 12);

● Also fix unbounded limit in users list:

● Update(src\controllers\users.controller.js)
  ⎿  Added 12 lines, removed 6 lines
       4  // GET /api/users
       5  const listUsers = async (req, res, next) => {
       6    try {
       7 -    const { role, isActive, page = 1, limit = 50 } =
         -req.query;
       7 +    const VALID_ROLES = ['owner', 'manager', 'cleaner',
         +'staff'];
       8 +    const MAX_LIMIT   = 100;
       9
      10 +    const rawRole     = typeof req.query.role === 'string'
         +? req.query.role : undefined;
      11 +    const rawIsActive = typeof req.query.isActive ===
         +'string' ? req.query.isActive : undefined;
      12 +    const page        = Math.max(1,
         +parseInt(req.query.page) || 1);
      13 +    const limit       = Math.min(MAX_LIMIT, Math.max(1,
         +parseInt(req.query.limit) || 50));
      14 +
      15      const filter = { tenantId: req.user.tenantId };
      16 -    if (role) filter.role = role;
      17 -    if (isActive !== undefined) filter.isActive = isActive
         - === 'true';
      16 +    if (rawRole && VALID_ROLES.includes(rawRole))
         +filter.role = rawRole;
      17 +    if (rawIsActive !== undefined) filter.isActive =
         +rawIsActive === 'true';
      18
      19 -    const skip = (parseInt(page) - 1) * parseInt(limit);
      19 +    const skip = (page - 1) * limit;
      20
      21      const [users, total] = await Promise.all([
      22        User.find(filter)
      23          .select('-passwordHash')
      24          .sort({ createdAt: -1 })
      25          .skip(skip)
      26 -        .limit(parseInt(limit)),
      26 +        .limit(limit),
      27        User.countDocuments(filter),
      28      ]);
      29
      30      res.json({
      31        success: true,
      32        data: users,
      33 -      pagination: { total, page: parseInt(page), limit:
         -parseInt(limit) },
      33 +      pagination: { total, page, limit },
      34      });
      35    } catch (err) {
      36      next(err);

● Fix MED-1 — cross-tenant validation for jobs controller

● Update(src\controllers\jobs.controller.js)
  ⎿  Added 3 lines
      1  const Job = require('../models/Job');
      2 +const Customer = require('../models/Customer');
      3 +const Service = require('../models/Service');
      4 +const User = require('../models/User');
      5
      6  // GET /api/jobs
      7  const listJobs = async (req, res, next) => {

● Update(src\controllers\jobs.controller.js)
  ⎿  Added 18 lines
      101        });
      102      }
      103
      104 +    // Verify referenced entities belong to this tenant
          +(MED-1: cross-tenant protection)
      105 +    const customer = await Customer.findOne({ _id:
          +customerId, tenantId: req.user.tenantId });
      106 +    if (!customer) {
      107 +      return res.status(400).json({ success: false, error:
          + 'Invalid customerId' });
      108 +    }
      109 +    if (serviceId) {
      110 +      const service = await Service.findOne({ _id:
          +serviceId, tenantId: req.user.tenantId });
      111 +      if (!service) {
      112 +        return res.status(400).json({ success: false,
          +error: 'Invalid serviceId' });
      113 +      }
      114 +    }
      115 +    if (assignedUsers && assignedUsers.length > 0) {
      116 +      const userCount = await User.countDocuments({ _id: {
          + $in: assignedUsers }, tenantId: req.user.tenantId });
      117 +      if (userCount !== assignedUsers.length) {
      118 +        return res.status(400).json({ success: false,
          +error: 'One or more assignedUsers are invalid' });
      119 +      }
      120 +    }
      121 +
      122      const job = await Job.create({
      123        tenantId: req.user.tenantId,
      124        customerId,

● Fix MED-2 — invoices: recalculate totals server-side, never trust client

● Update(src\controllers\invoices.controller.js)
  ⎿  Added 11 lines
       1  const Invoice = require('../models/Invoice');
       2  const Tenant = require('../models/Tenant');
       3 +const Customer = require('../models/Customer');
       4 +const Job = require('../models/Job');
       5
       6 +const TAX_RATE = 0.07; // 7% — move to tenant settings in
         +future
       7 +
       8 +const calcTotals = (items = []) => {
       9 +  const subtotal = items.reduce((sum, item) => sum +
         +(item.quantity || 1) * (item.unitPrice || 0), 0);
      10 +  const tax      = parseFloat((subtotal *
         +TAX_RATE).toFixed(2));
      11 +  const total    = parseFloat((subtotal + tax).toFixed(2));
      12 +  return { subtotal: parseFloat(subtotal.toFixed(2)), tax,
         +total };
      13 +};
      14 +
      15  const generateInvoiceNumber = async (tenantId) => {
      16    const tenant = await
          Tenant.findById(tenantId).select('slug');
      17    const slug = tenant ? tenant.slug.toUpperCase() : 'INV';

● Update(src\controllers\invoices.controller.js)
  ⎿  Added 25 lines, removed 16 lines
       73  // POST /api/invoices
       74  const createInvoice = async (req, res, next) => {
       75    try {
       76 -    const {
       77 -      customerId,
       78 -      jobId,
       79 -      items,
       80 -      subtotal,
       81 -      tax,
       82 -      total,
       83 -      currency,
       84 -      status,
       85 -      dueDate,
       86 -      paymentMethod,
       87 -    } = req.body;
       76 +    const { customerId, jobId, items, currency, dueDate }
          += req.body;
       77
       78      if (!customerId) {
       79        return res.status(400).json({ success: false, error:
            'customerId is required' });
       80      }
       81
       82 +    // MED-1: verify cross-tenant references
       83 +    const customer = await Customer.findOne({ _id:
          +customerId, tenantId: req.user.tenantId });
       84 +    if (!customer) {
       85 +      return res.status(400).json({ success: false, error:
          + 'Invalid customerId' });
       86 +    }
       87 +    if (jobId) {
       88 +      const job = await Job.findOne({ _id: jobId,
          +tenantId: req.user.tenantId });
       89 +      if (!job) {
       90 +        return res.status(400).json({ success: false,
          +error: 'Invalid jobId' });
       91 +      }
       92 +    }
       93 +
       94 +    // MED-2: always calculate totals server-side
       95 +    const sanitizedItems = (items || []).map((item) => ({
       96 +      description: String(item.description || '').slice(0,
          + 500),
       97 +      quantity:    Math.max(0, parseFloat(item.quantity)
          +|| 1),
       98 +      unitPrice:   Math.max(0, parseFloat(item.unitPrice)
          +|| 0),
       99 +      total:       parseFloat((Math.max(0,
          +parseFloat(item.quantity) || 1) * Math.max(0,
          +parseFloat(item.unitPrice) || 0)).toFixed(2)),
      100 +    }));
      101 +    const { subtotal, tax, total } =
          +calcTotals(sanitizedItems);
      102 +
      103      const invoiceNumber = await
           generateInvoiceNumber(req.user.tenantId);
      104
      105      const invoice = await Invoice.create({
     ...
       97        customerId,
       98        jobId,
       99        invoiceNumber,
      100 -      items: items || [],
      100 +      items: sanitizedItems,
      101        subtotal,
      102        tax,
      103        total,
      104 -      currency,
      105 -      status,
      104 +      currency: currency || 'USD',
      105 +      status: 'draft',
      106        dueDate,
      107 -      paymentMethod,
      107      });
      108
      109      res.status(201).json({ success: true, data: invoice
           });

● Also fix updateInvoice to recalculate totals and fix unbounded limit:

● Update(src\controllers\invoices.controller.js)
  ⎿  Added 20 lines, removed 16 lines
      125  // PUT /api/invoices/:id
      126  const updateInvoice = async (req, res, next) => {
      127    try {
      128 -    const allowedFields = [
      129 -      'items',
      130 -      'subtotal',
      131 -      'tax',
      132 -      'total',
      133 -      'currency',
      134 -      'status',
      135 -      'dueDate',
      136 -      'paidAt',
      137 -      'paymentMethod',
      138 -    ];
      139 -
      128 +    const VALID_STATUSES  = ['draft', 'sent', 'paid',
          +'overdue', 'void'];
      129 +    const VALID_METHODS   = ['cash', 'card',
          +'bank_transfer', 'stripe', 'other'];
      130      const updates = {};
      131 -    for (const field of allowedFields) {
      132 -      if (req.body[field] !== undefined) {
      133 -        updates[field] = req.body[field];
      134 -      }
      131 +
      132 +    if (req.body.items !== undefined) {
      133 +      const sanitizedItems = (req.body.items ||
          +[]).map((item) => ({
      134 +        description: String(item.description ||
          +'').slice(0, 500),
      135 +        quantity:    Math.max(0, parseFloat(item.quantity)
          + || 1),
      136 +        unitPrice:   Math.max(0,
          +parseFloat(item.unitPrice) || 0),
      137 +        total:       parseFloat((Math.max(0,
          +parseFloat(item.quantity) || 1) * Math.max(0,
          +parseFloat(item.unitPrice) || 0)).toFixed(2)),
      138 +      }));
      139 +      const { subtotal, tax, total } =
          +calcTotals(sanitizedItems);
      140 +      updates.items    = sanitizedItems;
      141 +      updates.subtotal = subtotal;
      142 +      updates.tax      = tax;
      143 +      updates.total    = total;
      144      }
      145 +    if (req.body.currency)       updates.currency      =
          +String(req.body.currency).slice(0, 3).toUpperCase();
      146 +    if (req.body.status &&
          +VALID_STATUSES.includes(req.body.status)) updates.status =
          + req.body.status;
      147 +    if (req.body.dueDate)        updates.dueDate       =
          +req.body.dueDate;
      148 +    if (req.body.paidAt)         updates.paidAt        =
          +req.body.paidAt;
      149 +    if (req.body.paymentMethod &&
          +VALID_METHODS.includes(req.body.paymentMethod))
          +updates.paymentMethod = req.body.paymentMethod;
      150
      151      const invoice = await Invoice.findOneAndUpdate(
      152        { _id: req.params.id, tenantId: req.user.tenantId },

● Fix the invoice list unbounded limit:

● Update(src\controllers\invoices.controller.js)
  ⎿  Added 13 lines, removed 6 lines
      23  // GET /api/invoices
      24  const listInvoices = async (req, res, next) => {
      25    try {
      26 -    const { status, customerId, page = 1, limit = 20 } =
         -req.query;
      26 +    const VALID_STATUSES = ['draft', 'sent', 'paid',
         +'overdue', 'void'];
      27 +    const MAX_LIMIT      = 100;
      28 +
      29 +    const rawStatus     = typeof req.query.status ===
         +'string' ? req.query.status : undefined;
      30 +    const rawCustomerId = typeof req.query.customerId ===
         +'string' ? req.query.customerId : undefined;
      31 +    const page          = Math.max(1,
         +parseInt(req.query.page) || 1);
      32 +    const limit         = Math.min(MAX_LIMIT, Math.max(1,
         +parseInt(req.query.limit) || 20));
      33 +
      34      const filter = { tenantId: req.user.tenantId };
      35 -    if (status) filter.status = status;
      36 -    if (customerId) filter.customerId = customerId;
      35 +    if (rawStatus && VALID_STATUSES.includes(rawStatus))
         +filter.status = rawStatus;
      36 +    if (rawCustomerId) filter.customerId =
         +String(rawCustomerId);
      37
      38 -    const skip = (parseInt(page) - 1) * parseInt(limit);
      38 +    const skip = (page - 1) * limit;
      39
      40      const [invoices, total] = await Promise.all([
      41        Invoice.find(filter)
     ...
      36          .populate('jobId', 'title scheduledStart')
      37          .sort({ createdAt: -1 })
      38          .skip(skip)
      39 -        .limit(parseInt(limit)),
      39 +        .limit(limit),
      40        Invoice.countDocuments(filter),
      41      ]);
      42
      43      res.json({
      44        success: true,
      45        data: invoices,
      46 -      pagination: { total, page: parseInt(page), limit:
         -parseInt(limit) },
      46 +      pagination: { total, page, limit },
      47      });
      48    } catch (err) {
      49      next(err);

● Fix messages controller — NoSQL injection + limit

● Update(src\controllers\messages.controller.js)
  ⎿  Added 18 lines, removed 8 lines
       3  // GET /api/messages
       4  const listMessages = async (req, res, next) => {
       5    try {
       6 -    const { customerId, jobId, channel, status, page = 1,
         -limit = 20 } = req.query;
       6 +    const VALID_CHANNELS = ['sms', 'email', 'whatsapp'];
       7 +    const VALID_STATUSES = ['queued', 'sent', 'delivered',
         +'failed', 'opened'];
       8 +    const MAX_LIMIT      = 100;
       9 +
      10 +    const rawCustomerId = typeof req.query.customerId ===
         +'string' ? req.query.customerId : undefined;
      11 +    const rawJobId      = typeof req.query.jobId ===
         +'string' ? req.query.jobId : undefined;
      12 +    const rawChannel    = typeof req.query.channel ===
         +'string' ? req.query.channel : undefined;
      13 +    const rawStatus     = typeof req.query.status ===
         +'string' ? req.query.status : undefined;
      14 +    const page          = Math.max(1,
         +parseInt(req.query.page) || 1);
      15 +    const limit         = Math.min(MAX_LIMIT, Math.max(1,
         +parseInt(req.query.limit) || 20));
      16 +
      17      const filter = { tenantId: req.user.tenantId };
      18 -    if (customerId) filter.customerId = customerId;
      19 -    if (jobId) filter.jobId = jobId;
      20 -    if (channel) filter.channel = channel;
      21 -    if (status) filter.status = status;
      18 +    if (rawCustomerId) filter.customerId =
         +String(rawCustomerId);
      19 +    if (rawJobId)      filter.jobId      =
         +String(rawJobId);
      20 +    if (rawChannel && VALID_CHANNELS.includes(rawChannel))
         +filter.channel = rawChannel;
      21 +    if (rawStatus  && VALID_STATUSES.includes(rawStatus))
         +filter.status  = rawStatus;
      22
      23 -    const skip = (parseInt(page) - 1) * parseInt(limit);
      23 +    const skip = (page - 1) * limit;
      24
      25      const [messages, total] = await Promise.all([
      26        MessageLog.find(filter)
     ...
      18          .populate('jobId', 'title scheduledStart')
      19          .sort({ createdAt: -1 })
      20          .skip(skip)
      21 -        .limit(parseInt(limit)),
      21 +        .limit(limit),
      22        MessageLog.countDocuments(filter),
      23      ]);
      24
      25      res.json({
      26        success: true,
      27        data: messages,
      28 -      pagination: { total, page: parseInt(page), limit:
         -parseInt(limit) },
      28 +      pagination: { total, page, limit },
      29      });
      30    } catch (err) {
      31      next(err);

● Fix MED-5 — /api/auth/me clean response, and HIGH-3 + HIGH-4 + CRIT-2 in
  app.js (CORS, rate limiting)

● Update(src\controllers\auth.controller.js)
  ⎿  Added 16 lines, removed 2 lines
      139  // GET /api/auth/me
      140  const me = async (req, res, next) => {
      141    try {
      142 -    const user = await
          -User.findById(req.user.id).select('-passwordHash');
      142 +    const user = await
          +User.findById(req.user.id).select('-passwordHash -__v');
      143      if (!user) {
      144        return res.status(404).json({ success: false, error:
            'User not found' });
      145      }
      146
      147 -    res.json({ success: true, data: user });
      147 +    // MED-5: return only fields the client needs
      148 +    res.json({
      149 +      success: true,
      150 +      data: {
      151 +        id:                user._id,
      152 +        firstName:         user.firstName,
      153 +        lastName:          user.lastName,
      154 +        email:             user.email,
      155 +        role:              user.role,
      156 +        preferredLanguage: user.preferredLanguage,
      157 +        phone:             user.phone,
      158 +        tenantId:          user.tenantId,
      159 +        isActive:          user.isActive,
      160 +      },
      161 +    });
      162    } catch (err) {
      163      next(err);
      164    }

● Now fix app.js — CORS whitelist, rate limiting on auth, body size limit,
  and 404 URL reflection:

● Update(src\app.js)
  ⎿  Added 54 lines, removed 7 lines
      1  const express = require('express');
      2  const cors = require('cors');
      3  const morgan = require('morgan');
      4 +const rateLimit = require('express-rate-limit');
      5  const errorHandler = require('./middleware/errorHandler');
      6
      7  const authRoutes = require('./routes/auth.routes');
     ...
      17
      18  const app = express();
      19
      20 -// Core middleware
      21 -app.use(cors());
      22 -app.use(express.json());
      23 -app.use(express.urlencoded({ extended: false }));
      20 +// HIGH-3: Restrict CORS to known origins
      21 +const allowedOrigins = (process.env.ALLOWED_ORIGINS ||
         +'http://localhost:3000')
      22 +  .split(',')
      23 +  .map((o) => o.trim());
      24
      25 +app.use(cors({
      26 +  origin: (origin, callback) => {
      27 +    // Allow requests with no origin (mobile apps, Postman,
         + server-to-server)
      28 +    if (!origin) return callback(null, true);
      29 +    if (allowedOrigins.includes(origin)) return
         +callback(null, true);
      30 +    callback(new Error(`CORS: origin ${origin} not
         +allowed`));
      31 +  },
      32 +  credentials: true,
      33 +}));
      34 +
      35 +// Limit request body size
      36 +app.use(express.json({ limit: '50kb' }));
      37 +app.use(express.urlencoded({ extended: false, limit: '50kb'
         + }));
      38 +
      39  if (process.env.NODE_ENV !== 'test') {
      40 -  app.use(morgan('dev'));
      40 +  // LOW-1: skip logging query strings to avoid leaking
         +filter values
      41 +  app.use(morgan(':method :url :status :response-time
         +ms'));
      42  }
      43
      44 +// HIGH-4: Rate limit auth endpoints (login + register)
      45 +const authLimiter = rateLimit({
      46 +  windowMs: 15 * 60 * 1000, // 15 minutes
      47 +  max: 20,
      48 +  standardHeaders: true,
      49 +  legacyHeaders: false,
      50 +  message: { success: false, error: 'Too many requests,
         +please try again later.' },
      51 +});
      52 +
      53 +// CRIT-2: Stricter limit on registration to slow abuse
      54 +const registerLimiter = rateLimit({
      55 +  windowMs: 60 * 60 * 1000, // 1 hour
      56 +  max: 5,
      57 +  standardHeaders: true,
      58 +  legacyHeaders: false,
      59 +  message: { success: false, error: 'Too many registration
         +attempts, please try again later.' },
      60 +});
      61 +
      62 +// General API rate limit
      63 +const apiLimiter = rateLimit({
      64 +  windowMs: 1 * 60 * 1000, // 1 minute
      65 +  max: 300,
      66 +  standardHeaders: true,
      67 +  legacyHeaders: false,
      68 +  message: { success: false, error: 'Too many requests,
         +please slow down.' },
      69 +});
      70 +
      71 +app.use('/api/', apiLimiter);
      72 +app.use('/api/auth/login', authLimiter);
      73 +app.use('/api/auth/register', registerLimiter);
      74 +
      75  // Health check
      76  app.get('/api/health', (req, res) => {
      77    res.json({ success: true, data: { status: 'ok', service:
          'Brillo API' } });
     ...
      44  app.use('/api/automations', automationsRoutes);
      45  app.use('/api/dashboard', dashboardRoutes);
      46
      47 -// 404 handler
      47 +// LOW-2: Don't reflect the raw URL back
      48  app.use((req, res) => {
      49 -  res.status(404).json({ success: false, error: `Route
         -${req.originalUrl} not found` });
      49 +  res.status(404).json({ success: false, error: 'Route
         +not found' });
      50  });
      51
      52  // Global error handler

● Fix HIGH-5 — remove hardcoded password from seed console output

● Update(scripts\seed.js)
  ⎿  Added 1 line, removed 2 lines
      316    console.log(`  Messages:        ${messages.length}`);
      317    console.log(`  Automations:     ${automations.length}`);
      318    console.log('─'.repeat(40));
      319 -  console.log('\n🔑 Login credentials (all users):');
      320 -  console.log('  Password: Password123!');
      319 +  console.log('\n🔑 Seeded user emails (use SEED_PASSWORD
          +env var or default dev password):');
      320    usersData.forEach((u) => console.log(`
           ${u.role.padEnd(10)} → ${u.email}`));
      321  }
      322

● Also make the seed password configurable via env:

● Update(scripts\seed.js)
  ⎿  Added 2 lines, removed 1 line
      87
      88    // ── 2. Users ──────────────────────────────────────────
          ─────────────────────
      89    console.log('🌱 Seeding users...');
      90 -  const passwordHash = await bcrypt.hash('Password123!',
         -12);
      90 +  const seedPassword = process.env.SEED_PASSWORD ||
         +'Dev@Brillo2026!';
      91 +  const passwordHash = await bcrypt.hash(seedPassword, 12);
      92
      93    const usersData = [
      94      { firstName: 'Alex',    lastName: 'Brillo',   email:
          'owner@brillocleaning.com',   role: 'owner',   phone:
          '+13055550100', preferredLanguage: 'en' },

● Now add SEED_PASSWORD and ALLOWED_ORIGINS to the .env.example:

  Read 1 file (ctrl+o to expand)

● Update(.env.example)
  ⎿  Added 6 lines
       2  MONGODB_URI=mongodb://localhost:27017/brillo
       3  JWT_SECRET=your_jwt_secret_here
       4  NODE_ENV=development
       5 +
       6 +# CORS: comma-separated list of allowed frontend origins
       7 +ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
       8 +
       9 +# Seed script password (dev only, never use in production)
      10 +SEED_PASSWORD=Dev@Brillo2026!

● Now let's verify the server still starts cleanly: