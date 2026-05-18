/**
 * Master list of all languages available in the system.
 * The frontend fetches this to show the "add language" picker.
 * Each tenant then stores its own enabled/default state in Tenant.languages[].
 */
const AVAILABLE_LANGUAGES = [
  { lang: "en", label: "English" },
  { lang: "es", label: "Spanish" },
  { lang: "it", label: "Italian" },
  { lang: "sq", label: "Albanian" },
  { lang: "fr", label: "French" },
  { lang: "de", label: "German" },
  { lang: "pt", label: "Portuguese" },
  { lang: "zh", label: "Chinese" },
  { lang: "ar", label: "Arabic" },
  { lang: "ru", label: "Russian" },
];

const AVAILABLE_LANG_CODES = AVAILABLE_LANGUAGES.map((l) => l.lang);

/**
 * Default language configuration seeded on every new tenant.
 * English is the only default; Spanish is active but not default.
 */
const DEFAULT_TENANT_LANGUAGES = [
  { lang: "en", label: "English", active: true, isDefault: true },
  { lang: "es", label: "Spanish", active: true, isDefault: false },
];

module.exports = {
  AVAILABLE_LANGUAGES,
  AVAILABLE_LANG_CODES,
  DEFAULT_TENANT_LANGUAGES,
};
