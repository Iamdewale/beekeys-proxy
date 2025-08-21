const fetch = (...args) => import("node-fetch").then(({ default: fetch }) => fetch(...args));

/**
 * Fetches marker data from Beekeys GeoDirectory API.
 * @param {Object} options
 * @param {string} options.region - Region slug (e.g. 'borno-state')
 * @param {string[]} [options.terms] - Array of term IDs for filtering
 * @param {string} [options.postType='gd_ems'] - Post type to fetch
 * @returns {Promise<Array>} - Array of formatted marker objects
 */
const fetchRegionData = async ({
  region = "borno-state",
  terms = ["7", "8", "6", "9"],
  postType = "gd_ems",
} = {}) => {
  const baseUrl = "https://app.beekeys.com/nigeria/wp-json/geodir/v2/markers/";
  const query = new URLSearchParams({
    "gd-ajax": "1",
    post_type: postType,
    country: "nigeria",
    region,
  });

  terms.forEach((term) => query.append("term[]", term));

  const url = `${baseUrl}?${query.toString()}`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json, text/javascript, */*; q=0.01",
      "X-Requested-With": "XMLHttpRequest",
      Referer: `https://app.beekeys.com/nigeria/location/nigeria/${region}/`,
      "User-Agent": "Mozilla/5.0",
      Cookie: process.env.BEEKEYS_COOKIE,
    },
  });

  const contentType = response.headers.get("content-type") || "";
  const raw = await response.text();

  if (
    !raw ||
    !contentType.includes("application/json") ||
    raw.includes("wp-login.php")
  ) {
    throw new Error("Session expired or invalid response. Please update cookies.");
  }

  const json = JSON.parse(raw);

  return json.items.map((item) => ({
    id: item.m,
    title: item.t,
    slug: item.s,
    lat: parseFloat(item.lt),
    lng: parseFloat(item.ln),
    icon: json.icons[item.i]?.i ?? null,
  }));
};

module.exports = { fetchRegionData };
