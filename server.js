const express = require("express");
const cors = require("cors");
const multer = require("multer");
const FormData = require("form-data");
const axios = require("axios");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 10000;

const allowedOrigins = [
  "https://beekeys-home.vercel.app",
  "http://localhost:3000",
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

const upload = multer({ storage: multer.memoryStorage() });

const BEEKEYS_URL = "https://app.beekeys.com/nigeria/wp-admin/admin-ajax.php";

// 🔹 Static fallback field map for Beekeys Listing Form (id=4)
const staticFieldMap = {
  businessname: 150,
  firstname: 151,
  lastname: 152,
  phone: 153,
  email: 154,
  address: 155,
  slogan: 157,
  iscacregistered: 158,
  hasbranches: 160,
  website: 161,
  description: 175,
  tags: 168,
  imageupload: 164,
};

// 🔹 Fetch Ninja Form nonce
async function getNonce(formId = "4") {
  const res = await axios.get(
    `${BEEKEYS_URL}?action=nf_get_form&form_id=${formId}`,
    { headers: { "User-Agent": "Mozilla/5.0" } }
  );
  return res.data?.settings?.key || res.data?.settings?.nonce;
}

// ========== API ROUTES ==========

// Regions
app.get("/api/regions", async (req, res) => {
  try {
    const apiURL =
      "https://app.beekeys.com/nigeria/wp-json/geodir/v2/locations/regions";
    const response = await axios.get(apiURL);
    res.json(response.data);
  } catch (err) {
    console.error("❌ Regions error:", err.message);
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
    console.error("❌ Markers error:", err.message);
    res.status(500).json({ error: "Failed to fetch markers" });
  }
});

// 🔹 Get cleaned Ninja Form fields
app.get("/form-fields/:formId", async (req, res) => {
  try {
    const { formId } = req.params;
    let form;

    // 1️⃣ Try Ninja Forms REST API first
    try {
      const restURL = `https://app.beekeys.com/nigeria/wp-json/ninja-forms/v1/forms/${formId}`;
      const restRes = await axios.get(restURL);
      form = restRes.data;
    } catch (e) {
      console.warn("⚠️ REST fetch failed, using static map:", e.message);
    }

    // 2️⃣ If REST worked and has fields, build dynamic field map
    if (form?.fields?.length) {
      const fieldMap = {};
      form.fields.forEach((f) => {
        if (f?.id && f?.key) {
          fieldMap[f.key.toLowerCase()] = f.id;
        } else if (f?.id && f?.label) {
          const key = f.label.toLowerCase().replace(/\s+/g, "");
          fieldMap[key] = f.id;
        }
      });
      return res.json({ success: true, formId, fieldMap });
    }

    // 3️⃣ If nothing found, fallback to static map (only for id=4)
    if (formId === "4") {
      return res.json({ success: true, formId, fieldMap: staticFieldMap });
    }

    return res
      .status(404)
      .json({ success: false, error: "No fields found for this form" });
  } catch (err) {
    console.error("❌ Form fields error:", err.message);
    res.status(500).json({ success: false, error: "Failed to fetch form fields" });
  }
});

// 🔹 Submit Ninja Form
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
    console.error("❌ Submit error:", err.message);
    res.status(500).json({ success: false, error: "Form submission failed" });
  }
});

// 🔹 File upload
app.post("/upload-ninja", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res
        .status(400)
        .json({ success: false, error: "No file uploaded" });
    }

    const formId = req.body.formId || "4"; // default to Listing Form
    const fieldId = req.body.fieldId || "164"; // default upload field id

    const form = new FormData();
    form.append("action", "nf_fu_upload");
    form.append("form_id", formId);
    form.append("field_id", fieldId);
    form.append("file", req.file.buffer, req.file.originalname);

    const response = await axios.post(BEEKEYS_URL, form, {
      headers: form.getHeaders(),
    });

    res.json({ success: true, wpResponse: response.data });
  } catch (err) {
    console.error("❌ Upload error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ========== START ==========
app.listen(PORT, () =>
  console.log(`✅ Proxy API running at http://localhost:${PORT}`)
);
