const express = require("express");
const cors = require("cors");

// For Node 18 and below
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

const app = express();
const PORT = process.env.PORT || 4000; // use Render's port if available

app.use(cors());
app.use(express.json()); // Allow parsing JSON POST bodies

// 🔹 Util: slugify fallback
function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w\-]+/g, "")
    .replace(/\-\-+/g, "-");
}

// 🔹 Endpoint: GET /api/regions
app.get("/api/regions", async (req, res) => {
  try {
    const apiURL =
      "https://app.beekeys.com/nigeria/wp-json/geodir/v2/locations/regions";
    const response = await fetch(apiURL);
    const text = await response.text();

    if (!response.ok) {
      return res
        .status(response.status)
        .json({ error: "Beekeys API request failed" });
    }

    let data;
    try {
      data = JSON.parse(text);
    } catch (err) {
      return res.status(500).json({ error: "Invalid JSON from Beekeys" });
    }

    let regions;
    if (Array.isArray(data)) {
      // Case: top-level array
      regions = data.map((item) => ({
        id: item.id,
        title: item.title || item.name || "Unknown",
        slug: item.slug || slugify(item.title || item.name),
      }));
    } else if (Array.isArray(data.items)) {
      // Case: wrapped in `items` array
      regions = data.items.map((item) => ({
        id: item.id || item.m,
        title: item.title || item.t || "Unnamed",
        slug: item.slug || item.s || slugify(item.title || item.t),
      }));
    } else {
      console.error("Unexpected structure:", data);
      return res
        .status(500)
        .json({ error: "Unexpected response structure from Beekeys" });
    }

    res.json({ data: regions });
  } catch (error) {
    console.error("Error in /api/regions:", error.message);
    res.status(500).json({ error: "Could not fetch regions" });
  }
});

// 🔹 Endpoint: GET /api/markers/:slug
app.get("/api/markers/:slug", async (req, res) => {
  const slug = req.params.slug;
  const url = `https://app.beekeys.com/nigeria/wp-json/geodir/v2/markers/?gd-ajax=1&post_type=gd_ems&country=nigeria&region=${slug}&term[]=7&term[]=8&term[]=6&term[]=9`;

  try {
    const response = await fetch(url, {
      headers: {
        Accept: "application/json, text/javascript, */*; q=0.01",
        "X-Requested-With": "XMLHttpRequest",
        "User-Agent": "Mozilla/5.0",
        Referer: `https://app.beekeys.com/nigeria/location/nigeria/${slug}/`,
        Cookie: process.env.BEEKEYS_COOKIE || "",
      },
    });

    const raw = await response.text();

    if (!raw || raw.includes("wp-login.php")) {
      return res
        .status(401)
        .json({ error: "Session expired. Please update your cookie." });
    }

    let json;
    try {
      json = JSON.parse(raw);
    } catch (err) {
      console.error("JSON parse error:", err.message);
      return res.status(500).json({ error: "Invalid JSON structure" });
    }

    // Format markers
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
  } catch (error) {
    console.error("Error in /api/markers/:slug:", error.message);
    res.status(500).json({ error: "Could not fetch markers" });
  }
});

// 🔹 Endpoint: POST /submit
app.post("/submit", (req, res) => {
  const formData = req.body;

  if (!formData || Object.keys(formData).length === 0) {
    return res.status(400).json({ error: "No data provided" });
  }

  console.log("📩 Received form submission:", formData);

  // Here you could:
  // - Validate the data
  // - Save it to a database
  // - Forward it to another API

  res.json({
    message: "Form submitted successfully!",
    data: formData,
  });
});

// 🔹 Start Server
app.listen(PORT, () => {
  console.log(`✅ Proxy API is running at http://localhost:${PORT}`);
});
