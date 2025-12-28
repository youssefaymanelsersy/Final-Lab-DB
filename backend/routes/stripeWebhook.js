const stripe = require("./stripe");
const pool = require("../db");

module.exports = async (req, res) => {
  if (!stripe) {
    return res.status(503).json({ error: 'Stripe is not configured' });
  }

  const sig = req.headers["stripe-signature"];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return res.status(400).send("Webhook Error");
  }

  // payment success
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const customerId = Number(session.metadata.customerId);

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      // 0) Extract card details from Stripe (payment intent)
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
        console.warn('Webhook: unable to fetch card details from Stripe:', e.message);
      }

      // 1) create order
      const total = Number(session.amount_total) / 100;

      const [orderResult] = await conn.query(
        `
        INSERT INTO orders (customer_id, order_date, total_price, stripe_session_id, card_last4, card_expiry)
        VALUES (?, NOW(), ?, ?, ?, ?)
        `,
        [customerId, total, session.id, cardLast4, cardExpiry]
      );
      const orderId = orderResult.insertId;

      // 2) move cart -> sales (or order_items if you have it)
      await conn.query(
        `
        INSERT INTO sales (order_id, isbn, qty, amount, sale_date)
        SELECT 
          ?, b.isbn, ci.qty, (b.selling_price * ci.qty), NOW()
        FROM carts c
        JOIN cart_items ci ON ci.cart_id = c.id
        JOIN books b ON b.isbn = ci.isbn
        WHERE c.customer_id = ?
        `,
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

      // 2.5) decrement stock based on purchased quantities
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

      // 3) clear cart items
      await conn.query(
        `
        DELETE ci FROM cart_items ci
        JOIN carts c ON c.id = ci.cart_id
        WHERE c.customer_id = ?
        `,
        [customerId]
      );

      await conn.commit();
      console.log("✅ Order created from webhook:", orderId);
    } catch (e) {
      await conn.rollback();
      console.error("❌ webhook DB error:", e);
    } finally {
      conn.release();
    }
  }

  res.json({ received: true });
};
