const express = require('express');
const bcrypt = require('bcrypt');
const pool = require('../db');
const { verifyCustomer } = require('../middleware/auth');

const router = express.Router();

/* ---------------- HELPERS ---------------- */

async function getOrCreateCart(customerId) {
  const [[cart]] = await pool.query(
    'SELECT id FROM carts WHERE customer_id = ?',
    [customerId]
  );

  if (cart) return cart;

  const [result] = await pool.query(
    'INSERT INTO carts (customer_id) VALUES (?)',
    [customerId]
  );

  return { id: result.insertId };
}

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

/* ---------------- PROFILE ---------------- */

/**
 * GET /api/customers/:id
 * Get MY profile only
 */
router.get('/:id', verifyCustomer, ensureSameCustomer, async (req, res) => {
  try {
    const id = Number(req.params.id);

    const [[row]] = await pool.query(
      `
      SELECT id, username, first_name, last_name, email,
             phone, shipping_address, created_at
      FROM customers
      WHERE id = ?
      LIMIT 1
      `,
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

/**
 * PUT /api/customers/:id
 * Update MY profile
 */
router.put('/:id', verifyCustomer, ensureSameCustomer, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { first_name, last_name, email, phone, shipping_address } = req.body;

    if (!first_name || !last_name || !email || !phone || !shipping_address) {
      return res
        .status(400)
        .json({ ok: false, error: 'All fields are required' });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ ok: false, error: 'Invalid email format' });
    }

    await pool.query(
      `
      UPDATE customers
      SET first_name=?, last_name=?, email=?, phone=?, shipping_address=?
      WHERE id=?
      `,
      [first_name, last_name, email, phone, shipping_address, id]
    );

    res.json({ ok: true, message: 'Profile updated' });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

/**
 * PUT /api/customers/:id/password
 * Change MY password
 */
router.put(
  '/:id/password',
  verifyCustomer,
  ensureSameCustomer,
  async (req, res) => {
    try {
      const id = Number(req.params.id);
      const { old_password, new_password } = req.body;

      if (!old_password || !new_password || new_password.length < 6) {
        return res.status(400).json({
          ok: false,
          error: 'Invalid password input',
        });
      }

      const [[row]] = await pool.query(
        `SELECT password_hash FROM customers WHERE id=?`,
        [id]
      );

      const match = await bcrypt.compare(old_password, row.password_hash);
      if (!match) {
        return res.status(401).json({ ok: false, error: 'Incorrect password' });
      }

      const hash = await bcrypt.hash(new_password, 10);
      await pool.query(`UPDATE customers SET password_hash=? WHERE id=?`, [
        hash,
        id,
      ]);

      res.json({ ok: true, message: 'Password updated' });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  }
);

/* ---------------- ORDERS ---------------- */

/**
 * GET /api/customers/:id/orders
 * Get MY orders only
 */
router.get(
  '/:id/orders',
  verifyCustomer,
  ensureSameCustomer,
  async (req, res) => {
    try {
      const id = Number(req.params.id);

      const [orders] = await pool.query(
        `SELECT * FROM orders WHERE customer_id=? ORDER BY order_date DESC`,
        [id]
      );

      if (orders.length === 0) {
        return res.json({ ok: true, orders: [] });
      }

      const orderIds = orders.map((o) => o.id);

      const [items] = await pool.query(
        `
      SELECT order_id, isbn, book_title, unit_price, qty
      FROM order_items
      WHERE order_id IN (?)
      `,
        [orderIds]
      );

      const itemsByOrder = {};
      for (const item of items) {
        itemsByOrder[item.order_id] ??= [];
        itemsByOrder[item.order_id].push(item);
      }

      const enriched = orders.map((o) => ({
        ...o,
        items: itemsByOrder[o.id] || [],
      }));

      res.json({ ok: true, orders: enriched });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  }
);

module.exports = router;
