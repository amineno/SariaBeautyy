const express = require('express');
const router = express.Router();
const { createPaymentIntent, createOrder, getMyOrders } = require('../controllers/paymentController');
const { protect } = require('../middleware/authMiddleware');

router.post('/create-payment-intent', protect, createPaymentIntent);
router.post('/order', protect, createOrder); // Deprecated: handled via webhook
router.get('/my-orders', protect, getMyOrders);

module.exports = router;
