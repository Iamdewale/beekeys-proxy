const express = require("express");
const cors = require("cors");
const multer = require("multer");
const FormData = require("form-data");
const axios = require("axios");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 10000;

// ✅ Allowed origins (no trailing slash)
const allowedOrigins = [
  "https://beekeys-home.vercel.app",
  "http://localhost:3000"
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
}));

app.use(express.json());

const upload = multer({ storage: multer.memoryStorage() });

const BEEKEYS_URL = "https://app.beekeys.com/nigeria/wp-admin/admin-ajax.php";

// 🔹 Cache for form fields
const formFieldCache = {};

// 🔹 Utility: fetch nonce
async function getNonce(formId = "4") {
  const res = await axios.get(
    `${BEEKEYS_URL}?action=nf_get_form&form_id=${formId}`,
    { headers: { "User-Agent": "Mozilla/5.0" } }
  );
  return res.data?.settings?.key || res.data?.settings?.nonce;
}

// 🔹 Utility: fetch and cache form fields
async function getFormFields(formId = "4") {
  if (formFieldCache[formId]) {
    return formFieldCache[formId];
  }

  try {
    const res = await axios.get(
      `${BEEKEYS_URL}?action=nf_get_form&form_id=${formId}`,
      { headers: { "User-Agent": "Mozilla/5.0" } }
    );

    const fields = res.data?.fields?.map(f => ({
      id: f.id,
      key: f.key,
      label: f.label,
      type: f.type
    })) || [];

    formFieldCache[formId] = fields; // cache it
    return fields;
  } catch (err) {
    console.error("❌ Failed to fetch form fields:", err.message);
    return [];
  }
}

// ================== API ROUTES ==================

// Regions
app.get("/api/regions", async (req, res) => {
  try {
    const apiURL = "https://app.beekeys.com/nigeria/wp-json/geodir/v2/locations/regions";
    const response = await axios.get(apiURL);
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch regions" });
  }
});

// Markers
app.get("/api/markers/:slug", async (req, res) => {
  const slug = req.params.slug;
  const url = `https://app.beekeys.com/nigeria/wp-json/geodir/v2/markers/?gd-ajax=1&post_type=gd_ems&country=nigeria&region=${slug}`;
  try {
    const response = await axios.get(url);
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch markers" });
  }
});

// ✅ Get Ninja Form fields
app.get("/form-fields/:formId", async (req, res) => {
  try {
    const { formId } = req.params;
    const fields = await getFormFields(formId);

    if (!fields.length) {
      return res.status(404).json({ success: false, error: "No fields found" });
    }

    res.json({ success: true, fields });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ✅ Ninja form submit
app.post("/submit-ninja", async (req, res) => {
  try {
    const { formData } = req.body;
    if (!formData) return res.status(400).json({ success: false, error: "Missing formData" });

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
    console.error("❌ Ninja submit failed:", err.message);
    res.status(500).json({ success: false, error: "Form submission failed" });
  }
});

// ✅ Ninja file upload
app.post("/upload-ninja", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: "No file uploaded" });

    const form = new FormData();
    form.append("action", "nf_fu_upload");
    form.append("form_id", "4"); // default to Beekeys Listing Form
    form.append("field_id", "164"); // change if needed
    form.append("file", req.file.buffer, req.file.originalname);

    const response = await axios.post(BEEKEYS_URL, form, { headers: form.getHeaders() });

    res.json({ success: true, wpResponse: response.data });
  } catch (err) {
    console.error("❌ File upload failed:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ================== START ==================
app.listen(PORT, () => console.log(`✅ Proxy API running at http://localhost:${PORT}`));
