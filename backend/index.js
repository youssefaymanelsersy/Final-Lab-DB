require('dotenv').config();

const express = require('express');
const path = require('path');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { verifyAdmin } = require('./middleware/auth');

const app = express();

/* =======================
  CORS — MUST BE FIRST
======================= */
const allowedOrigins = [
  "http://localhost:5173",
  "https://final-lab-db.vercel.app"
];

app.use(cors({
  origin: function (origin, callback) {
    // allow curl / Postman / server-to-server
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      return callback(null, origin);
    }

    return callback(null, false);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

// 🔥 REQUIRED for preflight
app.options("*", cors());

/* =======================
  Body parsers
======================= */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

/* =======================
  Stripe webhook (RAW)
======================= */
app.post(
  "/api/stripe/webhook",
  express.raw({ type: "application/json" }),
  require("./routes/stripeWebhook")
);

/* =======================
  Static files
======================= */
const avatarsDir = path.resolve(process.cwd(), 'uploads', 'avatars');
app.use('/uploads/avatars', express.static(avatarsDir, { maxAge: '7d', index: false }));

/* =======================
  Routes
======================= */
const pool = require('./db');
const bookRoutes = require('./routes/books');
const customerRoutes = require('./routes/customers');
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');

app.use('/api/auth', authRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/books', bookRoutes);
app.use('/api/admin', verifyAdmin, adminRoutes);
app.use('/api/checkout', require('./routes/checkout'));

/* =======================
  Health check
======================= */
app.get('/health', async (req, res) => {
  const startTime = Date.now();

  try {
    const [dbResult] = await pool.query(
      'SELECT 1 AS ok, VERSION() as version, DATABASE() as db_name'
    );

    res.json({
      ok: true,
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: {
        connected: true,
        latency_ms: Date.now() - startTime,
        version: dbResult[0].version,
        name: dbResult[0].db_name
      },
      environment: process.env.NODE_ENV || 'development'
    });
  } catch (error) {
    res.status(503).json({
      ok: false,
      status: 'unhealthy',
      error: error.message
    });
  }
});

/* =======================
  Start server
======================= */
const PORT = Number(process.env.PORT || 8080);
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
