require('dotenv').config();

const express = require('express');
const path = require('path');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { verifyAdmin } = require('./middleware/auth');

const app = express();

app.use(express.json());
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true
}));
app.use(cookieParser());

// Serve uploaded avatars statically
const avatarsDir = path.resolve(process.cwd(), 'uploads', 'avatars');
app.use('/uploads/avatars', express.static(avatarsDir, { maxAge: '7d', index: false }));

// --------------------
// Routes
// --------------------
const pool = require('./db');
const bookRoutes = require('./routes/books');
const customerRoutes = require('./routes/customers');
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');

app.use('/api/auth', authRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/books', bookRoutes);
app.use('/api/admin', verifyAdmin, adminRoutes);

// Enhanced health check with database connectivity verification
app.get('/health', async (req, res) => {
    const startTime = Date.now();

    try {
        // Test database connection
        const [dbResult] = await pool.query('SELECT 1 AS ok, VERSION() as version, DATABASE() as db_name');
        const dbLatency = Date.now() - startTime;

        res.json({
            ok: true,
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            database: {
                connected: true,
                latency_ms: dbLatency,
                version: dbResult[0].version,
                name: dbResult[0].db_name
            },
            environment: process.env.NODE_ENV || 'development'
        });
    } catch (error) {
        res.status(503).json({
            ok: false,
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            database: {
                connected: false,
                error: error.message
            }
        });
    }
});

// --------------------
// Start server
// --------------------
const PORT = Number(process.env.PORT || 3000);
app.listen(PORT, () => {
    console.log(`✅ Server running on http://localhost:${PORT}`);
});
