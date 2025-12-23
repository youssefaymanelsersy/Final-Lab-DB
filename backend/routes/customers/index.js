const express = require('express');
const router = express.Router();

// Import all customer sub-routers
const profileRouter = require('./profile');
const cartRouter = require('./cart');
const ordersRouter = require('./orders');

// Mount each router at its respective path
router.use('/profile', profileRouter);
router.use('/cart', cartRouter);
router.use('/orders', ordersRouter);

module.exports = router;
