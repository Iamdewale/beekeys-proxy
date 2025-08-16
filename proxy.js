const express = require("express");
const axios = require("axios");
const cors = require("cors");
const multer = require("multer");
require("dotenv").config();

const app = express();

// Middleware
app.use(express.json());
app.use(cors({
  origin: process.env.REACT_APP_URL || "*", // TODO: restrict to your frontend URL
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

// Multer setup for file uploads
const upload = multer({ storage: multer.memoryStorage() });

// 🔑 Env vars
const {
  WP_USERNAME,
  WP_PASSWORD,
  WP_API_URL = "https://app.beekeys.com/wp-json/wp/v2",
  BEEKEYS_COOKIE = "",
  REACT_APP_URL = "*",
} = process.env;

// WP Basic Auth token
const wpToken = Buffer.from(`${WP_USERNAME}:${WP_PASSWORD}`).toString("base64");


// -------------------------
// Routes
// -------------------------

// Health check
app.get("/test", (req, res) => {
  res.json({ message: "Proxy is working!" });
});

// Preflight (CORS) for /submit
app.options("/submit", (req, res) => {
  res.header("Access-Control-Allow-Origin", REACT_APP_URL);
  res.header("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.sendStatus(200);
});

/**
 * 🔹 Submit Route → forwards data to Beekeys admin-ajax.php
 */
app.post("/submit", async (req, res) => {
  const formData = req.body;

  if (!formData || Object.keys(formData).length === 0) {
    return res.status(400).json({ error: "No data provided" });
  }

  console.log("📨 Received submission:", formData);

  try {
    const beekeysUrl = "https://app.beekeys.com/nigeria/wp-admin/admin-ajax.php";
    const params = new URLSearchParams({ action: "submit_form" });

    // Flatten data into WP-style params
    Object.entries(formData).forEach(([key, value]) => {
      if (typeof value === "object" && value !== null) {
        Object.entries(value).forEach(([metaKey, metaValue]) => {
          params.append(`meta[${metaKey}]`, metaValue);
        });
      } else {
        params.append(key, value);
      }
    });

    const response = await axios.post(beekeysUrl, params.toString(), {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Cookie": BEEKEYS_COOKIE, // 🔑 must be set in Render env vars
        "User-Agent": "Mozilla/5.0",
      },
      timeout: 10000,
    });

    console.log("✅ Beekeys response:", response.status, response.data);

    res.json({ success: true, beekeysResponse: response.data });
  } catch (error) {
    console.error("❌ Error forwarding to Beekeys:", {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
    });
    res.status(error.response?.status || 500).json({
      error: "Failed to submit to Beekeys",
      details: error.message,
    });
  }
});

/**
 * 🔹 Upload Media → forwards to WP REST API /media
 */
app.post("/upload-media", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const response = await axios.post(`${WP_API_URL}/media`, req.file.buffer, {
      headers: {
        Authorization: `Basic ${wpToken}`,
        "Content-Disposition": `attachment; filename="${req.file.originalname}"`,
        "Content-Type": req.file.mimetype,
      },
    });

    console.log("📤 Media uploaded:", response.data.id);

    res.json({ success: true, media: response.data });
  } catch (error) {
    console.error("❌ Media upload failed:", {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
    });
    res.status(error.response?.status || 500).json({
      error: "Failed to upload media",
      details: error.message,
    });
  }
});

// -------------------------
// Start server
// -------------------------
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Proxy running on port ${PORT}`));
