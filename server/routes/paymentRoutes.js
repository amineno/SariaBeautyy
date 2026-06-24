const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { orderRateLimiter } = require('../middleware/rateLimitMiddleware');
const { 
  createWhatsAppOrder, 
  getMyOrders, 
  createPaymentIntent,
  createOrder 
} = require('../controllers/paymentController');

// WhatsApp Order Creation (with strict rate limiting)
router.post('/whatsapp', protect, orderRateLimiter, createWhatsAppOrder);

// User Profile Orders
router.get('/my-orders', protect, getMyOrders);

// Deprecated or Future endpoints
router.post('/create-intent', protect, createPaymentIntent);
router.post('/order', protect, createOrder);

module.exports = router;
