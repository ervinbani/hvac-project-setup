const { z } = require("zod");
const Invoice = require("../../models/Invoice");

function getInvoiceById(tenantId) {
  return {
    description:
      "Get detailed information about a specific invoice by its ID. " +
      "Use this when a user asks about an invoice's details, status, " +
      "or payment information.",
    parameters: z.object({
      id: z.string().min(1).describe("The MongoDB _id of the invoice"),
    }),
    execute: async ({ id }) => {
      const invoice = await Invoice.findOne({ _id: id, tenantId })
        .populate("customerId", "firstName lastName email phone")
        .select(
          "invoiceNumber status issuedDate dueDate items subtotal discount tax total currency paymentMethod paidAt customerSnapshot",
        )
        .lean();

      if (!invoice) {
        return { message: `Invoice with ID "${id}" not found` };
      }

      return invoice;
    },
  };
}

module.exports = { getInvoiceById };
