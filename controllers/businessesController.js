const fetchJSON = require("../utils/fetchJSON");

const BEEKEYS_BASE = "https://app.beekeys.com/nigeria/wp-json";

exports.searchBusinesses = async (req, res) => {
  const { search = "" } = req.query;
  const results = await fetchJSON(`${BEEKEYS_BASE}/geodir/v2/listings?search=${encodeURIComponent(search)}`);
  res.json({ success: true, results });
};

exports.getBusinessDetails = async (req, res) => {
  const { id } = req.params;
  const business = await fetchJSON(`${BEEKEYS_BASE}/geodir/v2/single/${id}`, null);
  res.json({ success: true, business });
};

exports.submitBusiness = async (req, res) => {
  const proxySecret = req.headers["x-proxy-secret"];
  if (proxySecret !== process.env.PROXY_SECRET) {
    return res.status(403).json({ success: false, error: "Unauthorized" });
  }

  const {
    businessName,
    email,
    phone,
    address,
    uploadedFiles = []
  } = req.body;

  if (!businessName || !email || !phone || !address) {
    return res.status(400).json({ success: false, error: "Missing required fields" });
  }

  const saved = { ...req.body, uploadedFiles, createdAt: new Date() };
  console.log("✅ Business submitted:", saved);
  res.json({ success: true, data: saved });
};
