const { z } = require("zod");
const jwt = require("jsonwebtoken");

function createCustomer(tenantId, scoping = { canWrite: true }) {
  return {
    description:
      "Create a new customer record. " +
      "Use searchCustomers first to make sure the customer doesn't already exist. " +
      "After calling this tool, you will receive a confirmation code. " +
      "Show the summary and ask the user to confirm, then call confirmAction with the code.",
    parameters: z.object({
      firstName: z.string().min(1).describe("Customer's first name"),
      lastName: z.string().min(1).describe("Customer's last name"),
      email: z.string().email().optional().describe("Customer's email address"),
      phone: z.string().optional().describe("Customer's phone number"),
      street: z.string().optional().describe("Street address"),
      city: z.string().optional().describe("City"),
      notes: z.string().optional().describe("Any notes about the customer"),
    }),
    execute: async (args) => {
      if (!scoping.canWrite) {
        return { error: "Your role does not have permission to create customers." };
      }

      const confirmationCode = jwt.sign(
        {
          action: "createCustomer",
          params: {
            tenantId,
            firstName: args.firstName,
            lastName: args.lastName,
            email: args.email,
            phone: args.phone,
            address: {
              street: args.street,
              city: args.city,
            },
            notes: args.notes,
            status: "active",
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
          action: "Create Customer",
          name: `${args.firstName} ${args.lastName}`,
          email: args.email,
          phone: args.phone,
        },
      };
    },
  };
}

module.exports = { createCustomer };
