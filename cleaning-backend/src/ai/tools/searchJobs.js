const { z } = require("zod");
const Job = require("../../models/Job");

function searchJobs(tenantId) {
  return {
    description:
      "Search for jobs with optional filters. " +
      "Use this when a user asks about their jobs, schedule, " +
      "or wants to know the status of a specific job.",
    parameters: z.object({
      status: z
        .enum([
          "scheduled",
          "confirmed",
          "in_progress",
          "completed",
          "canceled",
          "no_show",
        ])
        .optional()
        .describe("Filter by job status"),
      customerId: z
        .string()
        .optional()
        .describe("Filter by customer ID (use searchCustomers first to get the ID)"),
      dateFrom: z
        .string()
        .optional()
        .describe("Start date in ISO format (e.g. 2026-06-05)"),
      dateTo: z
        .string()
        .optional()
        .describe("End date in ISO format (e.g. 2026-06-05)"),
      limit: z
        .number()
        .min(1)
        .max(50)
        .default(20)
        .describe("Maximum number of jobs to return"),
    }),
    execute: async ({ status, customerId, dateFrom, dateTo, limit }) => {
      const filter = { tenantId };

      if (status) filter.status = status;
      if (customerId) filter.customerId = customerId;
      if (dateFrom || dateTo) {
        filter.scheduledStart = {};
        if (dateFrom) filter.scheduledStart.$gte = new Date(dateFrom);
        if (dateTo) filter.scheduledStart.$lte = new Date(dateTo);
      }

      const results = await Job.find(filter)
        .sort({ scheduledStart: 1 })
        .limit(limit)
        .populate("customerId", "firstName lastName email phone")
        .select(
          "title status scheduledStart scheduledEnd price priceUnit propertyAddress",
        )
        .lean();

      if (results.length === 0) {
        return {
          message: "No jobs found matching your filters",
          filters: { status, customerId, dateFrom, dateTo },
        };
      }

      return results;
    },
  };
}

module.exports = { searchJobs };
