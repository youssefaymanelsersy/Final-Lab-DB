const express = require("express");
const pool = require("../../db");

const router = express.Router();

/**
 * PUT /books/:isbn
 * Update book details
 */
router.put("/:isbn", async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const { isbn } = req.params;
        const {
            title,
            category,
            publisher_id,
            publication_year,
            selling_price,
            stock_qty,
            threshold,
            cover_url
        } = req.body;

        if (!title || !category || !publisher_id || !publication_year || !selling_price) {
            return res.status(400).json({ ok: false, error: "Missing required fields" });
        }

        // Prevent negative stock
        if (stock_qty !== undefined && stock_qty < 0) {
            return res.status(400).json({ ok: false, error: "Stock quantity cannot be negative" });
        }

        await connection.beginTransaction();

        // Get current stock to check threshold
        const [[currentBook]] = await connection.query(
            'SELECT stock_qty, threshold FROM books WHERE isbn = ? FOR UPDATE',
            [isbn]
        );

        if (!currentBook) {
            throw new Error('Book not found');
        }

        const [result] = await connection.query(
            `UPDATE books SET 
                title = ?,
                category = ?,
                publisher_id = ?,
                publication_year = ?,
                selling_price = ?,
                stock_qty = ?,
                threshold = ?,
                cover_url = ?
            WHERE isbn = ?`,
            [title, category, publisher_id, publication_year, selling_price, stock_qty ?? currentBook.stock_qty, threshold ?? currentBook.threshold, cover_url || null, isbn]
        );

        if (result.affectedRows === 0) {
            throw new Error('Failed to update book');
        }

        // Check if auto-reorder needed (stock dropped below threshold)
        const newStock = stock_qty ?? currentBook.stock_qty;
        const newThreshold = threshold ?? currentBook.threshold;
        
        if (currentBook.stock_qty >= currentBook.threshold && newStock < newThreshold) {
            await connection.query(
                `INSERT INTO publisher_orders (isbn, publisher_id, order_qty, status)
                VALUES (?, ?, ?, 'Pending')`,
                [isbn, publisher_id, newThreshold * 3]
            );
        }

        await connection.commit();
        res.json({ ok: true, message: "Book updated successfully" });
    } catch (error) {
        await connection.rollback();
        console.error(error);
        res.status(500).json({ ok: false, error: error.message });
    } finally {
        connection.release();
    }
});

/**
 * POST /books
 * Create a new book
 */
router.post("/", async (req, res) => {
    try {
        const {
            isbn,
            title,
            category,
            publisher_id,
            publication_year,
            selling_price,
            stock_qty,
            threshold,
            cover_url
        } = req.body;

        if (!isbn || !title || !category || !publisher_id || !publication_year || !selling_price) {
            return res.status(400).json({ ok: false, error: "Missing required fields" });
        }

        // ISBN must be 13 digits
        if (!/^\d{13}$/.test(isbn)) {
            return res.status(400).json({ ok: false, error: "ISBN must be 13 digits." });
        }
        // Title and category not empty
        if (typeof title !== 'string' || title.trim() === '') {
            return res.status(400).json({ ok: false, error: "Title cannot be empty." });
        }
        if (typeof category !== 'string' || category.trim() === '') {
            return res.status(400).json({ ok: false, error: "Category cannot be empty." });
        }
        // Publication year reasonable
        const year = Number(publication_year);
        const currentYear = new Date().getFullYear();
        if (isNaN(year) || year < 1000 || year > currentYear) {
            return res.status(400).json({ ok: false, error: `Publication year must be between 1000 and ${currentYear}.` });
        }
        // Selling price positive
        if (isNaN(Number(selling_price)) || Number(selling_price) <= 0) {
            return res.status(400).json({ ok: false, error: "Selling price must be a positive number." });
        }
        // Stock and threshold must be positive
        if (isNaN(Number(stock_qty)) || Number(stock_qty) <= 0) {
            return res.status(400).json({ ok: false, error: "Stock quantity must be a positive number." });
        }
        if (isNaN(Number(threshold)) || Number(threshold) <= 0) {
            return res.status(400).json({ ok: false, error: "Threshold must be a positive number." });
        }

        // Check if publisher_id exists
        const [pubRows] = await pool.query('SELECT id FROM publishers WHERE id = ?', [publisher_id]);
        if (pubRows.length === 0) {
            return res.status(400).json({ ok: false, error: "Invalid publisher ID. Please select a valid publisher." });
        }

        await pool.query(
            `INSERT INTO books (isbn, title, category, publisher_id, publication_year, selling_price, stock_qty, threshold, cover_url)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [isbn, title, category, publisher_id, publication_year, selling_price, stock_qty, threshold, cover_url || null]
        );

        res.json({ ok: true, message: "Book created successfully" });
    } catch (error) {
        console.error(error);
        if (error.code === "ER_DUP_ENTRY") {
            res.status(409).json({ ok: false, error: "Book with this ISBN already exists" });
        } else {
            res.status(500).json({ ok: false, error: error.message });
        }
    }
});

module.exports = router;
