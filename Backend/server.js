require("dotenv").config();

const dns = require("node:dns");
const mongoDnsServers = (process.env.MONGODB_DNS_SERVERS || "1.1.1.1,8.8.8.8")
  .split(",")
  .map((server) => server.trim())
  .filter(Boolean);

try {
  // Apply the configured resolvers before Mongoose starts SRV/TXT discovery.
  dns.setServers(mongoDnsServers);
  console.log("MongoDB DNS resolvers configured", { serverCount: mongoDnsServers.length });
} catch (err) {
  const safeErrorName = /^[A-Za-z][A-Za-z0-9_ -]{0,63}$/.test(err?.name || "")
    ? err.name
    : "UnknownError";
  const rawErrorCode = err?.code;
  const safeErrorCode =
    (typeof rawErrorCode === "number" && Number.isFinite(rawErrorCode)) ||
    (typeof rawErrorCode === "string" && /^[A-Za-z0-9_ -]{1,64}$/.test(rawErrorCode))
      ? rawErrorCode
      : "unavailable";

  console.error("MongoDB DNS resolver configuration failed", {
    errorName: safeErrorName,
    errorCode: safeErrorCode,
  });
  process.exit(1);
}

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const authRoutes = require("./Routes/authRoutes.js");
const customerRoutes = require("./Routes/customerRoutes.js");
const dashboardRoutes = require("./Routes/dashboardRoutes.js");
const workspaceRoutes = require("./Routes/workspaceRoutes.js");

const app = express();

// Bearer tokens are sent in Authorization headers; cookies are not used.
const allowedOrigins = (process.env.CLIENT_URLS || process.env.CLIENT_URL || "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(cors({ origin: allowedOrigins }));

app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/workspaces", workspaceRoutes);

// Health Check
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Customer Management API Running 🚀",
  });
});

// MongoDB Connection
console.log("Connecting to MongoDB...");

mongoose
  .connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 10000,
  })
  .then(() => {
    console.log("✅ MongoDB Connected");

    app.listen(process.env.PORT || 5000, () => {
      console.log(`🚀 Server running on port ${process.env.PORT || 5000}`);
    });
  })
  .catch((err) => {
    const safeErrorName = /^[A-Za-z][A-Za-z0-9_ -]{0,63}$/.test(err?.name || "")
      ? err.name
      : "UnknownError";
    const rawErrorCode = err?.code;
    const safeErrorCode =
      (typeof rawErrorCode === "number" && Number.isFinite(rawErrorCode)) ||
      (typeof rawErrorCode === "string" && /^[A-Za-z0-9_ -]{1,64}$/.test(rawErrorCode))
        ? rawErrorCode
        : "unavailable";

    console.error("❌ MongoDB connection failed", {
      errorName: safeErrorName,
      errorCode: safeErrorCode,
    });
  });
