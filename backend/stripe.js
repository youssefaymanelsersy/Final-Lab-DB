const Stripe = require('stripe');

const stripeKey = process.env.STRIPE_SECRET_KEY;

if (!stripeKey || stripeKey === 'sk_test_xxxxxxxxxxxxx') {
    console.warn('⚠️  Stripe not configured - checkout will not work');
    module.exports = null;
} else {
    const stripe = new Stripe(stripeKey, {
        apiVersion: '2023-10-16',
    });
    module.exports = stripe;
}
