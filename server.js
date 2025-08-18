// server.js
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const FormData = require("form-data");
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
    origin: function (origin, callback) {
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

const BEEKEYS_URL = "https://app.beekeys.com/nigeria/wp-admin/admin-ajax.php";

// 🌍 Regions
app.get("/api/regions", async (req, res) => {
  try {
    const apiURL =
      "https://app.beekeys.com/nigeria/wp-json/geodir/v2/locations/regions";
    const response = await axios.get(apiURL);

    res.json({ success: true, data: response.data });
  } catch (err) {
    console.error("❌ Regions error:", err.message);
    res.status(500).json({ success: false, error: "Failed to fetch regions" });
  }
});

// 📍 Markers by state
app.get("/api/state-details/:slug", async (req, res) => {
  const { slug } = req.params;

  try {
    // 1️⃣ Get all regions
    const regionsURL = "https://app.beekeys.com/nigeria/wp-json/geodir/v2/locations/regions";
    const regionsRes = await axios.get(regionsURL);
    const regions = Array.isArray(regionsRes.data) ? regionsRes.data : [];

    const region = regions.find(r => r.slug === slug);

    // 2️⃣ Get markers for this region
    const markersURL = `https://app.beekeys.com/nigeria/wp-json/geodir/v2/markers/?gd-ajax=1&post_type=gd_ems&country=nigeria&region=${slug}`;
    const markersRes = await axios.get(markersURL);
    const markers = Array.isArray(markersRes.data) ? markersRes.data : [];

    res.json({
      success: true,
      region: region || { slug, name: slug.replace(/-/g, " ") },
      markers
    });

  } catch (err) {
    console.error("❌ State details error:", err.message);
    res.status(500).json({ success: false, error: "Failed to fetch state details" });
  }
});



// 🔹 Combined state details (region + markers)
app.get("/api/state-details/:slug", async (req, res) => {
  const slug = req.params.slug;

  try {
    // 1️⃣ Get region info from WP
    const regionsURL =
      "https://app.beekeys.com/nigeria/wp-json/geodir/v2/locations/regions";
    const regionsRes = await axios.get(regionsURL);
    const regions = Array.isArray(regionsRes.data) ? regionsRes.data : [];

    // Find the region by slug
    const region = regions.find((r) => r.slug === slug) || null;
    if (!region) {
      console.warn(`⚠️ No region details for ${slug}, skipping…`);
    }

    // 2️⃣ Get markers (business listings) for this region
    const markersURL = `https://app.beekeys.com/nigeria/wp-json/geodir/v2/markers/?gd-ajax=1&post_type=gd_ems&country=nigeria&region=${slug}`;
    let markers = [];
    try {
      const markersRes = await axios.get(markersURL);
      markers = Array.isArray(markersRes.data) ? markersRes.data : [];
    } catch (err) {
      console.warn(`⚠️ Failed to fetch markers for ${slug}:`, err.message);
    }

    // ✅ Always respond in the same shape
    res.json({
      success: true,
      region,   // { id, name, slug, ... } or null
      markers,  // [] if none found
    });
  } catch (err) {
    console.error("❌ State details error:", err.message);
    res.status(500).json({
      success: false,
      error: "Failed to fetch state details",
      region: null,
      markers: [],
    });
  }
});

// 🏢 Business details
app.get("/api/business/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const url = `https://app.beekeys.com/nigeria/wp-json/geodir/v2/single/${id}`;
    const response = await axios.get(url);

    // Normalize structure
    res.json({
      success: true,
      business: response.data || null,
    });
  } catch (err) {
    console.error("❌ Business details error:", err.message);
    res.status(500).json({ success: false, error: "Failed to fetch business details" });
  }
});




app.listen(PORT, () =>
  console.log(`✅ Proxy API running at http://localhost:${PORT}`)
);
