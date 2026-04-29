const express = require('express');
const paypalController = require('../controllers/paypal.controller');

const router = express.Router();

router.post('/create-order', paypalController.createOrder);
router.post('/capture-order', paypalController.captureOrder);
router.get('/orders/:orderId', paypalController.getOrder);
router.get('/orders/:orderId/receipt.xml', paypalController.getOrderReceiptXml);

module.exports = router;
