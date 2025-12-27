const express = require("express");
const router = express.Router();

// Import all admin sub-routers
const reportsRouter = require("./reports");
const publisherOrdersRouter = require("./publisherOrders");

const booksRouter = require("./books");
const customersRouter = require("./customers");

// Mount each router at its respective path
router.use("/reports", reportsRouter);
router.use("/publisher-orders", publisherOrdersRouter);

router.use("/books", booksRouter);
router.use("/customers", customersRouter);

module.exports = router;
