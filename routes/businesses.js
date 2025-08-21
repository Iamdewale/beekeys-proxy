const express = require("express");
const router = express.Router();
const {
  searchBusinesses,
  getBusinessDetails,
  submitBusiness,
  getBusinessMarkers, // ✅ New controller
} = require("../controllers/businessesController");

// Existing routes
router.get("/", searchBusinesses);
router.get("/:id", getBusinessDetails);
router.post("/submit", submitBusiness);

// ✅ New route for fetching markers
router.get("/markers", getBusinessMarkers);

module.exports = router;
