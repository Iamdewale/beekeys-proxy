// server.js
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const axios = require("axios");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 10000;
const rateLimit = require("express-rate-limit");

const allowedOrigins = [
  "https://beekeys-home.vercel.app",
  "http://localhost:3000",
];

app.use(express.json());

// -------------------------
// Unsplash Config & Cache
// -------------------------
const UNSPLASH_KEY = process.env.UNSPLASH_KEY;
const imageCache = {}; // { "Lagos": { url, credit, lastFetched } }
const CACHE_TTL = 1000 * 60 * 60 * 24; // 24h

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
 * Frontend slug → API-recognised region name mapping
 */
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
 * Resolve a region object from slug, using mapping first, then API fallback
 */
async function resolveRegion(slug) {
  const mappedName = regionMap[slug];
  if (mappedName) {
    return { id: null, name: mappedName, slug: mappedName };
  }

  // Fallback: try matching against live /locations/regions
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

async function getStateImage(stateName) {
  const cached = imageCache[stateName];
  const isFresh = cached && (Date.now() - cached.lastFetched < CACHE_TTL);

  if (isFresh) return cached;

  try {
    const query = `${stateName} Nigeria`;
    const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&orientation=landscape&per_page=1&client_id=${UNSPLASH_KEY}`;

    const res = await axios.get(url);
    const first = res.data.results[0];

    const imgData = {
      url: first?.urls?.regular || null,
      credit: first
        ? { name: first.user?.name, link: first.user?.links?.html }
        : null,
      lastFetched: Date.now()
    };

    imageCache[stateName] = imgData;
    return imgData;
  } catch (err) {
    console.warn(`⚠️ Unsplash fetch failed for ${stateName}:`, err.message);
    return { url: null, credit: null, lastFetched: Date.now() };
  }
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


// 🌍 All regions with Unsplash thumbnails
app.get("/api/regions", async (_req, res) => {
  const rawRegions = await fetchJSON(`${BEEKEYS_BASE}/geodir/v2/locations/regions?per_page=50`);

  const data = await Promise.all(
    (rawRegions || []).map(async region => {
      const img = await getStateImage(region.name || region.title);
      return {
        ...region,
        thumbnail: img.url,
        credit: img.credit
      };
    })
  );

  res.json({ success: true, data });
});

// 📍 State details (region + merged markers)
app.get("/api/state-details/:slug", async (req, res) => {
  const { slug } = req.params;
  const region = await resolveRegion(slug);

  if (!region) {
    return res.status(404).json({ success: false, error: "Region not found", region: null, markers: [] });
  }

  // Use mapped name/slug directly
  const apiRegionParam = encodeURIComponent(region.name);

  // Fetch EMS and Listings in parallel
  const [emsRaw, listingsRaw] = await Promise.all([
    fetchJSON(`${BEEKEYS_BASE}/geodir/v2/markers/?gd-ajax=1&post_type=gd_ems&country=nigeria&region=${apiRegionParam}`, []),
    fetchJSON(`${BEEKEYS_BASE}/geodir/v2/listings?country=nigeria&region=${apiRegionParam}`, [])
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



// 📮 Submit form
if (!process.env.PROXY_SECRET) {
  throw new Error("Missing PROXY_SECRET in environment");
}
console.log("📥 Incoming payload:", req.body);

app.post("/submit-business", async (req, res) => {
  const proxySecret = req.headers["x-proxy-secret"];
  if (proxySecret !== process.env.PROXY_SECRET) {
    return res.status(403).json({ success: false, error: "Unauthorized" });
  }

  const {
    businessName,
    isCACRegistered,
    slogan,
    hasBranches,
    images,
    email,
    phone,
    website,
    address,
    tags,
    description,
    uploadedFiles = []
  } = req.body;

  if (!businessName || !email || !phone || !address) {
    return res.status(400).json({ success: false, error: "Missing required fields" });
  }

  try {
    const saved = {
      businessName,
      isCACRegistered,
      slogan,
      hasBranches,
      images,
      email,
      phone,
      website,
      address,
      tags,
      description,
      uploadedFiles,
      createdAt: new Date()
    };

    // TODO: Save to database or forward to another service
    console.log("✅ Business submitted:", saved);

    res.json({ success: true, data: saved });
  } catch (err) {
    console.error("❌ submit-business error:", err.message);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});



// 🆕 User registration proxy
app.post("/api/register", async (req, res) => {
  try {
    const wpRes = await axios.post(
      "https://app.beekeys.com/nigeria/wp-json/userswp/v1/register",
      {
        user_login: req.body.user_login,
        user_email: req.body.user_email,
        user_pass: req.body.user_pass,
        // Add any other required fields here
      },
      { headers: { "Content-Type": "application/json" } }
    );
    res.status(wpRes.status).json(wpRes.data);
  } catch (err) {
    res
      .status(err.response?.status || 500)
      .json(err.response?.data || { error: "Registration failed" });
  }
});
// Rate limiter: max 3 requests per 15 minutes per IP
const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3,
  message: {
    success: false,
    message: "Too many password reset requests from this IP, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// 🔑 Forgot Password proxy with rate limiting
app.post("/api/forgot-password", forgotPasswordLimiter, async (req, res) => {
  try {
    const wpRes = await axios.post(
      "https://app.beekeys.com/nigeria/wp-json/custom/v1/forgot-password",
      { user_login: req.body.user_login },
      { headers: { "Content-Type": "application/json" } }
    );
    res.status(wpRes.status).json(wpRes.data);
  } catch (err) {
    res.status(err.response?.status || 500)
       .json(err.response?.data || { message: "Reset failed" });
  }
});

// -------------------------
// Start Server
// -------------------------
app.listen(PORT, () => {
  console.log(`✅ Proxy API running at http://localhost:${PORT}`);
});
