const express = require("express");
const axios = require("axios");
const cors = require("cors");
const multer = require("multer");
require("dotenv").config();

const app = express();

// Middleware
app.use(express.json());
app.use(cors({
  origin: process.env.REACT_APP_URL || "*", // Restrict to your React app URL
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

// Multer setup for file uploads
const upload = multer({ storage: multer.memoryStorage() });

// WP API and Beekeys credentials from .env
const WP_USERNAME = process.env.WP_USERNAME;
const WP_PASSWORD = process.env.WP_PASSWORD;
const WP_API_URL = process.env.WP_API_URL || "https://app.beekeys.com/wp-json/wp/v2";
const BEEKEYS_COOKIE = process.env.BEEKEYS_COOKIE || "";
const REACT_APP_URL = process.env.REACT_APP_URL || "*";

// Auth token for WP REST API
const wpToken = Buffer.from(`${WP_USERNAME}:${WP_PASSWORD}`).toString("base64");

// --- Test Route
app.get("/test", (req, res) => {
  res.json({ message: "Proxy is working!" });
});

// --- OPTIONS Handler for CORS
app.options("/submit", (req, res) => {
  res.header("Access-Control-Allow-Origin", REACT_APP_URL);
  res.header("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.sendStatus(200);
});

// --- Submit Route (forward to Beekeys admin-ajax.php)
app.post("/submit", async (req, res) => {
  const formData = req.body;

  if (!formData || Object.keys(formData).length === 0) {
    return res.status(400).json({ error: "No data provided" });
  }

  try {
    const beekeysUrl = "https://app.beekeys.com/nigeria/wp-admin/admin-ajax.php";
    const params = new URLSearchParams({ action: "submit_form" }); // Add action

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
        "Cookie": BEEKEYS_COOKIE,
        "User-Agent": "Mozilla/5.0",
      },
    });

    if (response.status !== 200) {
      throw new Error(`Unexpected status: ${response.status}`);
    }

    res.json({ success: true, beekeysResponse: response.data });
  } catch (error) {
    console.error("Error forwarding to Beekeys:", {
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

// --- Upload Media Route (WP REST API)
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

    res.json({ success: true, media: response.data });
  } catch (error) {
    console.error("Media upload failed:", {
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

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Proxy server running on port ${PORT}`));