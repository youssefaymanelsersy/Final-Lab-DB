const express = require("express");
const pool = require("../../db");

const router = express.Router();

/**
 * GET /reports/sales/previous-month
 */
router.get("/sales/previous-month", async (req, res) => {
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

        res.json({
            ok: true,
            range: "previous-month",
            total_sales: row.total_sales ?? 0,
            orders_count: row.orders_count ?? 0,
            items_sold: row.items_sold ?? 0,
        });
    } catch (error) {
        res.status(500).json({ ok: false, error: error.message });
    }
});

/**
 * GET /reports/sales/by-day
 */
router.get("/sales/by-day", async (req, res) => {
    try {
        const { date } = req.query;

        if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(String(date))) {
            return res.status(400).json({
                ok: false,
                error: "Invalid date. Use format YYYY-MM-DD",
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
 * GET /reports/top-customers
 */
router.get("/top-customers", async (req, res) => {
    try {
        const monthsRaw = parseInt(req.query.months || "3", 10);
        const limitRaw = parseInt(req.query.limit || "5", 10);

        const months = Math.max(
            1,
            Math.min(24, Number.isNaN(monthsRaw) ? 3 : monthsRaw)
        );
        const limit = Math.max(
            1,
            Math.min(50, Number.isNaN(limitRaw) ? 5 : limitRaw)
        );

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

        const customers = rows.map((r, i) => {
            const fullName = `${r.first_name || ""} ${r.last_name || ""}`.trim();
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
 * GET /reports/top-books
 */
router.get("/top-books", async (req, res) => {
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

/**
 * GET /reports/book-orders-count
 */
router.get("/book-orders-count", async (req, res) => {
    try {
        const q = String(req.query.q || "").trim();
        if (!q) {
            return res
                .status(400)
                .json({ ok: false, error: "q is required (ISBN or title)" });
        }

        const isIsbn = /^\d{13}$/.test(q);
        let isbn = null;

        if (isIsbn) {
            isbn = q;
            const [exists] = await pool.query(
                "SELECT isbn, title FROM books WHERE isbn = ? LIMIT 1",
                [isbn]
            );
            if (exists.length === 0) {
                return res
                    .status(404)
                    .json({ ok: false, error: "Book not found for this ISBN" });
            }
        } else {
            const [found] = await pool.query(
                `
                SELECT isbn, title
                FROM books
                WHERE title LIKE CONCAT('%', ?, '%')
                ORDER BY (title = ?) DESC, LENGTH(title) ASC
                LIMIT 1`,
                [q, q]
            );

            if (found.length === 0) {
                return res
                    .status(404)
                    .json({ ok: false, error: "No book matches this title" });
            }

            isbn = found[0].isbn;
        }

        const [[book]] = await pool.query(
            "SELECT isbn, title FROM books WHERE isbn = ? LIMIT 1",
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
            last_ordered_at: stats.last_ordered_at,
        });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

module.exports = router;
