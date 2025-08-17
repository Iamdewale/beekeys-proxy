const express = require("express");
const axios = require("axios");
const cors = require("cors");
const multer = require("multer");
const FormData = require("form-data");
require("dotenv").config();

const fieldMap = require("./fieldMap");

const app = express();
app.use(express.json());
app.use(cors({ origin: process.env.REACT_APP_URL || "*" }));

const upload = multer({ storage: multer.memoryStorage() });
const BEEKEYS_URL = "https://app.beekeys.com/nigeria/wp-admin/admin-ajax.php";
const FORM_ID = "8"; // Ninja Form ID

// --- Helper: Fetch nonce
async function getNonce(formId = FORM_ID) {
  const res = await axios.get(`${BEEKEYS_URL}?action=nf_get_form&form_id=${formId}`);
  const nonce = res.data?.settings?.key || res.data?.settings?.nonce;
  if (!nonce) throw new Error("Nonce not found in form data");
  return nonce;
}

// --- Helper: Build Ninja Form payload
function buildFormData(userData) {
  const fields = {};

  Object.entries(fieldMap).forEach(([key, fieldId]) => {
    if (userData[key] !== undefined && userData[key] !== null) {
      fields[fieldId] = { id: fieldId, value: userData[key] };
    }
  });

  return {
    id: FORM_ID,
    fields,
    settings: {},
    extra: {},
  };
}

// --- Route: Submit Form
app.post("/submit-ninja", async (req, res) => {
  try {
    const userData = req.body;
    if (!userData) return res.status(400).json({ error: "Missing form data" });

    const nonce = await getNonce(FORM_ID);
    const formData = buildFormData(userData);

    const params = new URLSearchParams();
    params.append("action", "nf_ajax_submit");
    params.append("security", nonce);
    params.append("formData", JSON.stringify(formData));

    const response = await axios.post(BEEKEYS_URL, params.toString(), {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });

    res.json({ success: true, data: response.data });
  } catch (err) {
    console.error("Form submission error:", err.response?.data || err.message);
    res.status(err.response?.status || 500).json({
      error: "Form submission failed",
      details: err.response?.data || err.message,
    });
  }
});

// --- Route: Upload File
app.post("/upload-ninja", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const form = new FormData();
    form.append("action", "nf_fu_upload");
    form.append("form_id", FORM_ID);
    form.append("field_id", fieldMap.imageUpload);
    form.append("file", req.file.buffer, req.file.originalname);

    const response = await axios.post(BEEKEYS_URL, form, {
      headers: form.getHeaders(),
    });

    // Response includes tmp_name — return so frontend can attach
    res.json({ success: true, file: response.data });
  } catch (err) {
    console.error("Upload error:", err.response?.data || err.message);
    res.status(err.response?.status || 500).json({
      error: "File upload failed",
      details: err.response?.data || err.message,
    });
  }
});

// --- Health check
app.get("/test", (req, res) => {
  res.json({ message: "Proxy running and ready" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Proxy running on port ${PORT}`));
