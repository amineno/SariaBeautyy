const express = require('express');
const router = express.Router();
const { protect, admin, protectOrQuery } = require('../middleware/authMiddleware');
const { getAdminStats } = require('../controllers/adminController');
const { registerClient } = require('../utils/sse');
const Order = require('../models/Order');

router.get('/stats', protect, admin, getAdminStats);
router.get('/stream', protectOrQuery, admin, (req, res) => registerClient(res));

// Get all paid orders with delivery status
router.get('/orders', protect, admin, async (req, res) => {
  try {
    const orders = await Order.find({ paymentStatus: 'paid' }).populate('user').populate('items.product');
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update order status (e.g., mark as delivered)
router.put('/orders/:id/status', protect, admin, async (req, res) => {
  try {
    const { status } = req.body;
    const order = await Order.findByIdAndUpdate(req.params.id, { status }, { new: true }).populate('user').populate('items.product');
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    res.json(order);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
