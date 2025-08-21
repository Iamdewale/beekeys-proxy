const allowedOrigins = [
  "https://beekeys-home.vercel.app",
  "http://localhost:3000"
];

module.exports = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true
};
