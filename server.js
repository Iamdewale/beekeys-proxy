// server.js
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const rateLimit = require("express-rate-limit");
require("dotenv").config();

const corsOptions = require("./config/corsOptions");

const regionsRoutes = require("./routes/regions");
const businessesRoutes = require("./routes/businesses");
const authRoutes = require("./routes/auth");
const stateRoutes = require("./routes/state");

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(multer({ storage: multer.memoryStorage() }).none());

// Routes
app.use("/api/regions", regionsRoutes);
app.use("/api/businesses", businessesRoutes);
app.use("/api/state-details", stateRoutes);


// Use GET since this is a controller
app.get("/api/markers-in-viewport", getMarkersInViewport);

app.use("/api", authRoutes);

// Start server
app.listen(PORT, () => {
  console.log(`✅ Proxy API running at http://localhost:${PORT}`);
});
