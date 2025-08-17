const express = require("express");
const axios = require("axios");
const cors = require("cors");
const multer = require("multer");
const FormData = require("form-data");
require("dotenv").config();

const app = express();
app.use(express.json());
app.use(cors({
  origin: process.env.REACT_APP_URL || "http://localhost:3000",
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

const upload = multer({ storage: multer.memoryStorage() });

const {
  WP_USERNAME,
  WP_PASSWORD,
  WP_API_URL = "https://app.beekeys.com/wp-json/wp/v2",
  BEEKEYS_COOKIE = "",
  REACT_APP_URL = "http://localhost:3000",
} = process.env;

const wpToken = Buffer.from(`${WP_USERNAME}:${WP_PASSWORD}`).toString("base64");

// Health check
app.get("/test", (_, res) => res.json({ message: "✅ Proxy is working!" }));

// Handle CORS preflight
app.options("*", (req, res) => {
  res.header("Access-Control-Allow-Origin", REACT_APP_URL);
  res.header("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type,Authorization");
  res.sendStatus(200);
});

// --- Submit Route (forward to Beekeys admin-ajax.php)
app.post("/submit", async (req, res) => {
  try {
    const beekeysUrl = "https://app.beekeys.com/nigeria/wp-admin/admin-ajax.php";

    // Convert incoming JSON to form-urlencoded
    const params = new URLSearchParams();
    Object.entries(req.body).forEach(([key, value]) => {
      params.append(key, value);
    });

    const response = await axios.post(beekeysUrl, params.toString(), {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Cookie": BEEKEYS_COOKIE, // your auth session cookie
        "User-Agent": "Mozilla/5.0",
      },
    });

    res.json(response.data);
  } catch (error) {
    console.error("Error forwarding to Beekeys:", error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      error: "Failed to submit to Beekeys",
      details: error.response?.data || error.message,
    });
  }
});


// 🔹 Upload Media
app.post("/upload-media", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: "No file uploaded" });

    const form = new FormData();
    form.append("file", req.file.buffer, {
      filename: req.file.originalname,
      contentType: req.file.mimetype,
    });

    const response = await axios.post(`${WP_API_URL}/media`, form, {
      headers: { Authorization: `Basic ${wpToken}`, ...form.getHeaders() },
    });

    res.json({ success: true, media: response.data });
  } catch (error) {
    console.error("❌ Media upload failed:", error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      success: false,
      error: "Failed to upload media",
      details: error.response?.data || error.message,
    });
  }
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Proxy running on port ${PORT}`));
