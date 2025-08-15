// server/proxy.js
const express = require("express");
const axios = require("axios");
const cors = require("cors");
const multer = require("multer");
require("dotenv").config();

const app = express();
app.use(express.json());
app.use(cors()); // Allow requests from your React app

// Multer setup for file uploads
const upload = multer({ storage: multer.memoryStorage() });

// WP API credentials from .env
const WP_USERNAME = process.env.WP_USERNAME;
const WP_PASSWORD = process.env.WP_PASSWORD;
const WP_API_URL = process.env.WP_API_URL; // e.g., https://app.beekeys.com/wp-json/wp/v2

// Auth token
const token = Buffer.from(`${WP_USERNAME}:${WP_PASSWORD}`).toString("base64");

/**
 * Create a new post
 */

// Add this before other routes
app.options("/submit", (req, res) => {
  res.header("Access-Control-Allow-Origin", "*"); // Adjust for security
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.sendStatus(200);
});

// Existing POST /submit
app.post("/submit", async (req, res) => {
  try {
    const response = await axios.post(`${WP_API_URL}/posts`, req.body, {
      headers: {
        Authorization: `Basic ${token}`,
        "Content-Type": "application/json",
      },
    });

    res.json(response.data);
  } catch (error) {
    console.error(error.response?.data || error.message);
    res.status(error.response?.status || 500).json(
      error.response?.data || { message: error.message }
    );
  }
});

// NEW — GET for quick browser testing
app.get("/submit", (req, res) => {
  res.json({ message: "Submit endpoint is alive — use POST to send data" });
});

/**
 * Upload media (images/files) to WordPress
 */
app.post("/upload-media", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const response = await axios.post(`${WP_API_URL}/media`, req.file.buffer, {
      headers: {
        Authorization: `Basic ${token}`,
        "Content-Disposition": `attachment; filename="${req.file.originalname}"`,
        "Content-Type": req.file.mimetype,
      },
    });

    res.json(response.data);
  } catch (error) {
    console.error(error.response?.data || error.message);
    res.status(error.response?.status || 500).json(
      error.response?.data || { message: error.message }
    );
  }
});

app.get("/test", (req, res) => {
  res.json({ message: "Proxy is working!" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Proxy server running on port ${PORT}`));
