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
// GET /api/admin/reports/sales/by-day?date=YYYY-MM-DD
app.get('/api/admin/reports/sales/by-day', async (req, res) => {
  try {
    const { date } = req.query;

    // Basic validation: must exist and be YYYY-MM-DD
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(String(date))) {
      return res.status(400).json({
        ok: false,
        error: 'Invalid date. Use format YYYY-MM-DD',
      });
    }

    const sql = `
      SELECT
        SUM(s.amount) AS total_sales,
        COUNT(DISTINCT s.order_id) AS orders_count,
        SUM(s.qty) AS items_sold
      FROM sales s
      WHERE DATE(s.sale_date) = ?;
    `;

    const [rows] = await pool.query(sql, [date]);
    const row = rows[0] || {};

    // No COALESCE in SQL; normalize here:
    res.json({
      ok: true,
      date,
      total_sales: row.total_sales ?? 0,
      orders_count: row.orders_count ?? 0,
      items_sold: row.items_sold ?? 0,
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});
/**
 * GET /api/admin/reports/top-customers?months=3&limit=5
 *
 * Returns only what the UI needs:
 * - customers: [{ rank, name, total_spent, orders_count }]
 * - top_customer: same shape (rank 1) or null
 */
app.get('/api/admin/reports/top-customers', async (req, res) => {
  try {
    const monthsRaw = parseInt(req.query.months || '3', 10);
    const limitRaw = parseInt(req.query.limit || '5', 10);

    const months = Math.max(
      1,
      Math.min(24, Number.isNaN(monthsRaw) ? 3 : monthsRaw)
    );
    const limit = Math.max(
      1,
      Math.min(50, Number.isNaN(limitRaw) ? 5 : limitRaw)
    );

    /**
     * We only SELECT what we need:
     * - name parts (first/last) + username as fallback
     * - total_spent
     * - orders_count
     *
     * No email, no items_sold.
     */
    const sql = `
      SELECT
        c.id AS customer_id,
        c.username,
        c.first_name,
        c.last_name,
        SUM(s.amount) AS total_spent,
        COUNT(DISTINCT s.order_id) AS orders_count
      FROM sales s
      JOIN orders o ON o.id = s.order_id
      JOIN customers c ON c.id = o.customer_id
      WHERE s.sale_date >= (CURDATE() - INTERVAL ? MONTH)
      GROUP BY c.id, c.username, c.first_name, c.last_name
      ORDER BY total_spent DESC
      LIMIT ?;
    `;

    const [rows] = await pool.query(sql, [months, limit]);

    // Build minimal response for frontend
    const customers = rows.map((r, i) => {
      const fullName = `${r.first_name || ''} ${r.last_name || ''}`.trim();
      return {
        rank: i + 1,
        name: fullName || r.username || `Customer #${r.customer_id}`,
        total_spent: Number(r.total_spent ?? 0),
        orders_count: Number(r.orders_count ?? 0),
      };
    });

    res.json({
      ok: true,
      months,
      limit,
      customers,
      top_customer: customers[0] || null,
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});
/**
 * GET /api/admin/reports/top-books?months=3&limit=10
 * Top selling books ranked by total copies sold in the last N months.
 */
app.get('/api/admin/reports/top-books', async (req, res) => {
  try {
    const months = Math.max(Number(req.query.months || 3), 1);
    const limit = Math.min(Math.max(Number(req.query.limit || 10), 1), 50);

    const sql = `
      SELECT
        b.isbn,
        b.title,
        b.cover_url,
        SUM(oi.qty) AS copies_sold,
        SUM(oi.qty * oi.unit_price) AS revenue
      FROM orders o
      JOIN order_items oi ON oi.order_id = o.id
      JOIN books b ON b.isbn = oi.isbn
      WHERE o.order_date >= DATE_SUB(CURDATE(), INTERVAL ? MONTH)
      GROUP BY b.isbn, b.title, b.cover_url
      ORDER BY copies_sold DESC, revenue DESC, b.title ASC
      LIMIT ?;
    `;

    const [rows] = await pool.query(sql, [months, limit]);

    res.json({
      ok: true,
      months,
      limit,
      data: rows,
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});
app.get('/api/admin/reports/book-orders-count', async (req, res) => {
  try {
    const q = String(req.query.q || '').trim();
    if (!q) {
      return res
        .status(400)
        .json({ ok: false, error: 'q is required (ISBN or title)' });
    }

    const isIsbn = /^\d{13}$/.test(q);

    let isbn = null;

    if (isIsbn) {
      isbn = q;
      const [exists] = await pool.query(
        'SELECT isbn, title FROM books WHERE isbn = ? LIMIT 1',
        [isbn]
      );
      if (exists.length === 0) {
        return res
          .status(404)
          .json({ ok: false, error: 'Book not found for this ISBN' });
      }
    } else {
      // title search (best match)
      const [found] = await pool.query(
        `SELECT isbn, title
         FROM books
         WHERE title LIKE CONCAT('%', ?, '%')
         ORDER BY (title = ?) DESC, LENGTH(title) ASC
         LIMIT 1`,
        [q, q]
      );

      if (found.length === 0) {
        return res
          .status(404)
          .json({ ok: false, error: 'No book matches this title' });
      }

      isbn = found[0].isbn;
    }

    const [[book]] = await pool.query(
      'SELECT isbn, title FROM books WHERE isbn = ? LIMIT 1',
      [isbn]
    );

    const [[stats]] = await pool.query(
      `SELECT
         COUNT(*) AS times_ordered,
         SUM(order_qty) AS total_qty_ordered,
         MAX(created_at) AS last_ordered_at
       FROM publisher_orders
       WHERE isbn = ?`,
      [isbn]
    );

    res.json({
      ok: true,
      book,
      times_ordered: Number(stats.times_ordered || 0),
      total_qty_ordered: Number(stats.total_qty_ordered || 0),
      last_ordered_at: stats.last_ordered_at, // can be null
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

/******************************************************************
 * Start server
 ******************************************************************/
const PORT = Number(process.env.PORT || 3000);
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
