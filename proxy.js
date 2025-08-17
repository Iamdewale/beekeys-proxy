const express = require("express");
const axios = require("axios");
const cors = require("cors");
const multer = require("multer");
const FormData = require("form-data");
require("dotenv").config();

const app = express();

// -------------------------
// Middleware
// -------------------------
app.use(express.json());
app.use(
  cors({
    origin: process.env.REACT_APP_URL || "http://localhost:3000",
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

const upload = multer({ storage: multer.memoryStorage() });

// -------------------------
// Env Vars
// -------------------------
const {
  WP_USERNAME,
  WP_PASSWORD,
  WP_API_URL = "https://app.beekeys.com/wp-json/wp/v2",
  BEEKEYS_COOKIE = "",
  REACT_APP_URL = "http://localhost:3000",
} = process.env;

const wpToken = Buffer.from(`${WP_USERNAME}:${WP_PASSWORD}`).toString("base64");

// -------------------------
// Routes
// -------------------------

// Health check
app.get("/test", (req, res) => {
  res.json({ message: "✅ Proxy is working!" });
});

// Handle CORS preflight
app.options("*", (req, res) => {
  res.header("Access-Control-Allow-Origin", REACT_APP_URL);
  res.header("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type,Authorization");
  res.sendStatus(200);
});

/**
 * 🔹 Submit Listing → forwards data to Beekeys admin-ajax.php
 */
app.post("/submit", async (req, res) => {
  const formData = req.body;

  if (!formData) {
    return res.status(400).json({ error: "No data provided" });
  }

  try {
    const beekeysUrl =
      "https://app.beekeys.com/nigeria/wp-admin/admin-ajax.php";

    const form = new FormData();
    form.append("action", "geodir_add_listing");
    form.append("post_title", formData.title || "");
    form.append("post_content", formData.content || "");
    form.append("phone", formData.meta?.phone || "");
    form.append("email", formData.meta?.email || "");
    form.append("tags", formData.meta?.tags || "");
    form.append("slogan", formData.meta?.slogan || "");
    form.append("address", formData.meta?.address || "");

    // attach media IDs if any
    if (formData.meta?.mediaIds?.length > 0) {
      form.append("mediaIds", JSON.stringify(formData.meta.mediaIds));
    }

    const response = await axios.post(beekeysUrl, form, {
      headers: {
        ...form.getHeaders(),
        Cookie: BEEKEYS_COOKIE,
      },
    });

    res.json({ success: true, beekeysResponse: response.data });
  } catch (err) {
    console.error("❌ Error in /submit:", {
      message: err.message,
      status: err.response?.status,
      data: err.response?.data,
    });

    res.status(err.response?.status || 500).json({
      success: false,
      error: "Beekeys submission failed",
      details: err.response?.data || err.message,
    });
  }
});

/**
 * 🔹 Upload Media → forwards files to WP REST API /media
 */
app.post("/upload-media", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded" });
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
      success: false,
      error: "Failed to upload media",
      details: error.response?.data || error.message,
    });
  }
});

// -------------------------
// Start server
// -------------------------
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Proxy running on port ${PORT}`));
