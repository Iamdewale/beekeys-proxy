const axios = require("axios");

module.exports = async function fetchJSON(url, fallback = []) {
  try {
    const res = await axios.get(url);
    return res.data || fallback;
  } catch (err) {
    console.warn(`⚠️ Fetch failed [${url}]:`, err.message);
    return fallback;
  }
};
