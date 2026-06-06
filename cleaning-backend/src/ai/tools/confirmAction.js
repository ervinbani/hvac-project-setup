const { z } = require("zod");
const jwt = require("jsonwebtoken");

// Maps action types to the actual model operation
const ACTION_HANDLERS = {
  createCustomer: require("../../models/Customer"),
  createJob: require("../../models/Job"),
  updateJobStatus: require("../../models/Job"),
  createInvoice: require("../../models/Invoice"),
};

function confirmAction(tenantId) {
  return {
    description:
      "Confirm a pending action using the confirmation code provided earlier. " +
      "Call this ONLY after the user explicitly confirms they want to proceed. " +
      "The confirmation code is a JWT token returned by a previous write tool call.",
    parameters: z.object({
      confirmationCode: z
        .string()
        .min(1)
        .describe("The confirmation code (JWT token) returned by a previous write tool"),
    }),
    execute: async ({ confirmationCode }) => {
      let decoded;
      try {
        decoded = jwt.verify(confirmationCode, process.env.JWT_SECRET);
      } catch (err) {
        if (err.name === "TokenExpiredError") {
          return {
            error:
              "This confirmation code has expired (valid for 5 minutes). " +
              "Please ask the user if they want to start over.",
          };
        }
        return { error: "Invalid confirmation code. Please ask the user to try again." };
      }

      // Security: verify the action belongs to this tenant
      if (decoded.tenantId !== tenantId) {
        return { error: "Invalid confirmation code for this account." };
      }

      const { action, params } = decoded;

      try {
        const result = await executeAction(action, params, tenantId);
        return result;
      } catch (err) {
        return { error: `Failed to execute ${action}: ${err.message}` };
      }
    },
  };
}

async function executeAction(action, params, tenantId) {
  switch (action) {
    case "createCustomer": {
      const Customer = require("../../models/Customer");
      const customer = await Customer.create({ ...params, tenantId });
      return { success: true, data: customer.toObject() };
    }

    case "createJob": {
      const Job = require("../../models/Job");
      const job = await Job.create({ ...params, tenantId });
      return { success: true, data: job.toObject() };
    }

    case "updateJobStatus": {
      const Job = require("../../models/Job");
      const updated = await Job.findOneAndUpdate(
        { _id: params.jobId, tenantId },
        {
          $set: {
            status: params.status,
            ...(params.reason ? { notesInternal: params.reason } : {}),
          },
        },
        { new: true },
      )
        .select("title status scheduledStart")
        .lean();

      if (!updated) {
        return { error: `Job with id ${params.jobId} not found.` };
      }
      return { success: true, data: updated };
    }

    case "createInvoice": {
      const Invoice = require("../../models/Invoice");
      const invoice = await Invoice.create({ ...params, tenantId });
      return { success: true, data: invoice.toObject() };
    }

    default:
      return { error: `Unknown action: ${action}` };
  }
}

module.exports = { confirmAction };
