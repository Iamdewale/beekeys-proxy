const fetchJSON = require("../utils/fetchJSON");
const getStateImage = require("../utils/getStateImage");

const BEEKEYS_BASE = "https://app.beekeys.com/nigeria/wp-json";

exports.getAllRegions = async (_req, res) => {
  const rawRegions = await fetchJSON(`${BEEKEYS_BASE}/geodir/v2/locations/regions?per_page=50`);
  const data = await Promise.all(
    rawRegions.map(async region => {
      const img = await getStateImage(region.name || region.title);
      return {
        ...region,
        thumbnail: img.url,
        credit: img.credit
      };
    })
  );
  res.json({ success: true, data });
};
