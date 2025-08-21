const express = require("express");
const router = express.Router();
const rateLimit = require("express-rate-limit");
const {
  registerUser,
  forgotPassword
} = require("../controllers/authController");

const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3,
  message: {
    success: false,
    message: "Too many password reset requests from this IP, please try again later."
  }
});

router.post("/register", registerUser);
router.post("/forgot-password", forgotPasswordLimiter, forgotPassword);

module.exports = router;
