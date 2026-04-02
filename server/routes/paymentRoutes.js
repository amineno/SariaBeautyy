const express = require('express');
const router = express.Router();
const {
  createPaymentIntent,
  sendStripeApiKey,
  verifyPayPalPayment,
} = require('../controllers/paymentController');
const { protect } = require('../middleware/authMiddleware');

router.route('/config').get(sendStripeApiKey);
router.route('/create-payment-intent').post(protect, createPaymentIntent);
router.route('/paypal/verify').post(protect, verifyPayPalPayment);

module.exports = router;
