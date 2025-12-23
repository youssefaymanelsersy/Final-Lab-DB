const express = require('express');
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

// 6) Checkout
router.post('/:id/checkout', verifyCustomer, ensureSameCustomer, async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const customerId = Number(req.params.id);
    const { card_last4, card_expiry } = req.body;

    if (!card_last4 || !card_expiry) {
      return res.status(400).json({ ok: false, error: 'Payment info required' });
    }
    if (!/^\d{4}$/.test(card_last4)) {
      return res.status(400).json({ ok: false, error: 'Card last 4 digits must be numeric' });
    }
    if (!/^\d{2}\/\d{2}$/.test(card_expiry)) {
      return res.status(400).json({ ok: false, error: 'Invalid expiry format (use MM/YY)' });
    }

    const [month, year] = card_expiry.split('/').map(Number);
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear() % 100;
    const currentMonth = currentDate.getMonth() + 1;
    if (year < currentYear || (year === currentYear && month < currentMonth)) {
      return res.status(400).json({ ok: false, error: 'Card is expired' });
    }

    await conn.beginTransaction();

    const [[cart]] = await conn.query('SELECT id FROM carts WHERE customer_id = ?', [customerId]);
    if (!cart) throw new Error('Cart does not exist');

    const [items] = await conn.query(
      `SELECT b.isbn, b.title, b.selling_price, b.stock_qty, b.threshold, b.publisher_id, ci.qty
       FROM cart_items ci JOIN books b ON b.isbn = ci.isbn
       WHERE ci.cart_id=? FOR UPDATE`,
      [cart.id]
    );
    if (items.length === 0) throw new Error('Cart is empty');

    let total = 0;
    for (const item of items) {
      if (item.stock_qty < item.qty) throw new Error(`Not enough stock for ${item.title}`);
      total += item.qty * item.selling_price;
    }

    const [orderResult] = await conn.query(
      `INSERT INTO orders (customer_id, total_price, card_last4, card_expiry)
       VALUES (?, ?, ?, ?)`,
      [customerId, total, card_last4, card_expiry]
    );
    const orderId = orderResult.insertId;

    for (const item of items) {
      await conn.query(
        `INSERT INTO order_items (order_id, isbn, book_title, unit_price, qty)
         VALUES (?, ?, ?, ?, ?)`,
        [orderId, item.isbn, item.title, item.selling_price, item.qty]
      );
      await conn.query(
        `INSERT INTO sales (order_id, isbn, qty, amount)
         VALUES (?, ?, ?, ?)`,
        [orderId, item.isbn, item.qty, item.qty * item.selling_price]
      );
      await conn.query(
        `UPDATE books SET stock_qty = stock_qty - ? WHERE isbn = ?`,
        [item.qty, item.isbn]
      );

      const [[updatedBook]] = await conn.query(`SELECT stock_qty FROM books WHERE isbn = ?`, [item.isbn]);

      // Auto-replenish replacement for MySQL trigger (dedupe pending orders)
      if (Number(updatedBook?.stock_qty ?? 0) < item.threshold) {
        const [[existingPending]] = await conn.query(
          `SELECT id FROM publisher_orders WHERE isbn = ? AND status = 'Pending' LIMIT 1`,
          [item.isbn]
        );
        if (!existingPending) {
          await conn.query(
            `INSERT INTO publisher_orders (isbn, publisher_id, order_qty, status)
             VALUES (?, ?, ?, 'Pending')`,
            [item.isbn, item.publisher_id, item.threshold * 3]
          );
        }
      }
    }

    await conn.query('DELETE FROM cart_items WHERE cart_id=?', [cart.id]);
    await conn.commit();
    res.json({ ok: true, order_id: orderId });
  } catch (err) {
    await conn.rollback();
    res.status(400).json({ ok: false, error: err.message });
  } finally {
    conn.release();
  }
});

// 7) View past orders (with items)
router.get('/:id/orders', verifyCustomer, ensureSameCustomer, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const [orders] = await pool.query(`SELECT * FROM orders WHERE customer_id=? ORDER BY order_date DESC`, [id]);
    if (orders.length === 0) return res.json({ ok: true, orders: [] });

    const orderIds = orders.map((o) => o.id);
    const [items] = await pool.query(
      `SELECT order_id, isbn, book_title, unit_price, qty FROM order_items WHERE order_id IN (?)`,
      [orderIds]
    );
    const itemsByOrder = items.reduce((acc, item) => {
      acc[item.order_id] = acc[item.order_id] || [];
      acc[item.order_id].push(item);
      return acc;
    }, {});
    const enriched = orders.map((o) => ({ ...o, items: itemsByOrder[o.id] || [] }));
    res.json({ ok: true, orders: enriched });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
