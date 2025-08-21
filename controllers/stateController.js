const { fetchMarkers } = require("../services/beekeysService");
const resolveRegion = require("../utils/resolveRegion");

/**
 * Get state details + all markers (EMS + Listings).
 */
exports.getStateDetails = async (req, res) => {
  try {
    const { slug } = req.params;
    const region = await resolveRegion(slug);

    if (!region) {
      return res.status(404).json({ success: false, error: "Region not found", region: null, markers: [] });
    }

    const markers = await fetchMarkers({ region: region.name, includeListings: true });

    res.json({
      success: true,
      region,
      markers: markers.length ? markers : [
        { id: 1, title: `Sample Service in ${region.name}`, lat: 9.0820, lng: 8.6753 }
      ]
    });
  } catch (err) {
    console.error("❌ getStateDetails error:", err.message);
    res.status(500).json({ success: false, error: "Failed to fetch state details", region: null, markers: [] });
  }
};

/**
 * Fetch markers in viewport for a region.
 */
exports.getMarkersInViewport = async (req, res) => {
  try {
    const { north, south, east, west, region } = req.query;

    if (!region) {
      return res.status(400).json({ success: false, error: "Region is required", markers: [] });
    }

    const markers = await fetchMarkers({ region, north, south, east, west });

    res.json({
      success: true,
      markers: Array.isArray(markers) ? markers : []
    });
  } catch (err) {
    console.error("❌ getMarkersInViewport error:", err.message);
    res.status(500).json({ success: false, error: "Failed to fetch markers", markers: [] });
  }
};

