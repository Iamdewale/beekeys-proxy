const fetchJSON = require("../utils/fetchJSON");
const { fetchRegionData } = require("../services/beekeysService");
const normalizeMarkers = require("../utils/normalizeMarkers");

const BEEKEYS_BASE = "https://app.beekeys.com/nigeria/wp-json";

// 🔍 Search businesses by keyword
exports.searchBusinesses = async (req, res) => {
  const { search = "" } = req.query;

  try {
    const results = await fetchJSON(
      `${BEEKEYS_BASE}/geodir/v2/listings?search=${encodeURIComponent(search)}`
    );
    res.json({ success: true, results });
  } catch (err) {
    console.error("Search error:", err);
    res.status(500).json({ success: false, error: "Failed to search businesses" });
  }
};

// 📄 Get details for a single business
exports.getBusinessDetails = async (req, res) => {
  const { id } = req.params;

  try {
    const business = await fetchJSON(`${BEEKEYS_BASE}/geodir/v2/single/${id}`);
    res.json({ success: true, business });
  } catch (err) {
    console.error("Details error:", err);
    res.status(500).json({ success: false, error: "Failed to fetch business details" });
  }
};

// 📝 Submit a new business (mocked)
exports.submitBusiness = async (req, res) => {
  const proxySecret = req.headers["x-proxy-secret"];
  if (proxySecret !== process.env.PROXY_SECRET) {
    return res.status(403).json({ success: false, error: "Unauthorized" });
  }

  const { businessName, email, phone, address, uploadedFiles = [] } = req.body;

  if (!businessName || !email || !phone || !address) {
    return res.status(400).json({ success: false, error: "Missing required fields" });
  }

  const saved = { ...req.body, uploadedFiles, createdAt: new Date() };
  console.log("✅ Business submitted:", saved);

  res.json({ success: true, data: saved });
};

// 📍 Get markers for a region
exports.getBusinessMarkers = async (req, res) => {
  const { region = "anambra-state" } = req.query;

  try {
    const raw = await fetchRegionData({ region });
    const markers = normalizeMarkers(raw);
    res.json({ success: true, markers });
  } catch (err) {
    console.error("Marker fetch error:", err);
    res.status(500).json({ success: false, error: "Failed to fetch markers" });
  }
};
