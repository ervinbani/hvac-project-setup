const { searchCustomers } = require("./searchCustomers");
const { listCustomers } = require("./listCustomers");
const { searchJobs } = require("./searchJobs");
const { getInvoiceById } = require("./getInvoiceById");
const { searchServices } = require("./searchServices");
const { listUsers } = require("./listUsers");
const { createCustomer } = require("./createCustomer");
const { createJob } = require("./createJob");
const { updateJobStatus } = require("./updateJobStatus");
const { createInvoice } = require("./createInvoice");
const { confirmAction } = require("./confirmAction");
const { getRoleScoping } = require("../../config/roleScoping");
const { zodSchema } = require("ai");

/**
 * Builds the tools object for the Vercel AI SDK.
 * Each tool receives req.user context via closure (tenantId, userId, role).
 *
 * @param {object} req - Express request object (used for req.user)
 * @returns {object} Tools object for generateText({ tools })
 */
function buildTools(req) {
  const { tenantId, id: userId, role } = req.user;
  const scoping = getRoleScoping(role);

  const rawTools = {
    // Read tools (no confirmation needed)
    searchCustomers: searchCustomers(tenantId),
    listCustomers: listCustomers(tenantId),
    searchJobs: searchJobs(tenantId, scoping, userId),
    getInvoiceById: getInvoiceById(tenantId),
    searchServices: searchServices(tenantId),
    listUsers: listUsers(tenantId),

    // Write tools (return pending + JWT, need confirmAction to execute)
    createCustomer: createCustomer(tenantId, scoping),
    createJob: createJob(tenantId, userId, scoping),
    updateJobStatus: updateJobStatus(tenantId, scoping),
    createInvoice: createInvoice(tenantId, userId, scoping),

    // Confirmation tool (executes the pending action)
    confirmAction: confirmAction(tenantId, scoping),
  };

  // ai SDK v6 requires tools to have inputSchema as a wrapped schema object.
  // Use zodSchema() to convert the Zod schema, then strip $schema URL which
  // can cause OpenAI function-calling validation errors.
  return Object.fromEntries(
    Object.entries(rawTools).map(([name, t]) => {
      const { parameters, ...rest } = t;
      const converted = zodSchema(parameters);
      // Remove $schema field — OpenAI's function calling API does not expect it
      const { $schema: _unused, ...cleanJsonSchema } = converted.jsonSchema;
      return [name, { ...rest, inputSchema: { ...converted, jsonSchema: cleanJsonSchema } }];
    }),
  );
}

module.exports = { buildTools };
