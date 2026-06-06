const BUSINESS_PROMPTS = {
  cleaning: {
    platform: "professional cleaning company",
    professionals: "managers, staff and cleaners",
    terms: {
      job: "cleaning job",
      customer: "client",
      worker: "cleaner",
    },
  },
  hvac: {
    platform: "HVAC service company",
    professionals: "managers, technicians and dispatchers",
    terms: {
      job: "service call",
      customer: "customer",
      worker: "technician",
    },
  },
  plumbing: {
    platform: "plumbing service company",
    professionals: "managers, plumbers and dispatchers",
    terms: {
      job: "service call",
      customer: "customer",
      worker: "plumber",
    },
  },
  landscaping: {
    platform: "landscaping company",
    professionals: "managers, gardeners and crew",
    terms: {
      job: "landscaping project",
      customer: "client",
      worker: "gardener",
    },
  },
  electrical: {
    platform: "electrical services company",
    professionals: "managers, electricians and dispatchers",
    terms: {
      job: "electrical service call",
      customer: "customer",
      worker: "electrician",
    },
  },
  painting: {
    platform: "painting company",
    professionals: "managers, painters and crew",
    terms: {
      job: "painting project",
      customer: "client",
      worker: "painter",
    },
  },
};

function getBusinessPrompt(businessType) {
  return BUSINESS_PROMPTS[businessType] || BUSINESS_PROMPTS.cleaning;
}

module.exports = { getBusinessPrompt, BUSINESS_PROMPTS };
