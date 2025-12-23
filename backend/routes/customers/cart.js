const express = require('express');
const pool = require('../../db');
const { verifyCustomer } = require('../../middleware/auth');

const router = express.Router();

async function getOrCreateCart(customerId) {
    const [[cart]] = await pool.query('SELECT id FROM carts WHERE customer_id = ?', [customerId]);
    if (cart) return cart;
    const [result] = await pool.query('INSERT INTO carts (customer_id) VALUES (?)', [customerId]);
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

/**
 * Update item quantity (SET exact qty)
 * PUT /api/customers/:id/cart/:isbn
 * Body: { qty }
 */
router.put('/:id/cart/:isbn', verifyCustomer, ensureSameCustomer, async (req, res) => {
    try {
        const id = Number(req.params.id);
        const isbn = String(req.params.isbn || '').trim();
        const qty = Number(req.body?.qty);

        if (!isbn) {
            return res.status(400).json({ ok: false, error: 'isbn is required' });
        }
        if (!Number.isFinite(qty)) {
            return res.status(400).json({ ok: false, error: 'qty is required' });
        }

        const cart = await getOrCreateCart(id);

        // qty <= 0 → remove item
        if (qty <= 0) {
            await pool.query(
                'DELETE FROM cart_items WHERE cart_id = ? AND isbn = ?',
                [cart.id, isbn]
            );
            return res.json({ ok: true, isbn, qty: 0 });
        }

        // optional stock check
        const [[book]] = await pool.query(
            'SELECT stock_qty FROM books WHERE isbn = ?',
            [isbn]
        );
        if (!book) {
            return res.status(404).json({ ok: false, error: 'Book not found' });
        }
        if (qty > Number(book.stock_qty)) {
            return res.status(400).json({
                ok: false,
                error: `not enough stock. Available: ${book.stock_qty}`,
            });
        }

        // SET exact quantity
        await pool.query(
            `
        INSERT INTO cart_items (cart_id, isbn, qty)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE qty = VALUES(qty)
        `,
            [cart.id, isbn, qty]
        );

        res.json({ ok: true, isbn, qty });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
}
);

// 3) View cart
router.get('/:id/cart', verifyCustomer, ensureSameCustomer, async (req, res) => {
    try {
        const id = Number(req.params.id);
        const cart = await getOrCreateCart(id);
        const [items] = await pool.query(
            `SELECT b.isbn, b.title, b.selling_price, ci.qty, (b.selling_price * ci.qty) AS total
            FROM cart_items ci JOIN books b ON b.isbn = ci.isbn
            WHERE ci.cart_id=?`,
            [cart.id]
        );
        const total = items.reduce((s, i) => s + Number(i.total || 0), 0);
        res.json({ ok: true, items, total });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

// 4) Add item to cart
router.post('/:id/cart', verifyCustomer, ensureSameCustomer, async (req, res) => {
    try {
        const id = Number(req.params.id);
        const { isbn, qty } = req.body;
        if (!isbn || qty <= 0) {
            return res.status(400).json({ ok: false, error: 'Invalid input' });
        }
        if (qty > 100) {
            return res.status(400).json({ ok: false, error: 'Maximum 100 items per book' });
        }
        const cart = await getOrCreateCart(id);
        await pool.query(
            `INSERT INTO cart_items (cart_id, isbn, qty)
            VALUES (?, ?, ?)
            ON DUPLICATE KEY UPDATE qty = qty + VALUES(qty)`,
            [cart.id, isbn, qty]
        );
        res.json({ ok: true, message: 'Item added to cart' });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

// 5) Remove item from cart
router.delete('/:id/cart/:isbn', verifyCustomer, ensureSameCustomer, async (req, res) => {
    try {
        const id = Number(req.params.id);
        const isbn = req.params.isbn;
        const cart = await getOrCreateCart(id);
        await pool.query('DELETE FROM cart_items WHERE cart_id=? AND isbn=?', [cart.id, isbn]);
        res.json({ ok: true, message: 'Item removed' });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

// 8) Logout (clear cart)
router.post('/:id/logout', verifyCustomer, ensureSameCustomer, async (req, res) => {
    try {
        const id = Number(req.params.id);
        const cart = await getOrCreateCart(id);
        await pool.query('DELETE FROM cart_items WHERE cart_id=?', [cart.id]);
        res.json({ ok: true, message: 'Logged out' });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

module.exports = router;
