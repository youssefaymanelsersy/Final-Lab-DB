const stripe = require("../stripe");
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

      // 1) create order
      const total = Number(session.amount_total) / 100;

      const [orderResult] = await conn.query(
        `
        INSERT INTO orders (customer_id, order_date, total_price)
        VALUES (?, NOW(), ?)
        `,
        [customerId, total]
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
