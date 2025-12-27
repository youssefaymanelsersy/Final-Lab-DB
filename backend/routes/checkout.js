const express = require('express');
const stripe = require('../stripe');
const pool = require('../db');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

/**
 * POST /api/checkout/create-session
 */
router.post('/create-session', verifyToken, async (req, res) => {
    if (!stripe) {
        return res.status(503).json({ error: 'Stripe is not configured. Please add valid Stripe API keys.' });
    }

    try {
        const customerId = req.user.id;

        // 1️⃣ Load cart from DB (SECURE)
        const [items] = await pool.query(`
            SELECT 
                c.qty,
                b.isbn,
                b.title,
                b.selling_price,
                b.cover_url
            FROM cart_items c
            JOIN books b ON b.isbn = c.isbn
            JOIN carts ca ON ca.id = c.cart_id
            WHERE ca.customer_id = ?
        `, [customerId]);

        if (items.length === 0) {
            return res.status(400).json({ error: 'Cart is empty' });
        }

        // 2️⃣ Convert to Stripe line items
        const lineItems = items.map(item => ({
            price_data: {
                currency: 'usd',
                product_data: {
                    name: item.title,
                    images: item.cover_url ? [item.cover_url] : [],
                },
                unit_amount: Math.round(item.selling_price * 100),
            },
            quantity: item.qty,
        }));

        // 3️⃣ Create checkout session
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            mode: 'payment',
            line_items: lineItems,
            success_url: `${process.env.CLIENT_URL}/checkout-success`,
            cancel_url: `${process.env.CLIENT_URL}/cart`,
            metadata: {
                customerId,
            },
        });

        res.json({ url: session.url });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Checkout failed' });
    }
});

module.exports = router;
