const express = require("express");
const cors = require("cors");
const multer = require("multer");
const axios = require("axios");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 10000;

// -------------------------
// Middleware
// -------------------------
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
// Helpers
// -------------------------
const BEEKEYS_BASE = "https://app.beekeys.com/nigeria/wp-json";

// Generic fetch wrapper
async function fetchJSON(url, fallback = []) {
  try {
    const res = await axios.get(url);
    return res.data || fallback;
  } catch (err) {
    console.warn(`⚠️ Fetch failed [${url}]:`, err.message);
    return fallback;
  }
}

// Resolve region by slug
async function resolveRegion(slug) {
  const regions = await fetchJSON(`${BEEKEYS_BASE}/geodir/v2/locations/regions`, []);
  if (!regions.length) return null;

  let region =
    regions.find((r) => r.slug === slug) ||
    (slug.endsWith("-state") && regions.find((r) => r.slug === slug.replace("-state", ""))) ||
    regions.find((r) => r.slug.toLowerCase() === slug.toLowerCase());

  if (!region) {
    console.warn(`⚠️ No exact match for slug: ${slug}`);
    return { id: null, name: slug.replace(/-/g, " "), slug };
  }

  return region;
}

// -------------------------
// Routes
// -------------------------

// 🌍 Regions
app.get("/api/regions", async (_req, res) => {
  const data = await fetchJSON(`${BEEKEYS_BASE}/geodir/v2/locations/regions`);
  res.json({ success: true, data });
});

// 📍 State details (region + markers)
app.get("/api/state-details/:slug", async (req, res) => {
  const { slug } = req.params;

  try {
    // 1. Resolve the region
    const region = await resolveRegion(slug);
    if (!region) {
      return res.status(404).json({
        success: false,
        error: `Region not found for slug: ${slug}`,
        region: null,
        markers: []
      });
    }

    // 2. Make sure we use the correct WP/GeoDir slug
    const regionSlug = (region.slug || slug).replace(/-state$/, "");

    // 3. Fetch markers from Beekeys WP API
    const rawMarkers = await fetchJSON(
      `${BEEKEYS_BASE}/geodir/v2/markers/?gd-ajax=1&post_type=gd_ems&country=nigeria&region=${regionSlug}`,
      []
    );

    // 4. Normalize marker shape
    const markers = rawMarkers.map(m => ({
      id: m.id,
      title: m.title?.rendered || m.title || "Untitled",
      lat: parseFloat(m.lat || m.latitude || 0),
      lng: parseFloat(m.lng || m.longitude || 0),
      icon: m.icon || null
    })).filter(m => m.lat && m.lng); // drop invalid coords

    // 5. Return to frontend
    res.json({
      success: true,
      region,
      markers
    });

  } catch (err) {
    console.error("❌ State details error:", err.message);
    res.status(500).json({
      success: false,
      error: "Failed to fetch state details",
      region: null,
      markers: []
    });
  }
});


// 🔎 Search businesses
app.get("/api/businesses", async (req, res) => {
  const { search } = req.query;
  const results = await fetchJSON(
    `${BEEKEYS_BASE}/geodir/v2/listings?search=${encodeURIComponent(search || "")}`
  );
  res.json({ success: true, results });
});

// 🏢 Business details
app.get("/api/business/:id", async (req, res) => {
  const { id } = req.params;
  const business = await fetchJSON(`${BEEKEYS_BASE}/geodir/v2/single/${id}`, null);
  res.json({ success: true, business });
});

// 📝 Form fields (Ninja Forms)
app.get("/form-fields/:id", async (req, res) => {
  const { id } = req.params;
  const form = await fetchJSON(`${BEEKEYS_BASE}/ninja-forms/v2/forms/${id}`, {});
  res.json({ success: true, fields: form.fields || [] });
});

// -------------------------
// Start Server
// -------------------------
app.listen(PORT, () =>
  console.log(`✅ Proxy API running at http://localhost:${PORT}`)
);
