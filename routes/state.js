const express = require("express");
const router = express.Router();
const { getStateDetails, getMarkersInViewport } = require("../controllers/stateController");


// Route to get state details by slug
router.get("/markers-in-viewport", getMarkersInViewport);
router.get("/:slug", getStateDetails);

module.exports = router;
