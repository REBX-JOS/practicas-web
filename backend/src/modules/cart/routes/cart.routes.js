const express = require('express');
const cartController = require('../controllers/cart.controller');

const router = express.Router();

router.get('/', cartController.getCart);
router.get('/receipt.xml', cartController.getReceiptXml);
router.post('/items', cartController.addItem);
router.patch('/items/:productId', cartController.updateItemQuantity);
router.delete('/items/:productId', cartController.removeItem);
router.delete('/items', cartController.clearCart);

module.exports = router;
