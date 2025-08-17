// server.js
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const FormData = require("form-data");
const axios = require("axios");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 10000;

// ✅ Allowed origins
const allowedOrigins = [
  "https://beekeys-home.vercel.app",
  "http://localhost:3000"
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

// Multer for file uploads
const upload = multer({ storage: multer.memoryStorage() });

const BEEKEYS_URL = "https://app.beekeys.com/nigeria/wp-admin/admin-ajax.php";

// ================== HELPERS ==================

// 🔹 Get NinjaForms nonce
async function getNonce(formId = "4") {
  const res = await axios.get(
    `${BEEKEYS_URL}?action=nf_get_form&form_id=${formId}`,
    { headers: { "User-Agent": "Mozilla/5.0" } }
  );
  return res.data?.settings?.key || res.data?.settings?.nonce;
}

// 🔹 Slugify fallback
function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w\-]+/g, "")
    .replace(/\-\-+/g, "-");
}

// ================== API ROUTES ==================

// 🌍 Regions
app.get("/api/regions", async (req, res) => {
  try {
    const apiURL =
      "https://app.beekeys.com/nigeria/wp-json/geodir/v2/locations/regions";
    const response = await axios.get(apiURL);
    const data = response.data;

    const regions = (Array.isArray(data) ? data : []).map((item) => ({
      id: item.id,
      title: item.title || item.name || "Unknown",
      slug: item.slug || slugify(item.title || item.name),
    }));

    res.json({ data: regions });
  } catch (err) {
    console.error("Error fetching regions:", err.message);
    res.status(500).json({ error: "Failed to fetch regions" });
  }
});

// 📍 Markers by region
app.get("/api/markers/:slug", async (req, res) => {
  const slug = req.params.slug;
  const url = `https://app.beekeys.com/nigeria/wp-json/geodir/v2/markers/?gd-ajax=1&post_type=gd_ems&country=nigeria&region=${slug}`;

  try {
    const response = await axios.get(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
    });

    const json = response.data;
    const markers =
      json.items?.map((item) => ({
        id: item.m,
        title: item.t,
        slug: item.s,
        lat: parseFloat(item.lt),
        lng: parseFloat(item.ln),
        icon: json.icons?.[item.i]?.i ?? null,
      })) || [];

    res.json({ data: markers });
  } catch (err) {
    console.error("Error fetching markers:", err.message);
    res.status(500).json({ error: "Failed to fetch markers" });
  }
});

// 🔎 Search businesses
app.get("/api/businesses", async (req, res) => {
  const { search } = req.query;
  if (!search) {
    return res.json({ data: [] });
  }

  try {
    const url = `https://app.beekeys.com/nigeria/wp-json/geodir/v2/listings/?s=${encodeURIComponent(
      search
    )}`;
    const response = await axios.get(url);

    const businesses =
      response.data?.items?.map((item) => ({
        id: item.ID,
        title: item.post_title,
        link: item.permalink,
        excerpt: item.post_excerpt,
      })) || [];

    res.json({ data: businesses });
  } catch (err) {
    console.error("Error searching businesses:", err.message);
    res.status(500).json({ error: "Failed to search businesses" });
  }
});

// 📝 Get Ninja Form fields dynamically
app.get("/form-fields/:formId", async (req, res) => {
  try {
    const { formId } = req.params;
    const response = await axios.get(
      `${BEEKEYS_URL}?action=nf_get_form&form_id=${formId}`,
      { headers: { "User-Agent": "Mozilla/5.0" } }
    );

    const fields =
      response.data?.fields?.map((f) => ({
        id: f.id,
        label: f.label,
        type: f.type,
      })) || [];

    res.json({ data: fields });
  } catch (err) {
    console.error("Error fetching form fields:", err.message);
    res.status(500).json({ error: "Failed to fetch form fields" });
  }
});

// 🚀 Submit Ninja Form
app.post("/submit-ninja", async (req, res) => {
  try {
    const { formData } = req.body;
    if (!formData) {
      return res.status(400).json({ success: false, error: "Missing formData" });
    }

    const nonce = await getNonce(formData.id || "4");

    const params = new URLSearchParams();
    params.append("action", "nf_ajax_submit");
    params.append("security", nonce);
    params.append("formData", JSON.stringify(formData));

    const response = await axios.post(BEEKEYS_URL, params.toString(), {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });

    res.json({ success: true, wpResponse: response.data });
  } catch (err) {
    console.error("Error submitting form:", err.message);
    res.status(500).json({ success: false, error: "Form submission failed" });
  }
});

// 📤 File upload (Ninja Forms upload field)
app.post("/upload-ninja", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: "No file uploaded" });
    }

    const form = new FormData();
    form.append("action", "nf_fu_upload");
    form.append("form_id", "4"); // 🔹 match your Ninja Form ID
    form.append("field_id", "164"); // 🔹 replace with correct file field ID
    form.append("file", req.file.buffer, req.file.originalname);

    const response = await axios.post(BEEKEYS_URL, form, {
      headers: form.getHeaders(),
    });

    res.json({ success: true, wpResponse: response.data });
  } catch (err) {
    console.error("Error uploading file:", err.message);
    res.status(500).json({ success: false, error: "File upload failed" });
  }
});

// ================== START SERVER ==================
app.listen(PORT, () =>
  console.log(`✅ Proxy API running at http://localhost:${PORT}`)
);
