const { z } = require("zod");
const User = require("../../models/User");

function listUsers(tenantId) {
  return {
    description:
      "List team members with optional role filter. " +
      "Use this when a user asks about their team, who is working, " +
      "or needs to find a user ID.",
    parameters: z.object({
      role: z
        .string()
        .optional()
        .describe("Filter by role (owner, director, manager_operations, manager_hr, staff, worker)"),
      isActive: z
        .boolean()
        .optional()
        .describe("Filter by active status"),
    }),
    execute: async ({ role, isActive }) => {
      const filter = { tenantId };

      if (role) filter.role = role;
      if (isActive !== undefined) filter.isActive = isActive;

      const results = await User.find(filter)
        .select("firstName lastName email role isActive phone preferredLanguage")
        .lean();

      if (results.length === 0) {
        return { message: "No users found matching your filters" };
      }

      return results;
    },
  };
}

module.exports = { listUsers };
