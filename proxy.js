const express = require("express");
const axios = require("axios");
const cors = require("cors");
const multer = require("multer");
const FormData = require("form-data");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());
app.use(
  cors({
    origin: process.env.REACT_APP_URL || "https://beekeys-home.vercel.app",
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

const upload = multer({ storage: multer.memoryStorage() });
const BEEKEYS_URL = "https://app.beekeys.com/nigeria/wp-admin/admin-ajax.php";

// --- Helper: Get nonce from Ninja Forms
async function getNonce(formId = "8") {
  try {
    const res = await axios.get(`${BEEKEYS_URL}?action=nf_get_form&form_id=${formId}`, {
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    const nonce = res.data?.settings?.key || res.data?.settings?.nonce;
    if (!nonce) throw new Error("Nonce not found in form data");
    return nonce;
  } catch (err) {
    console.error("Error fetching nonce:", err.response?.data || err.message);
    throw new Error("Could not fetch Ninja Forms nonce");
  }
}

// --- Proxy: Submit form
app.post("/submit-ninja", async (req, res) => {
  try {
    const { formData } = req.body;
    if (!formData) {
      return res.status(400).json({ success: false, error: "Missing formData" });
    }

    const nonce = await getNonce(formData.id || "8");

    const params = new URLSearchParams();
    params.append("action", "nf_ajax_submit");
    params.append("security", nonce);
    params.append("formData", JSON.stringify(formData));

    const response = await axios.post(BEEKEYS_URL, params.toString(), {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });

    res.json({ success: true, wpResponse: response.data });
  } catch (err) {
    console.error("Error submitting Ninja form:", err.response?.data || err.message);
    res.status(err.response?.status || 500).json({
      success: false,
      error: "Form submission failed",
      details: err.response?.data || err.message,
    });
  }
});

// --- Proxy: File upload
app.post("/upload-ninja", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: "No file uploaded" });

    const form = new FormData();
    form.append("action", "nf_fu_upload");
    form.append("form_id", "8");   // replace with real form ID
    form.append("field_id", "164"); // replace with real upload field ID
    form.append("file", req.file.buffer, req.file.originalname);

    const response = await axios.post(BEEKEYS_URL, form, {
      headers: form.getHeaders(),
    });

    res.json({ success: true, wpResponse: response.data });
  } catch (err) {
    console.error("Upload error:", err.response?.data || err.message);
    res.status(err.response?.status || 500).json({
      success: false,
      error: "File upload failed",
      details: err.response?.data || err.message,
    });
  }
});

app.listen(PORT, () => console.log(`✅ Proxy server running on port ${PORT}`));
