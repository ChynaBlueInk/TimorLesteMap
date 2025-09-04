// lib/places.ts
// Types + complete data list for Timor-Leste places as per timorleste.tl

export type PlaceCategory = "municipality" | "popular" | "park";

export interface Place {
  id: string;                 // kebab-case slug (unique)
  name: string;               // display name
  category: PlaceCategory;    // "municipality" | "popular" | "park"
  municipalities?: string[];  // e.g., ["Dili"] or ["Baucau","Viqueque"]
  summary?: string;           // short blurb for cards
  tags?: string[];            // e.g., ["diving","beach"]
  sourceUrl?: string;         // URL on timorleste.tl
}

// ---- Source URLs (to keep things tidy) ----
const MUNICIPALITIES_URL = "https://www.timorleste.tl/destinations/municipalities/";
const POPULAR_URL = "https://www.timorleste.tl/destinations/popular-locations/";
const PROTECTED_URL = "https://www.timorleste.tl/destinations/protected-areas/";
const NATIONAL_PARK_URL = "https://www.timorleste.tl/destinations/national-park/";

// ---- Data ----
// A) Municipalities (13) — listed on the Municipalities page
// Aileu, Ainaro, Baucau, Bobonaro, Covalima, Dili, Ermera, Lautém, Liquiçá, Manatuto, Manufahi, Oecusse-Ambeno, Viqueque
export const MUNICIPALITIES: Place[] = [
  { id: "aileu", name: "Aileu", category: "municipality", sourceUrl: MUNICIPALITIES_URL },
  { id: "ainaro", name: "Ainaro", category: "municipality", sourceUrl: MUNICIPALITIES_URL },
  { id: "baucau", name: "Baucau", category: "municipality", sourceUrl: MUNICIPALITIES_URL },
  { id: "bobonaro", name: "Bobonaro", category: "municipality", sourceUrl: MUNICIPALITIES_URL },
  { id: "covalima", name: "Covalima", category: "municipality", sourceUrl: MUNICIPALITIES_URL },
  { id: "dili", name: "Dili", category: "municipality", sourceUrl: MUNICIPALITIES_URL },
  { id: "ermera", name: "Ermera", category: "municipality", sourceUrl: MUNICIPALITIES_URL },
  { id: "lautem", name: "Lautém", category: "municipality", sourceUrl: MUNICIPALITIES_URL },
  { id: "liquica", name: "Liquiçá", category: "municipality", sourceUrl: MUNICIPALITIES_URL },
  { id: "manatuto", name: "Manatuto", category: "municipality", sourceUrl: MUNICIPALITIES_URL },
  { id: "manufahi", name: "Manufahi", category: "municipality", sourceUrl: MUNICIPALITIES_URL },
  { id: "oecusse-ambeno", name: "Oecusse-Ambeno", category: "municipality", sourceUrl: MUNICIPALITIES_URL },
  { id: "viqueque", name: "Viqueque", category: "municipality", sourceUrl: MUNICIPALITIES_URL },
];

// B) Popular Locations (11) — listed on Popular Locations page
export const POPULAR_LOCATIONS: Place[] = [
  {
    id: "atauro",
    name: "Atauro (Island)",
    category: "popular",
    municipalities: ["Dili"], // site shows “Municipality: Atauro (Dili)”
    tags: ["diving", "snorkelling", "beach"],
    sourceUrl: POPULAR_URL,
    summary: "World-class reefs, relaxed island vibe, easy boat access from Dili.",
  },
  {
    id: "balibo",
    name: "Balibó",
    category: "popular",
    municipalities: ["Bobonaro"],
    tags: ["heritage", "fort"],
    sourceUrl: POPULAR_URL,
    summary: "Hill-town near the border; fort, history, and sweeping views.",
  },
  {
    id: "baucau-town",
    name: "Baucau (Old Town & Beaches)",
    category: "popular",
    municipalities: ["Baucau"],
    tags: ["architecture", "beach"],
    sourceUrl: POPULAR_URL,
    summary: "Colonial architecture, spring-fed pool, coastline of white-sand coves.",
  },
  {
    id: "com",
    name: "Com",
    category: "popular",
    municipalities: ["Lautém"],
    tags: ["beach", "fishing-village"],
    sourceUrl: POPULAR_URL,
    summary: "Serene fishing village on the edge of Nino Konis Santana NP.",
  },
  {
    id: "jaco-valu-tutuala",
    name: "Jaco / Valu / Tutuala",
    category: "popular",
    municipalities: ["Lautém"],
    tags: ["island", "diving", "snorkelling", "caves"],
    sourceUrl: POPULAR_URL,
    summary: "Sacred Jaco Island opposite Valu; caves and forests of the NP.",
  },
  {
    id: "maubara-liquica",
    name: "Maubara & Liquiçá",
    category: "popular",
    municipalities: ["Liquiçá"],
    tags: ["coast", "fort", "weaving"],
    sourceUrl: POPULAR_URL,
    summary: "Coastal towns west of Dili; fort, basket weavers, easy swimming.",
  },
  {
    id: "mt-ramelau-hato-builico",
    name: "Mt Ramelau & Hato Builico",
    category: "popular",
    municipalities: ["Ainaro"],
    tags: ["hiking", "sunrise"],
    sourceUrl: POPULAR_URL,
    summary: "Guided hike from Hato Builico to Timor-Leste’s highest peak.",
  },
  {
    id: "maubisse",
    name: "Maubisse",
    category: "popular",
    municipalities: ["Ainaro"],
    tags: ["mountain-town", "coffee"],
    sourceUrl: POPULAR_URL,
    summary: "Cool ridge-top town; walks to traditional villages; classic pousada.",
  },
  {
    id: "marobo",
    name: "Marobo (Hot Springs)",
    category: "popular",
    municipalities: ["Bobonaro"],
    tags: ["hot-springs", "mountain"],
    sourceUrl: POPULAR_URL,
    summary: "Geothermal pools near Maliana/Balibó with valley views.",
  },
  {
    id: "loi-hunu-mundo-perdido-mt-matebian",
    name: "Loi Hunu / Mundo Perdido / Mt Matebian",
    category: "popular",
    municipalities: ["Baucau", "Viqueque"],
    tags: ["hiking", "rainforest", "birding", "mountain"],
    sourceUrl: POPULAR_URL,
    summary: "Lush valleys, rainforest hikes, caves, and the 2315 m Matebian massif.",
  },
  {
    id: "same",
    name: "Same",
    category: "popular",
    municipalities: ["Manufahi"],
    tags: ["river", "hiking", "heritage"],
    sourceUrl: POPULAR_URL,
    summary: "Rivers and black-sand coast access; hike nearby Mt Kablaki.",
  },
];

// C) Parks & Protected Areas (6) — per Protected Areas + National Park pages
export const PROTECTED_AREAS: Place[] = [
  {
    id: "nino-konis-santana",
    name: "Nino Konis Santana National Park",
    category: "park",
    municipalities: ["Lautém"],
    tags: ["national-park", "marine"],
    sourceUrl: NATIONAL_PARK_URL,
    summary: "Covers the far east tip incl. Jaco & Lake Ira Lalaro; land + marine zone.",
  },
  {
    id: "mpa-com",
    name: "Marine Protected Area — Com",
    category: "park",
    municipalities: ["Lautém"],
    tags: ["marine", "reef"],
    sourceUrl: PROTECTED_URL,
  },
  {
    id: "mpa-tutuala",
    name: "Marine Protected Area — Tutuala",
    category: "park",
    municipalities: ["Lautém"],
    tags: ["marine", "reef"],
    sourceUrl: PROTECTED_URL,
  },
  {
    id: "mpa-lore",
    name: "Marine Protected Area — Lore",
    category: "park",
    municipalities: ["Lautém"],
    tags: ["marine", "reef"],
    sourceUrl: PROTECTED_URL,
  },
  {
    id: "mpa-maubara",
    name: "Marine Protected Area — Maubara",
    category: "park",
    municipalities: ["Liquiçá"],
    tags: ["marine", "reef"],
    sourceUrl: PROTECTED_URL,
  },
  {
    id: "mpa-vila-maumeta-atauro",
    name: "Marine Protected Area — Vila-Maumeta (Atauro)",
    category: "park",
    municipalities: ["Dili"],
    tags: ["marine", "reef"],
    sourceUrl: PROTECTED_URL,
    summary: "Designation noted as being finalised on the site.",
  },
];

// Master list (use this in pages)
export const PLACES: Place[] = [
  ...MUNICIPALITIES,
  ...POPULAR_LOCATIONS,
  ...PROTECTED_AREAS,
];




