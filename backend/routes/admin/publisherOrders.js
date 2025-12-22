const express = require("express");
const pool = require("../../db");

const router = express.Router();

/**
 * GET /publisher-orders
 * Fetches replenishment orders with Book and Publisher details
 */
router.get("/", async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page || "1", 10));
        const limit = Math.max(1, Math.min(100, parseInt(req.query.limit || "10", 10)));
        const offset = (page - 1) * limit;
        const status = req.query.status || "All";
        const search = req.query.search || "";

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

        if (status !== "All") {
            sql += ` AND po.status = ?`;
            params.push(status);
        }

        if (search) {
            sql += ` AND (b.title LIKE ? OR p.name LIKE ?)`;
            params.push(`%${search}%`, `%${search}%`);
        }

        sql += ` ORDER BY FIELD(po.status, 'Pending', 'Confirmed'), po.created_at DESC LIMIT ? OFFSET ?`;
        params.push(limit, offset);

        const [rows] = await pool.query(sql, params);

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
router.post("/:id/confirm", async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const orderId = req.params.id;

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

        await connection.query(
            "UPDATE publisher_orders SET status = 'Confirmed', confirmed_at = NOW() WHERE id = ?",
            [orderId]
        );

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

/**
 * POST /publisher-orders
 * Manually create a replenishment order
 */
router.post("/", async (req, res) => {
    try {
        const { isbn, qty } = req.body;

        if (!isbn || !qty) {
            return res
                .status(400)
                .json({ ok: false, error: "ISBN and Quantity are required" });
        }

        if (qty <= 0 || qty > 10000) {
            return res.status(400).json({ ok: false, error: "Quantity must be between 1 and 10000" });
        }

        const [books] = await pool.query(
            "SELECT publisher_id FROM books WHERE isbn = ?",
            [isbn]
        );

        if (books.length === 0) {
            return res.status(404).json({ ok: false, error: "Book not found" });
        }

        const publisherId = books[0].publisher_id;

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

module.exports = router;
