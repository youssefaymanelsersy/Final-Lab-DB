const express = require('express');
const bcrypt = require('bcrypt');
const pool = require('../db');

const router = express.Router();

/**
 * 1) Update customer profile (NO password)
 * PUT /api/customers/:id
 */
router.put('/:id', async (req, res) => {
    try {
        const id = Number(req.params.id);
        const { first_name, last_name, email, phone, shipping_address } = req.body;

        if (!id || !first_name || !last_name || !email || !phone || !shipping_address) {
            return res.status(400).json({ ok: false, error: 'All fields are required' });
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
 * 2) Change password
 * PUT /api/customers/:id/password
 */
router.put('/:id/password', async (req, res) => {
    try {
        const id = Number(req.params.id);
        const { old_password, new_password } = req.body;

        if (!old_password || !new_password) {
            return res.status(400).json({ ok: false, error: 'Both passwords required' });
        }

        const [rows] = await pool.query(
            `SELECT password_hash FROM customers WHERE id=?`,
            [id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ ok: false, error: 'Customer not found' });
        }

        const match = await bcrypt.compare(old_password, rows[0].password_hash);
        if (!match) {
            return res.status(401).json({ ok: false, error: 'Incorrect password' });
        }

        const newHash = await bcrypt.hash(new_password, 10);
        await pool.query(
            `UPDATE customers SET password_hash=? WHERE id=?`,
            [newHash, id]
        );

        res.json({ ok: true, message: 'Password updated' });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

/**
 * 3) View cart
 * GET /api/customers/:id/cart
 */
router.get('/:id/cart', async (req, res) => {
    try {
        const id = Number(req.params.id);

        const [[cart]] = await pool.query(
            `SELECT id FROM carts WHERE customer_id=?`,
            [id]
        );

        const [items] = await pool.query(
            `
        SELECT b.isbn, b.title, b.selling_price, ci.qty,
             (b.selling_price * ci.qty) AS total
        FROM cart_items ci
        JOIN books b ON b.isbn = ci.isbn
        WHERE ci.cart_id=?
        `,
            [cart.id]
        );

        const total = items.reduce((s, i) => s + i.total, 0);

        res.json({ ok: true, items, total });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

/**
 * 4) Add item to cart
 * POST /api/customers/:id/cart
 */
router.post('/:id/cart', async (req, res) => {
    try {
        const id = Number(req.params.id);
        const { isbn, qty } = req.body;

        if (!isbn || qty <= 0) {
            return res.status(400).json({ ok: false, error: 'Invalid input' });
        }

        const [[cart]] = await pool.query(
            `SELECT id FROM carts WHERE customer_id=?`,
            [id]
        );

        await pool.query(
            `
        INSERT INTO cart_items (cart_id, isbn, qty)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE qty = qty + VALUES(qty)
        `,
            [cart.id, isbn, qty]
        );

        res.json({ ok: true, message: 'Item added to cart' });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

/**
 * 5) Remove item from cart
 * DELETE /api/customers/:id/cart/:isbn
 */
router.delete('/:id/cart/:isbn', async (req, res) => {
    try {
        const id = Number(req.params.id);
        const isbn = req.params.isbn;

        const [[cart]] = await pool.query(
            `SELECT id FROM carts WHERE customer_id=?`,
            [id]
        );

        await pool.query(
            `DELETE FROM cart_items WHERE cart_id=? AND isbn=?`,
            [cart.id, isbn]
        );

        res.json({ ok: true, message: 'Item removed' });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

/**
 * 6) Checkout
 * POST /api/customers/:id/checkout
 */
router.post('/:id/checkout', async (req, res) => {
    const conn = await pool.getConnection();
    try {
        const id = Number(req.params.id);
        const { card_last4, card_expiry } = req.body;

        await conn.beginTransaction();

        const [[cart]] = await conn.query(
            `SELECT id FROM carts WHERE customer_id=?`,
            [id]
        );

        const [items] = await conn.query(
            `
                SELECT ci.isbn, ci.qty, b.selling_price, b.title
                FROM cart_items ci
                JOIN books b ON b.isbn = ci.isbn
                WHERE ci.cart_id=?
            `,
            [cart.id]
        );

        let total = 0;
        for (const item of items) {
            total += item.qty * item.selling_price;
            await conn.query(
                `UPDATE books SET stock_qty = stock_qty - ? WHERE isbn=?`,
                [item.qty, item.isbn]
            );
        }

        const [order] = await conn.query(
            `
                INSERT INTO orders (customer_id, total_price, card_last4, card_expiry)
                VALUES (?, ?, ?, ?)
            `,
            [id, total, card_last4, card_expiry]
        );

        for (const item of items) {
            await conn.query(
                `
                INSERT INTO order_items
                (order_id, isbn, book_title, unit_price, qty)
                VALUES (?, ?, ?, ?, ?)
                `,
                [order.insertId, item.isbn, item.title, item.selling_price, item.qty]
            );

            await conn.query(
                `
                INSERT INTO sales (order_id, isbn, qty, amount)
                VALUES (?, ?, ?, ?)
                `,
                [
                order.insertId,
                item.isbn,
                item.qty,
                item.qty * item.selling_price
                ]
            );
}

        await conn.query(`DELETE FROM cart_items WHERE cart_id=?`, [cart.id]);
        await conn.commit();

        res.json({ ok: true, order_id: order.insertId });
    } catch (err) {
        await conn.rollback();
        res.status(500).json({ ok: false, error: err.message });
    } finally {
        conn.release();
    }
});

/**
 * 7) View past orders
 * GET /api/customers/:id/orders
 */
router.get('/:id/orders', async (req, res) => {
    try {
        const id = Number(req.params.id);

        const [orders] = await pool.query(
            `SELECT * FROM orders WHERE customer_id=? ORDER BY order_date DESC`,
            [id]
        );

        res.json({ ok: true, orders });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

/**
 * 8) Logout (clear cart)
 * POST /api/customers/:id/logout
 */
router.post('/:id/logout', async (req, res) => {
    try {
        const id = Number(req.params.id);

        const [[cart]] = await pool.query(
            `SELECT id FROM carts WHERE customer_id=?`,
            [id]
        );

        await pool.query(`DELETE FROM cart_items WHERE cart_id=?`, [cart.id]);

        res.json({ ok: true, message: 'Logged out' });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

module.exports = router;
