const { z } = require("zod");
const Service = require("../../models/Service");

function searchServices(tenantId) {
  return {
    description:
      "List available services with optional name search. " +
      "Use this when a user asks what services are offered, " +
      "or needs to find a service ID before creating a job.",
    parameters: z.object({
      search: z
        .string()
        .optional()
        .describe("Search for a service by name"),
    }),
    execute: async ({ search }) => {
      const filter = { tenantId, isActive: true };

      if (search) {
        filter.$or = [
          { "name.en": new RegExp(search, "i") },
          { "name.es": new RegExp(search, "i") },
        ];
      }

      const results = await Service.find(filter)
        .select("name.en name.es description basePrice priceUnit durationMinutes")
        .lean();

      if (results.length === 0) {
        return {
          message: search
            ? `No services found matching "${search}"`
            : "No services available",
        };
      }

      return results;
    },
  };
}

module.exports = { searchServices };
