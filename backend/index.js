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
 * GET /api/admin/reports/sales/previous-month
 *
 * Returns:
 * - total_sales
 * - orders_count
 * - items_sold
 *
 * We read from `sales` table using `sale_date`.
 */
app.get('/api/admin/reports/sales/previous-month', async (req, res) => {
  try {
    const sql = `
      SELECT
        SUM(s.amount) AS total_sales,
        COUNT(DISTINCT s.order_id) AS orders_count,
        SUM(s.qty) AS items_sold
      FROM sales s
      WHERE s.sale_date >= DATE_FORMAT(CURDATE() - INTERVAL 1 MONTH, '%Y-%m-01')
        AND s.sale_date <  DATE_FORMAT(CURDATE(), '%Y-%m-01');
    `;

    const [rows] = await pool.query(sql);
    const row = rows[0] || {};

    // Handle NULLs here (since you asked not to use COALESCE in SQL)
    res.json({
      ok: true,
      range: 'previous-month',
      total_sales: row.total_sales ?? 0,
      orders_count: row.orders_count ?? 0,
      items_sold: row.items_sold ?? 0,
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

/******************************************************************
 * Start server
 ******************************************************************/
const PORT = Number(process.env.PORT || 3000);
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
