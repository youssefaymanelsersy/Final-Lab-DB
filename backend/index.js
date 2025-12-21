require('dotenv').config();
const express = require('express');
const cors = require('cors');
const pool = require('./db'); 

const app = express();

app.use(express.json());
app.use(cors());

// Import routes
const bookRoutes = require('./routes/books');
const customerRoutes = require('./routes/customers');
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');

// Use the routes
app.use('/api/auth', authRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/books', bookRoutes);
app.use('/api/admin', adminRoutes);

// Health check and DB test remain in index.js if you want
app.get('/health', (req, res) => {
    res.json({
        ok: true,
        message: 'Server is running',
    });
});

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

// Start the server
const PORT = Number(process.env.PORT || 3000);
app.listen(PORT, () => {
    console.log(`✅ Server running on http://localhost:${PORT}`);
});
