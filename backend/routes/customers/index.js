const express = require('express');
const router = express.Router();

// Import all customer sub-routers
const profileRouter = require('./profile');
const cartRouter = require('./cart');
const ordersRouter = require('./orders');

// Mount each router directly (routes already include :id params)
router.use('/', profileRouter);
router.use('/', cartRouter);
router.use('/', ordersRouter);

module.exports = router;
