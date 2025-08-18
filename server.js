// server.js

const express = require("express");
const cors = require("cors");
const multer = require("multer");
const axios = require("axios");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 10000;

const allowedOrigins = [
  "https://beekeys-home.vercel.app",
  "http://localhost:3000",
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

app.use(express.json());
const upload = multer({ storage: multer.memoryStorage() });

// -------------------------
// Config & Helpers
// -------------------------
const BEEKEYS_BASE = "https://app.beekeys.com/nigeria/wp-json";

/**
 * Fetch JSON from an external URL with error handling
 */
async function fetchJSON(url, fallback = []) {
  try {
    const res = await axios.get(url);
    return res.data || fallback;
  } catch (err) {
    console.warn(`⚠️ Fetch failed [${url}]:`, err.message);
    return fallback;
  }
}

/**
 * Resolve a region object from slug or name
 */
async function resolveRegion(slug) {
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
}

/**
 * Normalize marker data
 */
function normalizeMarkers(rawMarkers) {
  return (rawMarkers || [])
    .map(m => ({
      id: m.id,
      title: m.title?.rendered || m.title || "Untitled",
      lat: parseFloat(m.lat || m.latitude || 0),
      lng: parseFloat(m.lng || m.longitude || 0),
      icon: m.icon || null
    }))
    .filter(m => m.lat && m.lng);
}

// -------------------------
// Routes
// -------------------------

// 🌍 All regions
app.get("/api/regions", async (_req, res) => {
  const data = await fetchJSON(`${BEEKEYS_BASE}/geodir/v2/locations/regions`);
  res.json({ success: true, data });
});

// 📍 State details (region + merged markers)
app.get("/api/state-details/:slug", async (req, res) => {
  const { slug } = req.params;
  const region = await resolveRegion(slug);

  if (!region) {
    return res.status(404).json({ success: false, error: "Region not found", region: null, markers: [] });
  }

  const regionSlug = (region.slug || slug).replace(/-state$/, "").toLowerCase();

  // Fetch EMS and Listings in parallel
  const [emsRaw, listingsRaw] = await Promise.all([
    fetchJSON(`${BEEKEYS_BASE}/geodir/v2/markers/?gd-ajax=1&post_type=gd_ems&country=nigeria&region=${regionSlug}`, []),
    fetchJSON(`${BEEKEYS_BASE}/geodir/v2/listings?country=nigeria&region=${regionSlug}`, [])
  ]);

  const ems = normalizeMarkers(emsRaw);
  const listings = normalizeMarkers(listingsRaw);

  // Merge unique markers by ID
  const markersMap = new Map();
  [...ems, ...listings].forEach(m => markersMap.set(m.id, m));
  let markers = Array.from(markersMap.values());

  // Fallback if no data found
  if (!markers.length) {
    markers = [
      { id: 1, title: `Sample Service in ${region.name}`, lat: 9.0820, lng: 8.6753 }
    ];
  }

  res.json({ success: true, region, markers });
});

// 🔎 Search businesses
app.get("/api/businesses", async (req, res) => {
  const { search } = req.query;
  const results = await fetchJSON(
    `${BEEKEYS_BASE}/geodir/v2/listings?search=${encodeURIComponent(search || "")}`
  );
  res.json({ success: true, results });
});

// 🏢 Single business details
app.get("/api/business/:id", async (req, res) => {
  const { id } = req.params;
  const business = await fetchJSON(`${BEEKEYS_BASE}/geodir/v2/single/${id}`, null);
  res.json({ success: true, business });
});

// 📝 Form fields
app.get("/form-fields/:id", async (req, res) => {
  const { id } = req.params;
  const form = await fetchJSON(`${BEEKEYS_BASE}/ninja-forms/v2/forms/${id}`, {});
  res.json({ success: true, fields: form.fields || [] });
});

// -------------------------
// Start Server
// -------------------------
app.listen(PORT, () => {
  console.log(`✅ Proxy API running at http://localhost:${PORT}`);
});
