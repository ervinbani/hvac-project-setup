const { z } = require("zod");
const Customer = require("../../models/Customer");

function listCustomers(tenantId) {
  return {
    description:
      "List all customers for the current account. " +
      "Use this when the user asks 'how many customers do I have?', " +
      "'show me all customers', or wants a general overview. " +
      "For finding a specific customer by name/email/phone, use searchCustomers instead.",
    parameters: z.object({
      limit: z
        .number()
        .min(1)
        .max(100)
        .default(50)
        .describe("Maximum number of customers to return"),
    }),
    execute: async ({ limit }) => {
      try {
        const results = await Customer.find({ tenantId })
          .select("firstName lastName email phone address city")
          .limit(limit ?? 50)
          .lean();

        if (results.length === 0) {
          return { message: "No customers found", count: 0 };
        }

        return { count: results.length, customers: results };
      } catch (err) {
        console.error('[listCustomers] execute error:', err.message);
        return { error: err.message };
      }
    },
  };
}

module.exports = { listCustomers };
