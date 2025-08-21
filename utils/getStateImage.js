const axios = require("axios");

const UNSPLASH_KEY = process.env.UNSPLASH_KEY;
const imageCache = {};
const CACHE_TTL = 1000 * 60 * 60 * 24; // 24 hours

module.exports = async function getStateImage(stateName) {
  const cached = imageCache[stateName];
  const isFresh = cached && (Date.now() - cached.lastFetched < CACHE_TTL);

  if (isFresh) return cached;

  try {
    const query = `${stateName} Nigeria`;
    const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&orientation=landscape&per_page=1&client_id=${UNSPLASH_KEY}`;

    const res = await axios.get(url);
    const first = res.data.results[0];

    const imgData = {
      url: first?.urls?.regular || null,
      credit: first
        ? { name: first.user?.name, link: first.user?.links?.html }
        : null,
      lastFetched: Date.now()
    };

    imageCache[stateName] = imgData;
    return imgData;
  } catch (err) {
    console.warn(`⚠️ Unsplash fetch failed for ${stateName}:`, err.message);
    return { url: null, credit: null, lastFetched: Date.now() };
  }
};
