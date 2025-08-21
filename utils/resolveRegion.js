const fetchJSON = require("./fetchJSON");

const BEEKEYS_BASE = "https://app.beekeys.com/nigeria/wp-json";

const regionMap = {
  "abia-state": "Abia",
  "adamawa-state": "Adamawa",
  "akwa-ibom-state": "Akwa Ibom",
  "anambra-state": "Anambra",
  "bauchi-state": "Bauchi",
  "bayelsa-state": "Bayelsa",
  "benue-state": "Benue",
  "borno-state": "Borno",
  "cross-river-state": "Cross River",
  "delta-state": "Delta",
  "ebonyi-state": "Ebonyi",
  "edo-state": "Edo",
  "ekiti-state": "Ekiti",
  "enugu-state": "Enugu",
  "gombe-state": "Gombe",
  "imo-state": "Imo",
  "jigawa-state": "Jigawa",
  "kaduna-state": "Kaduna",
  "kano-state": "Kano",
  "katsina-state": "Katsina",
  "kebbi-state": "Kebbi",
  "kogi-state": "Kogi",
  "kwara-state": "Kwara",
  "lagos-state": "Lagos",
  "nasarawa-state": "Nasarawa",
  "niger-state": "Niger",
  "ogun-state": "Ogun",
  "ondo-state": "Ondo",
  "osun-state": "Osun",
  "oyo-state": "Oyo",
  "plateau-state": "Plateau",
  "rivers-state": "Rivers",
  "sokoto-state": "Sokoto",
  "taraba-state": "Taraba",
  "yobe-state": "Yobe",
  "zamfara-state": "Zamfara",
  "fct-abuja": "Federal Capital Territory"
};

module.exports = async function resolveRegion(slug) {
  const mappedName = regionMap[slug];
  if (mappedName) {
    return { id: null, name: mappedName, slug: mappedName };
  }

  const regions = await fetchJSON(`${BEEKEYS_BASE}/geodir/v2/locations/regions`, []);
  if (!regions.length) return null;

  const cleanSlug = slug.replace(/-state$/, "").toLowerCase();
  const cleanName = cleanSlug.replace(/-/g, " ");

  return (
    regions.find(r => r.slug.toLowerCase() === slug.toLowerCase()) ||
    regions.find(r => r.slug.toLowerCase() === cleanSlug) ||
    regions.find(r => r.name.toLowerCase() === cleanName) ||
    { id: null, name: slug.replace(/-/g, " "), slug: cleanSlug }
  );
};
