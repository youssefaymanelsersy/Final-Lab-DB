const express = require('express');
const pool = require('../db');

const router = express.Router();

/**
 * POST search/list books with filters
 * POST /api/books
 * Body: { q, category, author, publisher, limit, offset, price_min, price_max, sort_by }
 * 
 * a) Search by ISBN, Title, or Author name (via q parameter)
 * b) Filter by Category, Author, Publisher, Price Range
 * c) Sort by price, title, or publication_year
 * d) Returns book details and availability status
 */
router.post('/', async (req, res) => {
    try {
        // ---- 1) Read body params (all optional) ----
        const q = String(req.body.q || '').trim(); // search text (ISBN, title, author)
        const q_title = String(req.body.q_title || '').trim(); // title-only search
        const category = String(req.body.category || '').trim(); // category filter
        const author = String(req.body.author || '').trim(); // author filter
        const publisher = String(req.body.publisher || '').trim(); // publisher filter
        
        // Price range filters
        const price_min = Number(req.body.price_min) || 0;
        const price_max = Number(req.body.price_max) || Number.MAX_VALUE;
        
        // Sorting options: 'price', 'title', 'year', 'newest' (default)
        const sort_by = String(req.body.sort_by || 'newest').trim().toLowerCase();

        // pagination (safe defaults)
        const limit = Math.min(Number(req.body.limit || 20), 100);
        const offset = Math.max(Number(req.body.offset || 0), 0);

        // ---- 2) Build SQL dynamically, but SAFELY ----
        // We use placeholders (?) to prevent SQL injection.
        // JOIN with authors and publishers tables for comprehensive search
        let sql = `
            SELECT DISTINCT
                b.isbn,
                b.title,
                b.publisher_id,
                b.publication_year,
                b.selling_price,
                b.category,
                b.stock_qty,
                b.threshold,
                b.cover_url,
                b.created_at,
                p.name as publisher_name,
                COALESCE(AVG(r.rating), 0) as avg_rating,
                COUNT(DISTINCT r.id) as review_count
            FROM books b
            LEFT JOIN book_authors ba ON b.isbn = ba.isbn
            LEFT JOIN authors a ON ba.author_id = a.id
            LEFT JOIN publishers p ON b.publisher_id = p.id
            LEFT JOIN reviews r ON b.isbn = r.isbn
            WHERE 1=1
        `;
        const params = [];

        // Title-only search (used by customer UI) takes precedence
        if (q_title) {
            sql += ` AND (b.title LIKE ?)`;
            params.push(`%${q_title}%`);
        }
        // General search: ISBN, title, or author name
        else if (q) {
            sql += ` AND (b.title LIKE ? OR b.isbn LIKE ? OR a.full_name LIKE ?)`;
            params.push(`%${q}%`, `%${q}%`, `%${q}%`);
        }

        // Filter by category
        if (category) {
            sql += ` AND b.category = ?`;
            params.push(category);
        }

        // Filter by author name
        if (author) {
            sql += ` AND a.full_name = ?`;
            params.push(author);
        }

        // Filter by publisher name
        if (publisher) {
            sql += ` AND p.name = ?`;
            params.push(publisher);
        }
        
        // Filter by price range
        if (price_min > 0) {
            sql += ` AND b.selling_price >= ?`;
            params.push(price_min);
        }
        if (price_max < Number.MAX_VALUE) {
            sql += ` AND b.selling_price <= ?`;
            params.push(price_max);
        }

        // GROUP BY for aggregated rating fields
        sql += ` GROUP BY b.isbn, b.title, b.publisher_id, b.publication_year, 
                b.selling_price, b.category, b.stock_qty, b.threshold, 
                b.cover_url, b.created_at, p.name`;

        // Add ORDER BY based on sort_by parameter
        if (sort_by === 'price') {
            sql += ` ORDER BY b.selling_price ASC, b.isbn DESC`;
        } else if (sort_by === 'price_desc') {
            sql += ` ORDER BY b.selling_price DESC, b.isbn DESC`;
        } else if (sort_by === 'title') {
            sql += ` ORDER BY b.title ASC, b.isbn DESC`;
        } else if (sort_by === 'year') {
            sql += ` ORDER BY b.publication_year DESC, b.isbn DESC`;
        } else if (sort_by === 'stock_low') {
            sql += ` ORDER BY b.stock_qty ASC, b.isbn DESC`;
        } else {
            // default: newest first
            sql += ` ORDER BY b.created_at DESC, b.isbn DESC`;
        }
        
        sql += ` LIMIT ? OFFSET ?`;
        params.push(limit, offset);

        // ---- 3) Run query ----
        const [rows] = await pool.query(sql, params);

        // ---- 4) Return consistent JSON with book details and availability ----
        res.json({
            ok: true,
            count: rows.length,
            limit,
            offset,
            data: rows.map(book => ({
                ...book,
                available: book.stock_qty > 0, // availability indicator
                inStock: book.stock_qty,
            })),
        });
    } catch (error) {
        res.status(500).json({ ok: false, error: error.message });
    }
});

/**
 * GET book by ISBN
 * GET /api/books/:isbn
 * Returns book details and availability
 */
router.get('/:isbn', async (req, res) => {
    try {
        const { isbn } = req.params;

        const [rows] = await pool.query(
            `SELECT * FROM books WHERE isbn = ?`,
            [isbn]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                ok: false,
                message: 'Book not found',
            });
        }

        const book = rows[0];
        res.json({
            ok: true,
            data: {
                ...book,
                available: book.stock_qty > 0, // availability indicator
                inStock: book.stock_qty,
            },
        });
    } catch (error) {
        res.status(500).json({
            ok: false,
            error: error.message,
        });
    }
});

/**
 * GET reviews for a book
 * GET /api/books/:isbn/reviews
 * Returns all reviews for a specific book with customer info
 */
router.get('/:isbn/reviews', async (req, res) => {
    try {
        const { isbn } = req.params;

        const [reviews] = await pool.query(
            `SELECT 
                r.id,
                r.rating,
                r.review_text,
                r.created_at,
                CONCAT_WS(' ', c.first_name, c.last_name) AS customer_name
            FROM reviews r
            JOIN customers c ON r.customer_id = c.id
            WHERE r.isbn = ?
            ORDER BY r.created_at DESC`,
            [isbn]
        );

        res.json({
            ok: true,
            count: reviews.length,
            reviews
        });
    } catch (error) {
        res.status(500).json({ ok: false, error: error.message });
    }
});

/**
 * POST a review for a book
 * POST /api/books/:isbn/reviews
 * Body: { customer_id, rating, review_text }
 * Requires customer to be authenticated
 */
router.post('/:isbn/reviews', async (req, res) => {
    try {
        const { isbn } = req.params;
        const { customer_id, rating, review_text } = req.body;

        // Validate inputs
        if (!customer_id || !rating) {
            return res.status(400).json({
                ok: false,
                error: 'customer_id and rating are required'
            });
        }

        if (rating < 1 || rating > 5) {
            return res.status(400).json({
                ok: false,
                error: 'rating must be between 1 and 5'
            });
        }

        // Check if book exists
        const [books] = await pool.query('SELECT isbn FROM books WHERE isbn = ?', [isbn]);
        if (books.length === 0) {
            return res.status(404).json({ ok: false, error: 'Book not found' });
        }

        // Enforce verified purchase: customer must have bought this ISBN
        const [purchases] = await pool.query(
            `SELECT 1
            FROM order_items oi
            JOIN orders o ON oi.order_id = o.id
            WHERE o.customer_id = ? AND oi.isbn = ?
            LIMIT 1`,
            [customer_id, isbn]
        );

        if (purchases.length === 0) {
            return res.status(403).json({
                ok: false,
                error: 'Only customers who purchased this book can leave a review'
            });
        }

        // Insert or update review
        await pool.query(
            `INSERT INTO reviews (isbn, customer_id, rating, review_text)
            VALUES (?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
                rating = VALUES(rating),
                review_text = VALUES(review_text),
                created_at = CURRENT_TIMESTAMP`,
            [isbn, customer_id, rating, review_text || null]
        );

        res.json({
            ok: true,
            message: 'Review submitted successfully'
        });
    } catch (error) {
        res.status(500).json({ ok: false, error: error.message });
    }
});


module.exports = router;
