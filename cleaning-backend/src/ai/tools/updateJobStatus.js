const { z } = require("zod");
const jwt = require("jsonwebtoken");
const Job = require("../../models/Job");

function updateJobStatus(tenantId) {
  return {
    description:
      "Update the status of an existing job. " +
      "Use searchJobs first to find the job. " +
      "After calling this tool, you will receive a confirmation code. " +
      "Show the summary and ask the user to confirm, then call confirmAction with the code.",
    parameters: z.object({
      jobId: z.string().min(1).describe("The _id of the job to update"),
      status: z
        .enum([
          "scheduled",
          "confirmed",
          "in_progress",
          "completed",
          "canceled",
          "no_show",
        ])
        .describe("The new status"),
      reason: z
        .string()
        .optional()
        .describe("Reason for the status change (e.g. why canceled)"),
    }),
    execute: async (args) => {
      // Validate the job exists before creating token
      const job = await Job.findOne({ _id: args.jobId, tenantId })
        .select("title status")
        .lean();

      if (!job) {
        return { error: `Job with id ${args.jobId} not found. Use searchJobs to verify.` };
      }

      const confirmationCode = jwt.sign(
        {
          action: "updateJobStatus",
          params: {
            jobId: args.jobId,
            status: args.status,
            reason: args.reason,
          },
          tenantId,
        },
        process.env.JWT_SECRET,
        { expiresIn: "5m" },
      );

      return {
        pending: true,
        confirmationCode,
        summary: {
          action: "Update Job Status",
          job: job.title || args.jobId,
          currentStatus: job.status,
          newStatus: args.status,
          reason: args.reason,
        },
      };
    },
  };
}

module.exports = { updateJobStatus };
