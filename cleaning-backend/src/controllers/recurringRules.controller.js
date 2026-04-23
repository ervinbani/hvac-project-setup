const RecurringRule = require("../models/RecurringRule");
const Job = require("../models/Job");

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Given a rule and a date range, returns all scheduledStart dates that match.
 * startTime is "HH:MM" UTC.
 * Supports daysOfWeek (array), monthsOfYear filter, daily and monthly.
 */
const generateOccurrenceDates = (rule, from, to) => {
  const dates = [];
  const [hh, mm] = rule.startTime.split(":").map(Number);

  // Resolve effective days array
  const activeDays =
    rule.daysOfWeek && rule.daysOfWeek.length > 0
      ? rule.daysOfWeek
      : rule.dayOfWeek != null
        ? [rule.dayOfWeek]
        : [1]; // fallback monday

  // Active months filter (1-12); empty = all months
  const activeMonths =
    rule.monthsOfYear && rule.monthsOfYear.length > 0
      ? new Set(rule.monthsOfYear)
      : null;

  const cursor = new Date(from);
  cursor.setUTCHours(hh, mm, 0, 0);

  if (rule.frequency === "monthly") {
    // Jump to dayOfMonth in current month, advance if already past
    cursor.setUTCDate(rule.dayOfMonth || 1);
    if (cursor < from) cursor.setUTCMonth(cursor.getUTCMonth() + 1);

    while (cursor <= to) {
      const month1 = cursor.getUTCMonth() + 1; // 1-12
      if (!activeMonths || activeMonths.has(month1)) {
        if (cursor >= from) dates.push(new Date(cursor));
      }
      cursor.setUTCMonth(cursor.getUTCMonth() + 1);
    }
  } else if (rule.frequency === "daily") {
    while (cursor <= to) {
      const month1 = cursor.getUTCMonth() + 1;
      if (!activeMonths || activeMonths.has(month1)) {
        if (cursor >= from) dates.push(new Date(cursor));
      }
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
  } else {
    // weekly — iterate day by day and emit on matching daysOfWeek
    while (cursor <= to) {
      const dow = cursor.getUTCDay();
      const month1 = cursor.getUTCMonth() + 1;
      if (
        activeDays.includes(dow) &&
        (!activeMonths || activeMonths.has(month1))
      ) {
        if (cursor >= from) dates.push(new Date(cursor));
      }
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
  }

  return dates;
};

/**
 * Bulk-creates Job documents for each occurrence date.
 * Skips dates where a job from this rule already exists (idempotent).
 */
const generateJobsForRule = async (rule, from, to) => {
  const occurrences = generateOccurrenceDates(rule, from, to);
  if (occurrences.length === 0) return [];

  // Fetch existing jobs for this rule to avoid duplicates
  const existing = await Job.find(
    { recurringRuleId: rule._id, scheduledStart: { $gte: from, $lte: to } },
    { scheduledStart: 1 },
  ).lean();
  const existingTimes = new Set(
    existing.map((j) => j.scheduledStart.getTime()),
  );

  const toCreate = occurrences
    .filter((d) => !existingTimes.has(d.getTime()))
    .map((start) => {
      const end =
        rule.timeDuration > 0
          ? new Date(start.getTime() + rule.timeDuration * 60 * 60 * 1000)
          : undefined;
      return {
        tenantId: rule.tenantId,
        customerId: rule.customerId,
        serviceId: rule.serviceId,
        recurringRuleId: rule._id,
        title: rule.title,
        propertyAddress: rule.propertyAddress,
        assignedUsers: rule.assignedUsers,
        scheduledStart: start,
        scheduledEnd: end,
        timeDuration: rule.timeDuration,
        price: rule.price,
        priceUnit: rule.priceUnit,
        status: "scheduled",
      };
    });

  if (toCreate.length === 0) return [];
  return Job.insertMany(toCreate);
};

// ─── Controllers ──────────────────────────────────────────────────────────────

// GET /api/recurring/:id
const getRecurringRule = async (req, res, next) => {
  try {
    const rule = await RecurringRule.findOne({
      _id: req.params.id,
      tenantId: req.user.tenantId,
    })
      .populate("customerId", "firstName lastName email")
      .populate("serviceId", "name basePrice");

    if (!rule) {
      return res
        .status(404)
        .json({ success: false, error: "Recurring rule not found" });
    }

    res.json({ success: true, data: rule });
  } catch (err) {
    next(err);
  }
};

// GET /api/recurring
const listRecurringRules = async (req, res, next) => {
  try {
    const { customerId, isActive } = req.query;
    const filter = { tenantId: req.user.tenantId };
    if (customerId) filter.customerId = customerId;
    if (isActive !== undefined) filter.isActive = isActive === "true";

    const rules = await RecurringRule.find(filter)
      .populate("customerId", "firstName lastName email")
      .populate("serviceId", "name basePrice")
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
      daysOfWeek,
      dayOfMonth,
      monthsOfYear,
      startDate,
      endDate,
      isActive,
      title,
      startTime,
      timeDuration,
      price,
      priceUnit,
      propertyAddress,
      assignedUsers,
    } = req.body;

    if (!customerId || !frequency || !startDate || !startTime) {
      return res.status(400).json({
        success: false,
        error: "customerId, frequency, startDate and startTime are required",
      });
    }

    const rule = await RecurringRule.create({
      tenantId: req.user.tenantId,
      customerId,
      serviceId,
      frequency,
      dayOfWeek,
      daysOfWeek,
      dayOfMonth,
      monthsOfYear,
      startDate,
      endDate,
      isActive,
      title,
      startTime,
      timeDuration,
      price,
      priceUnit,
      propertyAddress,
      assignedUsers,
    });

    // Auto-generate occurrences for the next 90 days
    const from = new Date(startDate);
    const horizon = endDate
      ? new Date(
          Math.min(
            new Date(endDate).getTime(),
            from.getTime() + 90 * 24 * 60 * 60 * 1000,
          ),
        )
      : new Date(from.getTime() + 90 * 24 * 60 * 60 * 1000);

    const jobs = await generateJobsForRule(rule, from, horizon);

    res
      .status(201)
      .json({ success: true, data: rule, jobsGenerated: jobs.length });
  } catch (err) {
    next(err);
  }
};

// PUT /api/recurring/:id
const updateRecurringRule = async (req, res, next) => {
  try {
    const allowedFields = [
      "serviceId",
      "frequency",
      "dayOfWeek",
      "daysOfWeek",
      "dayOfMonth",
      "monthsOfYear",
      "startDate",
      "endDate",
      "isActive",
      "title",
      "startTime",
      "timeDuration",
      "price",
      "priceUnit",
      "propertyAddress",
      "assignedUsers",
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
      { new: true, runValidators: true },
    );

    if (!rule) {
      return res
        .status(404)
        .json({ success: false, error: "Recurring rule not found" });
    }

    res.json({ success: true, data: rule });
  } catch (err) {
    next(err);
  }
};

// POST /api/recurring/:id/generate
const generateJobs = async (req, res, next) => {
  try {
    const rule = await RecurringRule.findOne({
      _id: req.params.id,
      tenantId: req.user.tenantId,
    });

    if (!rule) {
      return res
        .status(404)
        .json({ success: false, error: "Recurring rule not found" });
    }

    const from = req.query.from ? new Date(req.query.from) : new Date();
    const defaultTo = new Date(from.getTime() + 90 * 24 * 60 * 60 * 1000);
    const to = req.query.to
      ? new Date(
          Math.min(new Date(req.query.to).getTime(), defaultTo.getTime()),
        )
      : defaultTo;

    if (isNaN(from) || isNaN(to) || from > to) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid date range" });
    }

    const jobs = await generateJobsForRule(rule, from, to);

    res.json({ success: true, jobsGenerated: jobs.length });
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
      return res
        .status(404)
        .json({ success: false, error: "Recurring rule not found" });
    }

    res.json({ success: true, data: { message: "Recurring rule deleted" } });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getRecurringRule,
  listRecurringRules,
  createRecurringRule,
  updateRecurringRule,
  generateJobs,
  deleteRecurringRule,
};
