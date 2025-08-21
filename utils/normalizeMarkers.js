/**
 * Normalizes raw marker data into a consistent format.
 * @param {Array} rawMarkers - Array of raw marker objects
 * @returns {Array} - Array of normalized markers
 */
module.exports = function normalizeMarkers(rawMarkers = []) {
  return rawMarkers
    .map((m) => {
      const lat = parseFloat(m.lat || m.latitude || m.lt || 0);
      const lng = parseFloat(m.lng || m.longitude || m.ln || 0);

      if (!lat || !lng) return null;

      return {
        id: m.id || m.m || null,
        title: m.title?.rendered || m.title || m.t || "Untitled",
        slug: m.slug || m.s || null,
        lat,
        lng,
        icon: m.icon || m.i || null,
        category: m.category || m.c || null,
        description: m.description || m.d || null,
      };
    })
    .filter(Boolean);
};
