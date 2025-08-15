// server/proxy.js
const express = require("express");
const axios = require("axios");
const cors = require("cors");
const multer = require("multer");
require("dotenv").config();

const app = express();
app.use(express.json());
app.use(cors());

// Multer setup
const upload = multer({ storage: multer.memoryStorage() });

// WP API credentials
const WP_USERNAME = process.env.WP_USERNAME;
const WP_PASSWORD = process.env.WP_PASSWORD;
const WP_API_URL = process.env.WP_API_URL;

// Auth token
const token = Buffer.from(`${WP_USERNAME}:${WP_PASSWORD}`).toString("base64");

// --- Test Route
app.get("/test", (req, res) => {
  res.json({ message: "Proxy is working!" });
});

// --- Submit Route (forward to Beekeys form handler)
app.post("/submit", async (req, res) => {
  const formData = req.body;

  if (!formData || Object.keys(formData).length === 0) {
    return res.status(400).json({ error: "No data provided" });
  }

  try {
    const beekeysUrl = "https://app.beekeys.com/nigeria/wp-admin/admin-ajax.php";

    const response = await axios.post(
      beekeysUrl,
      new URLSearchParams(formData).toString(),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Cookie": process.env.BEEKEYS_COOKIE || "",
          "User-Agent": "Mozilla/5.0",
        },
      }
    );

    res.json({ success: true, beekeysResponse: response.data });
  } catch (err) {
    console.error("Error forwarding to Beekeys:", err.message);
    res.status(500).json({ error: "Failed to submit to Beekeys" });
  }
});

// --- Upload Media Route
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

    res.json({ success: true, media: response.data });
  } catch (error) {
    console.error(error.response?.data || error.message);
    res.status(error.response?.status || 500).json(
      error.response?.data || { message: error.message }
    );
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Proxy server running on port ${PORT}`));
