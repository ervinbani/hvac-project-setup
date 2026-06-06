const { z } = require("zod");
const jwt = require("jsonwebtoken");
const Customer = require("../../models/Customer");

function createInvoice(tenantId, userId) {
  return {
    description:
      "Create a new invoice for a customer with line items. " +
      "Use searchCustomers first to get the customer ID. " +
      "After calling this tool, you will receive a confirmation code. " +
      "Show the summary and ask the user to confirm, then call confirmAction with the code.",
    parameters: z.object({
      customerId: z.string().min(1).describe("The _id of the customer being billed"),
      dueDate: z.string().describe("Due date in ISO format (e.g. 2026-07-06)"),
      items: z
        .array(
          z.object({
            description: z.string().min(1).describe("Description of the line item"),
            quantity: z.number().min(0.01).describe("Quantity (e.g. hours, units)"),
            unitPrice: z.number().min(0).describe("Price per unit"),
          }),
        )
        .min(1)
        .describe("Array of line items on the invoice"),
      taxRate: z
        .number()
        .min(0)
        .max(100)
        .default(0)
        .describe("Tax rate percentage (e.g. 22 for 22%)"),
      notes: z.string().optional().describe("Any notes to appear on the invoice"),
    }),
    execute: async (args) => {
      // Business validation before creating token
      const customer = await Customer.findOne({ _id: args.customerId, tenantId }).lean();
      if (!customer) {
        return { error: `Customer with id ${args.customerId} not found. Use searchCustomers first.` };
      }

      const items = args.items.map((item) => ({
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        total: Math.round(item.quantity * item.unitPrice * 100) / 100,
      }));

      const subtotal = items.reduce((sum, item) => sum + item.total, 0);
      const taxAmount = Math.round(subtotal * (args.taxRate / 100) * 100) / 100;
      const total = Math.round((subtotal + taxAmount) * 100) / 100;

      const confirmationCode = jwt.sign(
        {
          action: "createInvoice",
          params: {
            tenantId,
            customerId: args.customerId,
            invoiceNumber: `INV-${Date.now()}`,
            customerSnapshot: {
              name: `${customer.firstName} ${customer.lastName}`,
              email: customer.email,
            },
            issuedDate: new Date(),
            dueDate: new Date(args.dueDate),
            items,
            subtotal,
            taxRate: args.taxRate,
            tax: taxAmount,
            total,
            currency: "EUR",
            status: "draft",
            notes: args.notes,
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
          action: "Create Invoice",
          customer: `${customer.firstName} ${customer.lastName}`,
          itemsCount: args.items.length,
          total: `${total} EUR`,
          dueDate: args.dueDate,
        },
      };
    },
  };
}

module.exports = { createInvoice };
