const express = require('express');
const stripe = require('./stripe');
const pool = require('../db');
const { verifyToken } = require('../middleware/auth');
const jwt = require('jsonwebtoken');

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
            success_url: `${process.env.FRONTEND_URL}/c/checkout-success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.FRONTEND_URL}/c/cart`,
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

/**
 * POST /api/checkout/complete-order
 * Complete order after successful payment (fallback for local dev without webhooks)
 */
router.post('/complete-order', async (req, res) => {
    if (!stripe) {
        return res.status(503).json({ error: 'Stripe is not configured' });
    }

    try {
        const { session_id } = req.body;

        if (!session_id) {
            return res.status(400).json({ error: 'session_id is required' });
        }

        // Retrieve session from Stripe
        const session = await stripe.checkout.sessions.retrieve(session_id);

        if (!session || session.payment_status !== 'paid') {
            return res.status(400).json({ error: 'Payment not completed' });
        }

        // Determine customer id: prefer JWT cookie, otherwise use session.metadata
        let customerIdFromToken = null;
        try {
            const token = req.cookies?.access_token;
            if (token) {
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                customerIdFromToken = Number(decoded.id);
            }
        } catch (e) {
            // ignore token errors and fallback to metadata
        }

        const customerIdFromMetadata = session.metadata ? Number(session.metadata.customerId) : null;

        let customerId;
        if (customerIdFromToken) {
            if (customerIdFromMetadata && customerIdFromMetadata !== customerIdFromToken) {
                return res.status(403).json({ error: 'Session does not belong to authenticated user' });
            }
            customerId = customerIdFromToken;
        } else if (customerIdFromMetadata) {
            customerId = customerIdFromMetadata;
        } else {
            return res.status(401).json({ error: 'Unable to determine customer for this session' });
        }

        // Check if order already exists for this session
        const [[existing]] = await pool.query(
            'SELECT id FROM orders WHERE stripe_session_id = ?',
            [session_id]
        );

        if (existing) {
            return res.json({ ok: true, orderId: existing.id, message: 'Order already exists' });
        }

        // Extract card details from Stripe
        let cardLast4 = '0000';
        let cardExpiry = '12/99';
        try {
            if (session.payment_intent) {
                const pi = await stripe.paymentIntents.retrieve(session.payment_intent, { expand: ['payment_method'] });
                let pm = null;
                if (pi.payment_method && typeof pi.payment_method === 'string') {
                    pm = await stripe.paymentMethods.retrieve(pi.payment_method);
                } else if (pi.payment_method && pi.payment_method.card) {
                    pm = pi.payment_method;
                }
                if (pm && pm.card) {
                    cardLast4 = pm.card.last4 || cardLast4;
                    const mm = pm.card.exp_month;
                    const yy = pm.card.exp_year;
                    if (mm && yy) {
                        cardExpiry = `${String(mm).padStart(2, '0')}/${String(yy).slice(-2)}`;
                    }
                }
            }
        } catch (e) {
            console.warn('Unable to fetch card details from Stripe:', e.message);
        }

        const conn = await pool.getConnection();
        try {
            await conn.beginTransaction();

            const total = Number(session.amount_total) / 100;

            // 1) Create order with stripe session ID (idempotent under concurrency)
            let orderId;
            try {
                const [orderResult] = await conn.query(
                    `INSERT INTO orders (customer_id, order_date, total_price, stripe_session_id, card_last4, card_expiry)
                    VALUES (?, NOW(), ?, ?, ?, ?)`,
                    [customerId, total, session_id, cardLast4, cardExpiry]
                );
                orderId = orderResult.insertId;
            } catch (e) {
                if (e && e.code === 'ER_DUP_ENTRY') {
                    // Another process already created the order for this session.
                    // Roll back this transaction and return success using existing order.
                    await conn.rollback();
                    const [[existingAfter]] = await pool.query(
                        'SELECT id FROM orders WHERE stripe_session_id = ?',
                        [session_id]
                    );
                    if (existingAfter) {
                        console.log('ℹ️ Order already exists for session, returning OK:', existingAfter.id);
                        return res.json({ ok: true, orderId: existingAfter.id, message: 'Order already exists' });
                    }
                    // If we still cannot find it, bubble up error
                    throw e;
                }
                throw e;
            }

            // 2) Move cart -> sales
            await conn.query(
                `INSERT INTO sales (order_id, isbn, qty, amount, sale_date)
                 SELECT ?, b.isbn, ci.qty, (b.selling_price * ci.qty), NOW()
                FROM carts c
                JOIN cart_items ci ON ci.cart_id = c.id
                JOIN books b ON b.isbn = ci.isbn
                WHERE c.customer_id = ?`,
                [orderId, customerId]
            );

            // 2.a) Create order_items for receipt details
            await conn.query(
                `INSERT INTO order_items (order_id, isbn, book_title, unit_price, qty)
                SELECT ?, b.isbn, b.title, b.selling_price, ci.qty
                FROM carts c
                JOIN cart_items ci ON ci.cart_id = c.id
                JOIN books b ON b.isbn = ci.isbn
                WHERE c.customer_id = ?`,
                [orderId, customerId]
            );

            // 2.5) Decrement book stock by quantities purchased
            await conn.query(
                `UPDATE books b
                JOIN carts c ON c.customer_id = ?
                JOIN cart_items ci ON ci.cart_id = c.id AND ci.isbn = b.isbn
                SET b.stock_qty = GREATEST(0, b.stock_qty - ci.qty)`,
                [customerId]
            );

                        // 2.6) Auto-create pending publisher order when threshold crossed and none pending
                        await conn.query(
                                `INSERT INTO publisher_orders (isbn, publisher_id, order_qty, status)
                                 SELECT b.isbn, b.publisher_id, (b.threshold * 3), 'Pending'
                                FROM carts c
                                JOIN cart_items ci ON ci.cart_id = c.id
                                JOIN books b ON b.isbn = ci.isbn
                                WHERE c.customer_id = ?
                                    AND (GREATEST(0, b.stock_qty - ci.qty)) < b.threshold
                                    AND NOT EXISTS (
                                        SELECT 1 FROM publisher_orders po
                                        WHERE po.isbn = b.isbn AND po.status = 'Pending' LIMIT 1
                                    )`,
                                [customerId]
                        );

            // 3) Clear cart items
            await conn.query(
                `DELETE ci FROM cart_items ci
                JOIN carts c ON c.id = ci.cart_id
                WHERE c.customer_id = ?`,
                [customerId]
            );

            await conn.commit();
            console.log('✅ Order created manually:', orderId);
            res.json({ ok: true, orderId });
        } catch (e) {
            await conn.rollback();
            console.error('❌ Error creating order:', e);
            res.status(500).json({ error: 'Failed to create order' });
        } finally {
            conn.release();
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Order completion failed' });
    }
});

module.exports = router;
