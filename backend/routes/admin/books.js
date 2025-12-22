const express = require("express");
const pool = require("../../db");

const router = express.Router();

/**
 * PUT /books/:isbn
 * Update book details
 */
router.put("/:isbn", async (req, res) => {
    try {
        const { isbn } = req.params;
        const {
            title,
            category_id,
            publisher_id,
            publication_year,
            selling_price,
            pages,
            stock_qty,
            threshold_qty,
            cover_url
        } = req.body;

        if (!title || !category_id || !publisher_id || !publication_year || !selling_price) {
            return res.status(400).json({ ok: false, error: "Missing required fields" });
        }

        const [result] = await pool.query(
            `UPDATE books SET 
                title = ?,
                category_id = ?,
                publisher_id = ?,
                publication_year = ?,
                selling_price = ?,
                pages = ?,
                stock_qty = ?,
                threshold_qty = ?,
                cover_url = ?
            WHERE isbn = ?`,
            [title, category_id, publisher_id, publication_year, selling_price, pages, stock_qty, threshold_qty, cover_url, isbn]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ ok: false, error: "Book not found" });
        }

        res.json({ ok: true, message: "Book updated successfully" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ ok: false, error: error.message });
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
            category_id,
            publisher_id,
            publication_year,
            selling_price,
            pages,
            stock_qty,
            threshold_qty,
            cover_url,
            author_ids
        } = req.body;

        if (!isbn || !title || !category_id || !publisher_id || !publication_year || !selling_price) {
            return res.status(400).json({ ok: false, error: "Missing required fields" });
        }

        if (!author_ids || !Array.isArray(author_ids) || author_ids.length === 0) {
            return res.status(400).json({ ok: false, error: "At least one author is required" });
        }

        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            await connection.query(
                `INSERT INTO books (isbn, title, category_id, publisher_id, publication_year, selling_price, pages, stock_qty, threshold_qty, cover_url)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [isbn, title, category_id, publisher_id, publication_year, selling_price, pages || 0, stock_qty || 0, threshold_qty || 5, cover_url || null]
            );

            for (const authorId of author_ids) {
                await connection.query(
                    "INSERT INTO book_authors (isbn, author_id) VALUES (?, ?)",
                    [isbn, authorId]
                );
            }

            await connection.commit();
            res.json({ ok: true, message: "Book created successfully" });
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
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
