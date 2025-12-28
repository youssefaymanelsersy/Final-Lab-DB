require("dotenv").config();

const express = require("express");
const path = require("path");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const { verifyAdmin } = require("./middleware/auth");

const app = express();

/* =======================
   CORS — FINAL & CORRECT
======================= */
const corsOptions = {
  origin: true,
  credentials: true
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

/* =======================
   BODY PARSERS
======================= */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

/* =======================
   STRIPE WEBHOOK (RAW)
======================= */
app.post(
  "/api/stripe/webhook",
  express.raw({ type: "application/json" }),
  require("./routes/stripeWebhook")
);

/* =======================
   STATIC FILES
======================= */
const avatarsDir = path.resolve(process.cwd(), "uploads", "avatars");
app.use("/uploads/avatars", express.static(avatarsDir, {
  maxAge: "7d",
  index: false
}));

/* =======================
   ROUTES
======================= */
const pool = require("./db");
const bookRoutes = require("./routes/books");
const customerRoutes = require("./routes/customers");
const authRoutes = require("./routes/auth");
const adminRoutes = require("./routes/admin");

app.use("/api/auth", authRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/books", bookRoutes);
app.use("/api/admin", verifyAdmin, adminRoutes);
app.use("/api/checkout", require("./routes/checkout"));

/* =======================
   HEALTH
======================= */
app.get("/health", async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT VERSION() AS version, DATABASE() AS db"
    );

    res.json({
      ok: true,
      database: rows[0],
      environment: process.env.NODE_ENV || "development"
    });
  } catch (err) {
    res.status(503).json({ ok: false, error: err.message });
  }
});

/* =======================
   START SERVER
======================= */
const PORT = Number(process.env.PORT || 8080);
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
