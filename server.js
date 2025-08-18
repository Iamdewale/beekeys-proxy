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
app.get("/api/markers/:slug", async (req, res) => {
  const slug = req.params.slug;
  const url = `https://app.beekeys.com/nigeria/wp-json/geodir/v2/markers/?gd-ajax=1&post_type=gd_ems&country=nigeria&region=${slug}`;
  try {
    const response = await axios.get(url);
    res.json({ success: true, data: response.data });
  } catch (err) {
    console.error("❌ Markers error:", err.message);
    res.status(500).json({ success: false, error: "Failed to fetch markers" });
  }
});

// 🔹 Combined state details (region + markers)
app.get("/api/state-details/:slug", async (req, res) => {
  try {
    const { slug } = req.params;

    // Get regions list
    const regionsRes = await axios.get(
      "https://app.beekeys.com/nigeria/wp-json/geodir/v2/locations/regions"
    );
    const regions = regionsRes.data || [];
    const region = regions.find((r) => r.slug === slug);

    // Get markers for this region
    const markersRes = await axios.get(
      `https://app.beekeys.com/nigeria/wp-json/geodir/v2/markers/?gd-ajax=1&post_type=gd_ems&country=nigeria&region=${slug}`
    );

    res.json({
      success: true,
      region,
      markers: markersRes.data || [],
    });
  } catch (err) {
    console.error("❌ State details error:", err.message);
    res.status(500).json({ success: false, error: "Failed to fetch state details" });
  }
});

app.listen(PORT, () =>
  console.log(`✅ Proxy API running at http://localhost:${PORT}`)
);
