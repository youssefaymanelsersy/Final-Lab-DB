const express = require('express');
const pool = require('../db');

const router = express.Router();

router.get('/', async (req, res) => {
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

module.exports = router;

/******************************************************************
 * End of File
 ******************************************************************/