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

// 🌍 Regions
app.get("/api/regions", async (req, res) => {
  try {
    const apiURL = "https://app.beekeys.com/nigeria/wp-json/geodir/v2/locations/regions";
    const response = await axios.get(apiURL);

    res.json({ success: true, data: response.data });
  } catch (err) {
    console.error("❌ Regions error:", err.message);
    res.status(500).json({ success: false, error: "Failed to fetch regions" });
  }
});

// 📍 Combined state details (region + markers)
app.get("/api/state-details/:slug", async (req, res) => {
  const slug = req.params.slug;

  try {
    // 1️⃣ Get regions list
    const regionsURL = "https://app.beekeys.com/nigeria/wp-json/geodir/v2/locations/regions";
    const regionsRes = await axios.get(regionsURL);
    const regions = Array.isArray(regionsRes.data) ? regionsRes.data : [];

    // 2️⃣ Try to find region
    let region = regions.find((r) => r.slug === slug);

    // Fallback: strip "-state"
    if (!region && slug.endsWith("-state")) {
      const fallbackSlug = slug.replace("-state", "");
      region = regions.find((r) => r.slug === fallbackSlug);
    }

    // Fallback: case-insensitive
    if (!region) {
      region = regions.find((r) => r.slug.toLowerCase() === slug.toLowerCase());
    }

    if (!region) {
      console.warn(`⚠️ No exact match for slug: ${slug}`);
      region = { id: null, name: slug.replace(/-/g, " "), slug };
    }

    // 3️⃣ Get markers
    const markersURL = `https://app.beekeys.com/nigeria/wp-json/geodir/v2/markers/?gd-ajax=1&post_type=gd_ems&country=nigeria&region=${slug}`;
    let markers = [];
    try {
      const markersRes = await axios.get(markersURL);
      markers = Array.isArray(markersRes.data) ? markersRes.data : [];
    } catch (err) {
      console.warn(`⚠️ Failed to fetch markers for ${slug}:`, err.message);
    }

    res.json({ success: true, region, markers });
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

// 🔎 Search businesses
app.get("/api/businesses", async (req, res) => {
  const { search } = req.query;

  try {
    const url = `https://app.beekeys.com/nigeria/wp-json/geodir/v2/listings?search=${encodeURIComponent(search || "")}`;
    const response = await axios.get(url);

    res.json({ success: true, results: response.data });
  } catch (err) {
    console.error("❌ Business search error:", err.message);
    res.status(500).json({ success: false, error: "Failed to search businesses" });
  }
});

// 🏢 Business details
app.get("/api/business/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const url = `https://app.beekeys.com/nigeria/wp-json/geodir/v2/single/${id}`;
    const response = await axios.get(url);

    res.json({ success: true, business: response.data || null });
  } catch (err) {
    console.error("❌ Business details error:", err.message);
    res.status(500).json({ success: false, error: "Failed to fetch business details" });
  }
});

// 📝 Form fields (Ninja Forms)
app.get("/form-fields/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const url = `https://app.beekeys.com/nigeria/wp-json/ninja-forms/v2/forms/${id}`;
    const response = await axios.get(url);

    res.json({ success: true, fields: response.data.fields || [] });
  } catch (err) {
    console.error("❌ Form fields error:", err.message);
    res.status(500).json({ success: false, error: "Failed to fetch form fields" });
  }
});

app.listen(PORT, () =>
  console.log(`✅ Proxy API running at http://localhost:${PORT}`)
);
