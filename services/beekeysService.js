const fetch = (...args) => import("node-fetch").then(({ default: fetch }) => fetch(...args));

const fetchRegionData = async () => {
  const url =
    "https://app.beekeys.com/nigeria/wp-json/geodir/v2/markers/?" +
    "gd-ajax=1&post_type=gd_ems&country=nigeria&region=borno-state" +
    "&term[]=7&term[]=8&term[]=6&term[]=9";

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Accept": "application/json, text/javascript, */*; q=0.01",
      "X-Requested-With": "XMLHttpRequest",
      "Referer": "https://app.beekeys.com/nigeria/location/nigeria/borno-state/",
      "User-Agent": "Mozilla/5.0",
      "Cookie": process.env.BEEKEYS_COOKIE,
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

  // Optional: format the items
  const formatted = json.items.map((item) => ({
    id: item.m,
    title: item.t,
    slug: item.s, 
    lat: parseFloat(item.lt),
    lng: parseFloat(item.ln),
    icon: json.icons[item.i]?.i ?? null,
  }));

  return formatted;
};

module.exports = { fetchRegionData };
