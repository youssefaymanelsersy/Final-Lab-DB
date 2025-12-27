const express = require('express');
const pool = require('../../db');

const router = express.Router();

// GET /api/admin/customers - List all customers
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, username, first_name, last_name, email, phone, avatar_url FROM customers`
    );
    res.json({ ok: true, data: rows });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

module.exports = router;
