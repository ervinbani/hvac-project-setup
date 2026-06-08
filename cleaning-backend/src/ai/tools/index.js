const { searchCustomers } = require("./searchCustomers");
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

  return {
    // Read tools (no confirmation needed)
    searchCustomers: searchCustomers(tenantId),
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
}

module.exports = { buildTools };
