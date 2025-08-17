// const express = require("express");
// const cors = require("cors");

// // For Node 18 and below
// const fetch = (...args) =>
//   import("node-fetch").then(({ default: fetch }) => fetch(...args));

// const app = express();
// const PORT = process.env.PORT || 5000;

// app.use(cors({
//   origin: process.env.REACT_APP_URL || "https://beekeys-home.vercel.app",
//   methods: ["GET", "POST", "OPTIONS"],
//   allowedHeaders: ["Content-Type", "Authorization"],
// }));

// app.use(express.json());

// // 🔹 Util: slugify fallback
// function slugify(text) {
//   return text
//     .toString()
//     .toLowerCase()
//     .trim()
//     .replace(/\s+/g, "-")
//     .replace(/[^\w\-]+/g, "")
//     .replace(/\-\-+/g, "-");
// }

// // 🔹 GET /api/regions
// app.get("/api/regions", async (req, res) => {
//   try {
//     const apiURL = "https://app.beekeys.com/nigeria/wp-json/geodir/v2/locations/regions";
//     const response = await fetch(apiURL);
//     const text = await response.text();

//     if (!response.ok) {
//       return res.status(response.status).json({ error: "Beekeys API request failed" });
//     }

//     let data;
//     try {
//       data = JSON.parse(text);
//     } catch {
//       return res.status(500).json({ error: "Invalid JSON from Beekeys" });
//     }

//     let regions;
//     if (Array.isArray(data)) {
//       regions = data.map((item) => ({
//         id: item.id,
//         title: item.title || item.name || "Unknown",
//         slug: item.slug || slugify(item.title || item.name),
//       }));
//     } else if (Array.isArray(data.items)) {
//       regions = data.items.map((item) => ({
//         id: item.id || item.m,
//         title: item.title || item.t || "Unnamed",
//         slug: item.slug || item.s || slugify(item.title || item.t),
//       }));
//     } else {
//       return res.status(500).json({ error: "Unexpected response structure from Beekeys" });
//     }

//     res.json({ success: true, data: regions });
//   } catch (error) {
//     console.error("Error in /api/regions:", error.message);
//     res.status(500).json({ success: false, error: "Could not fetch regions" });
//   }
// });

// // 🔹 GET /api/markers/:slug
// app.get("/api/markers/:slug", async (req, res) => {
//   const slug = req.params.slug;
//   const url = `https://app.beekeys.com/nigeria/wp-json/geodir/v2/markers/?gd-ajax=1&post_type=gd_ems&country=nigeria&region=${slug}&term[]=7&term[]=8&term[]=6&term[]=9`;

//   try {
//     const response = await fetch(url, {
//       headers: {
//         Accept: "application/json, text/javascript, */*; q=0.01",
//         "X-Requested-With": "XMLHttpRequest",
//         "User-Agent": "Mozilla/5.0",
//         Referer: `https://app.beekeys.com/nigeria/location/nigeria/${slug}/`,
//         Cookie: process.env.BEEKEYS_COOKIE || "",
//       },
//     });

//     const raw = await response.text();
//     if (!raw || raw.includes("wp-login.php")) {
//       return res.status(401).json({ success: false, error: "Session expired. Please update your cookie." });
//     }

//     let json;
//     try {
//       json = JSON.parse(raw);
//     } catch {
//       return res.status(500).json({ success: false, error: "Invalid JSON structure" });
//     }

//     const markers =
//       json.items?.map((item) => ({
//         id: item.m,
//         title: item.t,
//         slug: item.s,
//         lat: parseFloat(item.lt),
//         lng: parseFloat(item.ln),
//         icon: json.icons?.[item.i]?.i ?? null,
//       })) || [];

//     res.json({ success: true, data: markers });
//   } catch (error) {
//     console.error("Error in /api/markers/:slug:", error.message);
//     res.status(500).json({ success: false, error: "Could not fetch markers" });
//   }
// });

// // 🔹 POST /submit (local test endpoint)
// app.post("/submit", (req, res) => {
//   const formData = req.body;
//   if (!formData || Object.keys(formData).length === 0) {
//     return res.status(400).json({ success: false, error: "No data provided" });
//   }
//   console.log("📩 Received form submission:", formData);
//   res.json({ success: true, message: "Form submitted successfully!", data: formData });
// });

// // Start server
// app.listen(PORT, () => {
//   console.log(`✅ Proxy API running on port ${PORT}`);
// });

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

// 🔹 Utility: fetch nonce
async function getNonce(formId = "8") {
  const res = await axios.get(
    `${BEEKEYS_URL}?action=nf_get_form&form_id=${formId}`,
    { headers: { "User-Agent": "Mozilla/5.0" } }
  );
  return res.data?.settings?.key || res.data?.settings?.nonce;
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

// Ninja form submit
app.post("/submit-ninja", async (req, res) => {
  try {
    const { formData } = req.body;
    if (!formData) return res.status(400).json({ success: false, error: "Missing formData" });

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
    res.status(500).json({ success: false, error: err.message });
  }
});

// Ninja file upload
app.post("/upload-ninja", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: "No file uploaded" });

    const form = new FormData();
    form.append("action", "nf_fu_upload");
    form.append("form_id", "8");
    form.append("field_id", "164");
    form.append("file", req.file.buffer, req.file.originalname);

    const response = await axios.post(BEEKEYS_URL, form, { headers: form.getHeaders() });

    res.json({ success: true, wpResponse: response.data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ================== START ==================
app.listen(PORT, () => console.log(`✅ Proxy API running at http://localhost:${PORT}`));
