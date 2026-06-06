const { z } = require("zod");
const Customer = require("../../models/Customer");

function searchCustomers(tenantId) {
  return {
    description:
      "Search for customers by name, phone, or email. " +
      "Use this whenever you need to find a customer's ID before " +
      "creating a job or invoice, or when a user asks about a specific customer.",
    parameters: z.object({
      search: z
        .string()
        .min(1)
        .describe("Name, phone number or email to search for"),
    }),
    execute: async ({ search }) => {
      const results = await Customer.find({
        tenantId,
        $or: [
          { firstName: new RegExp(search, "i") },
          { lastName: new RegExp(search, "i") },
          { email: new RegExp(search, "i") },
          { phone: search.replace(/\s/g, "") },
        ],
      })
        .select("firstName lastName email phone address city")
        .lean();

      if (results.length === 0) {
        return { message: `No customers found matching "${search}"` };
      }

      return results;
    },
  };
}

module.exports = { searchCustomers };
