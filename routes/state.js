const express = require("express");
const router = express.Router();
const { getStateDetails } = require("../controllers/stateController");

router.get("/:slug", getStateDetails);

module.exports = router;
