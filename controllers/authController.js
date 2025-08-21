const axios = require("axios");

exports.registerUser = async (req, res) => {
  try {
    const wpRes = await axios.post(
      "https://app.beekeys.com/nigeria/wp-json/userswp/v1/register",
      req.body,
      { headers: { "Content-Type": "application/json" } }
    );
    res.status(wpRes.status).json(wpRes.data);
  } catch (err) {
    res.status(err.response?.status || 500)
       .json(err.response?.data || { error: "Registration failed" });
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    const wpRes = await axios.post(
      "https://app.beekeys.com/nigeria/wp-json/custom/v1/forgot-password",
      { user_login: req.body.user_login },
      { headers: { "Content-Type": "application/json" } }
    );
    res.status(wpRes.status).json(wpRes.data);
  } catch (err) {
    res.status(err.response?.status || 500)
       .json(err.response?.data || { message: "Reset failed" });
  }
};
