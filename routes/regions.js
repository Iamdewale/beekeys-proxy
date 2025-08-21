// const express = require("express");
// const router = express.Router();
// const { fetchRegionData } = require("../services/beekeysService");

// router.get("/", async (req, res) => {
//   try {
//     const data = await fetchRegionData();
//     res.json(data);
//   } catch (error) {
//     console.error("API Error:", error.message);
//     res.status(500).json({ error: error.message });
//   }
// });

// module.exports = router;

const express = require("express");
const router = express.Router();
const { getAllRegions } = require("../controllers/regionsController");

router.get("/", getAllRegions);

module.exports = router;
