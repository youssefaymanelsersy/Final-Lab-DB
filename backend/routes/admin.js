const express = require("express");
const pool = require("../db");

const router = express.Router();

/**
 * GET /reports/sales/previous-month
 */
router.get("/reports/sales/previous-month", async (req, res) => {
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
router.get("/reports/sales/by-day", async (req, res) => {
    try {
        const { date } = req.query;

        // Basic validation: must exist and be YYYY-MM-DD
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
 * GET /reports/top-customers
 */
router.get("/reports/top-customers", async (req, res) => {
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
router.get("/reports/top-books", async (req, res) => {
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
router.get("/reports/book-orders-count", async (req, res) => {
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
            // title search (best match)
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
            last_ordered_at: stats.last_ordered_at, // can be null
        });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});
//* GET /publisher-orders
// * Fetches replenishment orders with Book and Publisher details
// */
router.get("/publisher-orders", async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page || "1", 10));
        const limit = Math.max(1, Math.min(100, parseInt(req.query.limit || "10", 10)));
        const offset = (page - 1) * limit;
        const status = req.query.status || "All";
        const search = req.query.search || "";

        // Build Query
        let sql = `
            SELECT 
                po.id, 
                po.created_at, 
                po.status, 
                po.order_qty,
                b.title as book_title,
                b.cover_url,
                b.isbn,
                p.name as publisher_name
            FROM publisher_orders po
            JOIN books b ON po.isbn = b.isbn
            JOIN publishers p ON po.publisher_id = p.id
            WHERE 1=1
        `;

        const params = [];

        // Filter by Status
        if (status !== "All") {
            sql += ` AND po.status = ?`;
            params.push(status);
        }

        // Search by Book Title or Publisher
        if (search) {
            sql += ` AND (b.title LIKE ? OR p.name LIKE ?)`;
            params.push(`%${search}%`, `%${search}%`);
        }

        // Sort: Pending first, then by date
        sql += ` ORDER BY FIELD(po.status, 'Pending', 'Confirmed'), po.created_at DESC LIMIT ? OFFSET ?`;
        params.push(limit, offset);

        const [rows] = await pool.query(sql, params);

        // Get Total Count
        let countSql = `
            SELECT COUNT(*) as total 
            FROM publisher_orders po
            JOIN books b ON po.isbn = b.isbn
            JOIN publishers p ON po.publisher_id = p.id
            WHERE 1=1
        `;
        const countParams = [];

        if (status !== "All") {
            countSql += ` AND po.status = ?`;
            countParams.push(status);
        }
        if (search) {
            countSql += ` AND (b.title LIKE ? OR p.name LIKE ?)`;
            countParams.push(`%${search}%`, `%${search}%`);
        }

        const [[{ total }]] = await pool.query(countSql, countParams);

        res.json({
            ok: true,
            data: rows,
            meta: { total, page, pages: Math.ceil(total / limit) },
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ ok: false, error: error.message });
    }
});

/**
 * POST /publisher-orders/:id/confirm
 * Confirms the order and updates book stock
 */
router.post("/publisher-orders/:id/confirm", async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const orderId = req.params.id;

        // 1) Lock the publisher order
        const [orders] = await connection.query(
            "SELECT * FROM publisher_orders WHERE id = ? FOR UPDATE",
            [orderId]
        );

        if (orders.length === 0) {
            throw new Error("Order not found");
        }

        const order = orders[0];

        if (order.status === "Confirmed") {
            throw new Error("Order already confirmed");
        }

        // 2) Update order status
        await connection.query(
            "UPDATE publisher_orders SET status = 'Confirmed', confirmed_at = NOW() WHERE id = ?",
            [orderId]
        );

        // 3) Update book stock and VERIFY it worked
        const [result] = await connection.query(
            "UPDATE books SET stock_qty = stock_qty + ? WHERE isbn = ?",
            [order.order_qty, order.isbn]
        );

        if (result.affectedRows === 0) {
            throw new Error("Failed to update book stock");
        }

        await connection.commit();
        res.json({ ok: true, message: "Stock updated successfully" });

    } catch (error) {
        await connection.rollback();
        res.status(500).json({ ok: false, error: error.message });
    } finally {
        connection.release();
    }
});

// ... existing imports and code ...

/**
 * POST /publisher-orders
 * Manually create a replenishment order
 */
router.post("/publisher-orders", async (req, res) => {
    try {
        const { isbn, qty } = req.body;

        if (!isbn || !qty) {
            return res
                .status(400)
                .json({ ok: false, error: "ISBN and Quantity are required" });
        }

        // Validate quantity: must be positive and reasonable
        if (qty <= 0 || qty > 10000) {
            return res.status(400).json({ ok: false, error: "Quantity must be between 1 and 10000" });
        }

        // 1. Get Publisher ID from the Book
        const [books] = await pool.query(
            "SELECT publisher_id FROM books WHERE isbn = ?",
            [isbn]
        );

        if (books.length === 0) {
            return res.status(404).json({ ok: false, error: "Book not found" });
        }

        const publisherId = books[0].publisher_id;

        // 2. Insert Order
        await pool.query(
            `INSERT INTO publisher_orders (isbn, publisher_id, order_qty, status) 
            VALUES (?, ?, ?, 'Pending')`,
            [isbn, publisherId, qty]
        );

        res.json({ ok: true, message: "Order placed successfully" });
    } catch (error) {
        res.status(500).json({ ok: false, error: error.message });
    }
});
/**
 * PUT /books/:isbn
 * Update book details (Admin Only)
 */
router.put("/books/:isbn", async (req, res) => {
    try {
        const { isbn } = req.params;
        const {
            title,
            publisher_id,
            publication_year,
            selling_price,
            category,
            stock_qty,
            threshold,
            cover_url,
        } = req.body;

        // Backend validation (no triggers!)
        if (stock_qty < 0) {
            return res.status(400).json({
                ok: false,
                error: "Stock quantity cannot be negative",
            });
        }

        const sql = `
            UPDATE books 
            SET 
                title = ?, 
                publisher_id = ?, 
                publication_year = ?, 
                selling_price = ?, 
                category = ?, 
                stock_qty = ?, 
                threshold = ?, 
                cover_url = ?
            WHERE isbn = ?
        `;

        const [result] = await pool.query(sql, [
            title,
            publisher_id,
            publication_year,
            selling_price,
            category,
            stock_qty,
            threshold,
            cover_url,
            isbn,
        ]);

        if (result.affectedRows === 0) {
            return res.status(404).json({
                ok: false,
                error: "Book not found",
            });
        }

        res.json({ ok: true, message: "Book updated successfully" });

    } catch (error) {
        res.status(500).json({ ok: false, error: error.message });
    }
});

// ... existing imports ...

/**
 * POST /books
 * Add a new book (Admin Only)
 */
router.post("/books", async (req, res) => {
    try {
        const {
            isbn,
            title,
            publisher_id,
            publication_year,
            selling_price,
            category,
            stock_qty,
            threshold,
            cover_url,
        } = req.body;

        // 1. Basic Validation
        if (!isbn || !title || !publisher_id || !selling_price || !category) {
            return res.status(400).json({
                ok: false,
                error:
                    "Missing required fields (ISBN, Title, Publisher, Price, Category)",
            });
        }

        // 2. Validate Negative Values (Integrity)
        if (stock_qty < 0 || threshold < 0 || selling_price < 0) {
            return res.status(400).json({
                ok: false,
                error: "Stock, Threshold, and Price cannot be negative",
            });
        }

        // 3. Check if ISBN already exists
        const [existing] = await pool.query("SELECT 1 FROM books WHERE isbn = ?", [
            isbn,
        ]);
        if (existing.length > 0) {
            return res
                .status(409)
                .json({ ok: false, error: "Book with this ISBN already exists" });
        }

        // 4. Check if Publisher exists (Integrity)
        const [pub] = await pool.query("SELECT 1 FROM publishers WHERE id = ?", [
            publisher_id,
        ]);
        if (pub.length === 0) {
            return res.status(400).json({ ok: false, error: "Invalid Publisher ID" });
        }

        // 5. Insert Book
        const sql = `
            INSERT INTO books 
            (isbn, title, publisher_id, publication_year, selling_price, category, stock_qty, threshold, cover_url)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        await pool.query(sql, [
            isbn,
            title,
            publisher_id,
            publication_year,
            selling_price,
            category,
            stock_qty || 0,
            threshold || 5,
            cover_url || null,
        ]);

        res.json({ ok: true, message: "Book added successfully" });
    } catch (error) {
        res.status(500).json({ ok: false, error: error.message });
    }
});
module.exports = router;
