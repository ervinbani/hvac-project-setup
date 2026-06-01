const mongoose = require("mongoose");
const Job = require("../models/Job");

const RESTRICTED_ROLES = ["worker", "staff"];

// GET /api/timesheets
// - worker/staff: only their own entries across all jobs
// - manager+: all entries, filterable by userId / jobId / dateFrom / dateTo
const listTimesheets = async (req, res, next) => {
  try {
    const isRestricted = RESTRICTED_ROLES.includes(req.user.role);

    const rawJobId =
      typeof req.query.jobId === "string" ? req.query.jobId : undefined;
    const rawUserId =
      typeof req.query.userId === "string" ? req.query.userId : undefined;
    const rawDateFrom =
      typeof req.query.dateFrom === "string" ? req.query.dateFrom : undefined;
    const rawDateTo =
      typeof req.query.dateTo === "string" ? req.query.dateTo : undefined;

    const jobFilter = { tenantId: new mongoose.Types.ObjectId(req.user.tenantId) };
    if (rawJobId) jobFilter._id = new mongoose.Types.ObjectId(rawJobId);

    // Build pipeline to unwind timeEntries
    const pipeline = [
      { $match: jobFilter },
      { $unwind: "$timeEntries" },
    ];

    // Restrict to own entries for worker / staff
    const targetUserId = isRestricted
      ? new mongoose.Types.ObjectId(req.user.id)
      : rawUserId
      ? new mongoose.Types.ObjectId(rawUserId)
      : null;

    if (targetUserId) {
      pipeline.push({
        $match: { "timeEntries.userId": targetUserId },
      });
    }

    // Date range filter on clockIn
    if (rawDateFrom || rawDateTo) {
      const dateMatch = {};
      if (rawDateFrom) dateMatch.$gte = new Date(rawDateFrom);
      if (rawDateTo) dateMatch.$lte = new Date(rawDateTo);
      pipeline.push({ $match: { "timeEntries.clockIn": dateMatch } });
    }

    pipeline.push(
      {
        $lookup: {
          from: "users",
          localField: "timeEntries.userId",
          foreignField: "_id",
          as: "timeEntries.user",
        },
      },
      {
        $addFields: {
          "timeEntries.user": { $arrayElemAt: ["$timeEntries.user", 0] },
        },
      },
      {
        $project: {
          jobId: "$_id",
          jobTitle: "$title",
          scheduledStart: 1,
          status: 1,
          entryId: "$timeEntries._id",
          userId: "$timeEntries.userId",
          userName: {
            $concat: [
              "$timeEntries.user.firstName",
              " ",
              "$timeEntries.user.lastName",
            ],
          },
          clockIn: "$timeEntries.clockIn",
          clockOut: "$timeEntries.clockOut",
          duration: "$timeEntries.duration",
        },
      },
      { $sort: { clockIn: -1 } },
    );

    const entries = await Job.aggregate(pipeline);

    res.json({ success: true, data: entries });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/timesheets/:jobId/:entryId
// managers+ only: correct clockIn / clockOut / duration of an existing entry
const updateTimeEntry = async (req, res, next) => {
  try {
    const { clockIn, clockOut, duration } = req.body;

    const job = await Job.findOne({
      _id: req.params.jobId,
      tenantId: req.user.tenantId,
    });
    if (!job) {
      return res.status(404).json({ success: false, error: "Job not found" });
    }

    const entry = job.timeEntries.id(req.params.entryId);
    if (!entry) {
      return res
        .status(404)
        .json({ success: false, error: "Time entry not found" });
    }

    if (clockIn !== undefined) {
      const d = new Date(clockIn);
      if (isNaN(d.getTime()))
        return res
          .status(400)
          .json({ success: false, error: "Invalid clockIn date" });
      entry.clockIn = d;
    }
    if (clockOut !== undefined) {
      const d = new Date(clockOut);
      if (isNaN(d.getTime()))
        return res
          .status(400)
          .json({ success: false, error: "Invalid clockOut date" });
      entry.clockOut = d;
    }
    if (duration !== undefined) {
      if (typeof duration !== "number" || duration < 0)
        return res
          .status(400)
          .json({ success: false, error: "duration must be a non-negative number" });
      entry.duration = duration;
    }

    // Auto-recalculate duration if both times are set and duration not explicitly provided
    if (clockIn === undefined && clockOut === undefined && duration === undefined) {
      return res
        .status(400)
        .json({ success: false, error: "Provide at least one field to update" });
    }
    if (
      duration === undefined &&
      entry.clockIn &&
      entry.clockOut
    ) {
      entry.duration = Math.round(
        (entry.clockOut - entry.clockIn) / 60000,
      );
    }

    await job.save();
    await job.populate("timeEntries.userId", "firstName lastName");

    const updated = job.timeEntries.id(req.params.entryId);
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/timesheets/:jobId/:entryId
// manager_operations+ only
const deleteTimeEntry = async (req, res, next) => {
  try {
    const job = await Job.findOne({
      _id: req.params.jobId,
      tenantId: req.user.tenantId,
    });
    if (!job) {
      return res.status(404).json({ success: false, error: "Job not found" });
    }

    const entry = job.timeEntries.id(req.params.entryId);
    if (!entry) {
      return res
        .status(404)
        .json({ success: false, error: "Time entry not found" });
    }

    entry.deleteOne();
    await job.save();

    res.json({ success: true, data: { message: "Time entry deleted" } });
  } catch (err) {
    next(err);
  }
};

module.exports = { listTimesheets, updateTimeEntry, deleteTimeEntry };
