const express = require('express');
const bcrypt = require('bcrypt');
const pool = require('../db');
const { verifyCustomer } = require('../middleware/auth');

const router = express.Router();
// --- Helpers ---
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

/**
 * 1) Update customer profile (NO password)
 * PUT /api/customers/:id
 */
router.put('/:id', verifyCustomer, async (req, res) => {
    try {
        const id = Number(req.params.id);
        const { first_name, last_name, email, phone, shipping_address } = req.body;

        if (!id || !first_name || !last_name || !email || !phone || !shipping_address) {
            return res.status(400).json({ ok: false, error: 'All fields are required' });
        }

        // Validate email format
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
 * 2) Change password
 * PUT /api/customers/:id/password
 */
router.put('/:id/password', verifyCustomer, async (req, res) => {
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
router.get('/:id/cart', verifyCustomer, async (req, res) => {
    try {
        const id = Number(req.params.id);

        const cart = await getOrCreateCart(id);

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
router.post('/:id/cart', verifyCustomer, async (req, res) => {
    try {
        const id = Number(req.params.id);
        const { isbn, qty } = req.body;

        // Validate quantity: must be positive and reasonable (max 100 per item)
        if (!isbn || qty <= 0) {
            return res.status(400).json({ ok: false, error: 'Invalid input' });
        }
        if (qty > 100) {
            return res.status(400).json({ ok: false, error: 'Maximum 100 items per book' });
        }

        const cart = await getOrCreateCart(id);

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
router.delete('/:id/cart/:isbn', verifyCustomer, async (req, res) => {
    try {
        const id = Number(req.params.id);
        const isbn = req.params.isbn;

        const cart = await getOrCreateCart(id);

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
router.post('/:id/checkout', verifyCustomer, async (req, res) => {
    const conn = await pool.getConnection();
    try {
        const customerId = Number(req.params.id);
        const { card_last4, card_expiry } = req.body;

        if (!card_last4 || !card_expiry) {
            return res.status(400).json({ ok: false, error: 'Payment info required' });
        }

        // Validate card_last4 format (must be exactly 4 digits)
        if (!/^\d{4}$/.test(card_last4)) {
            return res.status(400).json({ ok: false, error: 'Card last 4 digits must be numeric' });
        }

        // Validate card_expiry format (MM/YY) and ensure it's not expired
        if (!/^\d{2}\/\d{2}$/.test(card_expiry)) {
            return res.status(400).json({ ok: false, error: 'Invalid expiry format (use MM/YY)' });
        }

        const [month, year] = card_expiry.split('/').map(Number);
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear() % 100; // Get last 2 digits
        const currentMonth = currentDate.getMonth() + 1; // Months are 0-indexed

        // Check if card is expired
        if (year < currentYear || (year === currentYear && month < currentMonth)) {
            return res.status(400).json({ ok: false, error: 'Card is expired' });
        }

        await conn.beginTransaction();

        const [[cart]] = await conn.query(
            'SELECT id FROM carts WHERE customer_id = ?',
            [customerId]
        );

        if (!cart) {
            throw new Error('Cart does not exist');
        }

        // 2) Lock books + cart items
        const [items] = await conn.query(
            `
        SELECT 
            b.isbn,
            b.title,
            b.selling_price,
            b.stock_qty,
            b.threshold,
            b.publisher_id,
            ci.qty
        FROM cart_items ci
        JOIN books b ON b.isbn = ci.isbn
        WHERE ci.cart_id=?
        FOR UPDATE
        `,
            [cart.id]
        );

        if (items.length === 0) {
            throw new Error('Cart is empty');
        }

        // 3) Validate stock
        let total = 0;
        for (const item of items) {
            if (item.stock_qty < item.qty) {
                throw new Error(`Not enough stock for ${item.title}`);
            }
            total += item.qty * item.selling_price;
        }

        // 4) Create order
        const [orderResult] = await conn.query(
            `
        INSERT INTO orders (customer_id, total_price, card_last4, card_expiry)
        VALUES (?, ?, ?, ?)
        `,
            [customerId, total, card_last4, card_expiry]
        );

        const orderId = orderResult.insertId;

        // 5) Process items
        for (const item of items) {
            // order_items
            await conn.query(
                `
        INSERT INTO order_items
        (order_id, isbn, book_title, unit_price, qty)
        VALUES (?, ?, ?, ?, ?)
        `,
                [orderId, item.isbn, item.title, item.selling_price, item.qty]
            );

            // sales
            await conn.query(
                `
        INSERT INTO sales (order_id, isbn, qty, amount)
        VALUES (?, ?, ?, ?)
        `,
                [orderId, item.isbn, item.qty, item.qty * item.selling_price]
            );

            // stock update
            await conn.query(
                `
        UPDATE books
        SET stock_qty = stock_qty - ?
        WHERE isbn = ?
        `,
                [item.qty, item.isbn]
            );

            // Fetch the actual updated stock from database for accurate threshold check
            // This ensures we use the current stock value, not the stale value from the initial SELECT
            const [[updatedBook]] = await conn.query(
                `SELECT stock_qty FROM books WHERE isbn = ?`,
                [item.isbn]
            );
            const newStock = updatedBook.stock_qty;

            // Auto-replenish replacement for MySQL trigger
            if (newStock < item.threshold) {
                await conn.query(
                    `
                INSERT INTO publisher_orders (isbn, publisher_id, order_qty, status)
                VALUES (?, ?, ?, 'Pending')
                `,
                    [item.isbn, item.publisher_id, item.threshold * 3]
                );
            }
        }

        // 7) Clear cart - moved OUTSIDE the loop to execute only ONCE after all items are processed
        // This ensures atomicity: either all items are processed and cart is cleared, or transaction rolls back
        await conn.query(`DELETE FROM cart_items WHERE cart_id=?`, [cart.id]);

        // Commit ONCE after all items and cart clearing are complete (not inside the loop)
        await conn.commit();
        res.json({ ok: true, order_id: orderId });

    } catch (err) {
        // Rollback entire transaction if any error occurs (maintains data integrity)
        await conn.rollback();
        res.status(400).json({ ok: false, error: err.message });
    } finally {
        // Always release connection back to pool, even if error occurs
        conn.release();
    }
});

/**
 * 7) View past orders
 * GET /api/customers/:id/orders
 */
router.get('/:id/orders', verifyCustomer, async (req, res) => {
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
router.post('/:id/logout', verifyCustomer, async (req, res) => {
    try {
        const id = Number(req.params.id);

        const cart = await getOrCreateCart(id);

        await pool.query(`DELETE FROM cart_items WHERE cart_id=?`, [cart.id]);

        res.json({ ok: true, message: 'Logged out' });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

module.exports = router;
