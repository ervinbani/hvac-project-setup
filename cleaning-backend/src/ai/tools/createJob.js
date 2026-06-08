const { z } = require("zod");
const jwt = require("jsonwebtoken");
const Customer = require("../../models/Customer");
const Service = require("../../models/Service");

function createJob(tenantId, userId, scoping = { canWrite: true }) {
  return {
    description:
      "Create a new job for an existing customer. " +
      "Use searchCustomers and searchServices first to get the customer and service IDs. " +
      "After calling this tool, you will receive a confirmation code. " +
      "Show the summary and ask the user to confirm, then call confirmAction with the code.",
    parameters: z.object({
      customerId: z.string().min(1).describe("The _id of the customer (get this via searchCustomers)"),
      serviceId: z.string().min(1).describe("The _id of the service (get this via searchServices)"),
      scheduledDate: z
        .string()
        .describe("Date and time in ISO 8601 format (e.g. 2026-06-06T10:00:00.000Z)"),
      notes: z.string().optional().describe("Any special instructions or notes for the job"),
    }),
    execute: async (args) => {
      if (!scoping.canWrite) {
        return { error: "Your role does not have permission to create jobs." };
      }

      // Business validation still happens NOW — catch issues before creating token
      const customer = await Customer.findOne({ _id: args.customerId, tenantId }).lean();
      if (!customer) {
        return { error: `Customer with id ${args.customerId} not found. Use searchCustomers to find the correct ID.` };
      }

      const service = await Service.findOne({ _id: args.serviceId, tenantId }).lean();
      if (!service) {
        return { error: `Service with id ${args.serviceId} not found. Use searchServices to find the correct ID.` };
      }

      const confirmationCode = jwt.sign(
        {
          action: "createJob",
          params: {
            tenantId,
            customerId: args.customerId,
            serviceId: args.serviceId,
            scheduledStart: new Date(args.scheduledDate),
            status: "scheduled",
            title: `Job for ${customer.firstName} ${customer.lastName}`,
            notesCustomer: args.notes,
            createdBy: userId,
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
          action: "Create Job",
          customer: `${customer.firstName} ${customer.lastName}`,
          service: service.name?.en || "Unknown",
          scheduledDate: args.scheduledDate,
        },
      };
    },
  };
}

module.exports = { createJob };
