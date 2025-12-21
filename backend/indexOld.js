/******************************************************************
 * Load environment variables from .env
 * This allows us to use process.env.DB_USER, etc.
 ******************************************************************/
require('dotenv').config();

/******************************************************************
 * Import required libraries
 ******************************************************************/
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');

/******************************************************************
 * Create Express app
 ******************************************************************/
const app = express();

/******************************************************************
 * Middleware
 ******************************************************************/
app.use(express.json()); // allows reading JSON bodies
app.use(cors()); // allow frontend to call backend

/******************************************************************
 * CREATE MYSQL POOL
 *
 * IMPORTANT:
 * - This does NOT run queries yet
 * - It creates reusable DB connections
 * - The pool stays alive as long as Node runs
 ******************************************************************/
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER, // Ahmed
    password: process.env.DB_PASS, // Ahfawa121@Strong
    database: process.env.DB_NAME, // bookstore
    port: Number(process.env.DB_PORT || 3306),

    waitForConnections: true,
    connectionLimit: 10, // max simultaneous DB connections
    queueLimit: 0,
});

/******************************************************************
 * ROUTE 1: Server health check
 * This proves Express is working (NO MySQL here)
 ******************************************************************/
app.get('/health', (req, res) => {
    res.json({
        ok: true,
        message: 'Server is running',
    });
});

/******************************************************************
 * ROUTE 2: Database test via API
 * This proves:
 * - Express works
 * - Pool works
 * - MySQL works
 ******************************************************************/
app.get('/db-test', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT 1 AS ok');

        res.json({
            ok: true,
            result: rows,
        });
    } catch (error) {
        res.status(500).json({
            ok: false,
            error: error.message,
        });
    }
});
/**
 * GET /api/books
 * First real endpoint.
 *
 * Frontend will call:
 *   /api/books?limit=20&offset=0
 * Later we’ll add:
 *   /api/books?q=harry&category=Science
 * req.query = {
  q: "harry",
  category: "Science"
}
 */
app.get('/api/books', async (req, res) => {
    try {
        // ---- 1) Read query params (all optional) ----
        const q = String(req.query.q || '').trim(); // search text
        const category = String(req.query.category || '').trim(); // category filter

        // pagination (safe defaults)
        //“Give me only 20 books”
        //OFFSET 0	“Start from the first book”
        const limit = Math.min(Number(req.query.limit || 20), 100);
        const offset = Math.max(Number(req.query.offset || 0), 0);

        // ---- 2) Build SQL dynamically, but SAFELY ----
        // We use placeholders (?) to prevent SQL injection.
        let sql = `SELECT * FROM books`;
        const params = [];
        const where = [];

        // NOTE: These column names might differ in your schema.
        // We’ll adjust them after you send DESCRIBE books.
        if (q) {
            // assumes columns: title OR isbn OR description
            where.push(`(title LIKE ? OR isbn LIKE ? OR description LIKE ?)`);
            params.push(`%${q}%`, `%${q}%`, `%${q}%`);
        }

        if (category) {
            // assumes column: category
            where.push(`category = ?`);
            params.push(category);
        }

        if (where.length) sql += ` WHERE ` + where.join(' AND ');

        sql += ` ORDER BY created_at DESC, isbn DESC LIMIT ? OFFSET ?`;
        params.push(limit, offset);

        // ---- 3) Run query ----
        const [rows] = await pool.query(sql, params);

        // ---- 4) Return consistent JSON ----
        res.json({
            ok: true,
            count: rows.length,
            limit,
            offset,
            data: rows,
        });
    } catch (error) {
        res.status(500).json({ ok: false, error: error.message });
    }
});

/**
 * POST /api/auth/signup
 */
app.post('/api/auth/signup', async (req, res) => {
    try {
        const {
            username,
            password,
            first_name,
            last_name,
            email,
            phone,
            shipping_address,
        } = req.body;

        if (
            !username ||
            !password ||
            !first_name ||
            !last_name ||
            !email ||
            !phone ||
            !shipping_address
        ) {
            return res.status(400).json({
                ok: false,
                error: 'All fields are required',
            });
        }

        const [existing] = await pool.query(
            `SELECT id FROM customers WHERE username = ? OR email = ?`,
            [username, email]
        );

        if (existing.length > 0) {
            return res.status(409).json({
                ok: false,
                error: 'Username or email already exists',
            });
        }

        const password_hash = await bcrypt.hash(password, 10);

        const [result] = await pool.query(
            `
      INSERT INTO customers
      (username, password_hash, first_name, last_name, email, phone, shipping_address)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
            [
                username,
                password_hash,
                first_name,
                last_name,
                email,
                phone,
                shipping_address,
            ]
        );

        await pool.query(
            `INSERT INTO carts (customer_id) VALUES (?)`,
            [result.insertId]
        );

        res.status(201).json({
            ok: true,
            message: 'Account created successfully',
        });
    } catch (error) {
        res.status(500).json({ ok: false, error: error.message });
    }
});

/**
 * POST /api/auth/login
 */
app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        // 1) Validate input
        if (!username || !password) {
            return res.status(400).json({
                ok: false,
                error: 'Username and password are required',
            });
        }

        // 2) Find user
        const [rows] = await pool.query(
            `SELECT id, password_hash FROM customers WHERE username = ?`,
            [username]
        );

        if (rows.length === 0) {
            return res.status(401).json({
                ok: false,
                error: 'Invalid credentials',
            });
        }

        const user = rows[0];

        // 3) Compare password
        const match = await bcrypt.compare(password, user.password_hash);

        if (!match) {
            return res.status(401).json({
                ok: false,
                error: 'Invalid credentials',
            });
        }

        // 4) Success
        res.json({
            ok: true,
            customer_id: user.id,
        });
    } catch (error) {
        res.status(500).json({
            ok: false,
            error: error.message,
        });
    }
});

/******************************************************************
 * Start server
 ******************************************************************/
const PORT = Number(process.env.PORT || 3000);
app.listen(PORT, () => {
    console.log(`✅ Server running on http://localhost:${PORT}`);
});
