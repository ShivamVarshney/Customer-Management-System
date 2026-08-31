require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const cookieParser = require("cookie-parser");

const User = require("./Models/User.js");

const authRoutes = require("./Routes/authRoutes.js");
const customerRoutes = require("./Routes/customerRoutes.js");
const dashboardRoutes = require("./Routes/dashboardRoutes.js");

const app = express();

// Middlewares
app.use(cookieParser());

app.use(cors({
  origin: "https://6a95b10a5ce4eb5f5d2dca21--dreamy-palmier-8c1615.netlify.app",
  credentials: true,
}));

app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/dashboard", dashboardRoutes);

// Health Check
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Customer Management API Running 🚀",
  });
});

// Demo Admin
async function createAdmin() {
  try {
    const existingAdmin = await User.findOne({
      email: "admin@example.com",
    });

    if (!existingAdmin) {
      const hashedPassword = await bcrypt.hash("Admin@123", 10);

      await User.create({
        firstName: "Admin",
        lastName: "User",
        email: "admin@example.com",
        phone: "9999999999",
        password: hashedPassword,
        role: "admin",
      });

      console.log("✅ Demo admin created");
    }
  } catch (error) {
    console.log("Admin creation error:", error.message);
  }
}

// MongoDB Connection
console.log("Connecting to MongoDB...");

mongoose
  .connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 10000,
  })
  .then(async () => {
    console.log("✅ MongoDB Connected");

    await createAdmin();

    app.listen(process.env.PORT || 5000, () => {
      console.log(`🚀 Server running on port ${process.env.PORT || 5000}`);
    });
  })
  .catch((err) => {
    console.error("❌ MongoDB Error:", err.message);
  });