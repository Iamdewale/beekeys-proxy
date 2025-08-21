const fetchJSON = require("../utils/fetchJSON");
const normalizeMarkers = require("../utils/normalizeMarkers");
const resolveRegion = require("../utils/resolveRegion");

const BEEKEYS_BASE = "https://app.beekeys.com/nigeria/wp-json";

exports.getStateDetails = async (req, res) => {
  const { slug } = req.params;
  const region = await resolveRegion(slug);

  if (!region) {
    return res.status(404).json({ success: false, error: "Region not found", region: null, markers: [] });
  }

  const regionParam = encodeURIComponent(region.name);
  const [emsRaw, listingsRaw] = await Promise.all([
    fetchJSON(`${BEEKEYS_BASE}/geodir/v2/markers/?gd-ajax=1&post_type=gd_ems&country=nigeria&region=${regionParam}`, []),
    fetchJSON(`${BEEKEYS_BASE}/geodir/v2/listings?country=nigeria&region=${regionParam}`, [])
  ]);

  const ems = normalizeMarkers(emsRaw);
  const listings = normalizeMarkers(listingsRaw);

  const markersMap = new Map();
  [...ems, ...listings].forEach(m => markersMap.set(m.id, m));
  const markers = Array.from(markersMap.values());

  res.json({
    success: true,
    region,
    markers: markers.length ? markers : [
      { id: 1, title: `Sample Service in ${region.name}`, lat: 9.0820, lng: 8.6753 }
    ]
  });
};
