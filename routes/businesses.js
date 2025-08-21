const express = require("express");
const router = express.Router();
const {
  searchBusinesses,
  getBusinessDetails,
  submitBusiness
} = require("../controllers/businessesController");

router.get("/", searchBusinesses);
router.get("/:id", getBusinessDetails);
router.post("/submit", submitBusiness);

module.exports = router;
