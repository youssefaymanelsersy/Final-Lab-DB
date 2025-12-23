const express = require('express');
const bcrypt = require('bcrypt');
const pool = require('../../db');
const { verifyCustomer } = require('../../middleware/auth');

const router = express.Router();

function ensureSameCustomer(req, res, next) {
  const paramId = Number(req.params.id);
  const authId = Number(req.user?.id);
  if (!authId || !paramId) {
    return res.status(401).json({ ok: false, error: 'Unauthorized' });
  }
  if (authId !== paramId) {
    return res.status(403).json({ ok: false, error: 'Forbidden' });
  }
  next();
}

// 0) Get customer profile
router.get('/:id', verifyCustomer, ensureSameCustomer, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const [[row]] = await pool.query(
      `SELECT id, username, first_name, last_name, email, phone, shipping_address, created_at
       FROM customers WHERE id = ? LIMIT 1`,
      [id]
    );
    if (!row) {
      return res.status(404).json({ ok: false, error: 'Customer not found' });
    }
    res.json({ ok: true, profile: row });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// 1) Update customer profile (NO password)
router.put('/:id', verifyCustomer, ensureSameCustomer, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { first_name, last_name, email, phone, shipping_address } = req.body;

    if (!id || !first_name || !last_name || !email || !phone || !shipping_address) {
      return res.status(400).json({ ok: false, error: 'All fields are required' });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ ok: false, error: 'Invalid email format' });
    }

    await pool.query(
      `UPDATE customers
       SET first_name = ?, last_name = ?, email = ?, phone = ?, shipping_address = ?
       WHERE id = ?`,
      [first_name, last_name, email, phone, shipping_address, id]
    );

    res.json({ ok: true, message: 'Profile updated' });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// 2) Change password
router.put('/:id/password', verifyCustomer, ensureSameCustomer, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { old_password, new_password } = req.body;

    if (!old_password || !new_password) {
      return res.status(400).json({ ok: false, error: 'Both passwords required' });
    }
    if (String(new_password).length < 6) {
      return res.status(400).json({ ok: false, error: 'New password must be at least 6 characters' });
    }

    const [rows] = await pool.query(`SELECT password_hash FROM customers WHERE id=?`, [id]);
    if (rows.length === 0) {
      return res.status(404).json({ ok: false, error: 'Customer not found' });
    }

    const match = await bcrypt.compare(old_password, rows[0].password_hash);
    if (!match) {
      return res.status(401).json({ ok: false, error: 'Incorrect password' });
    }

    const newHash = await bcrypt.hash(new_password, 10);
    await pool.query(`UPDATE customers SET password_hash=? WHERE id=?`, [newHash, id]);

    res.json({ ok: true, message: 'Password updated' });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
