const express = require('express');
const router = express.Router();
const { protect, admin, protectOrQuery } = require('../middleware/authMiddleware');
const { adminRateLimiter } = require('../middleware/rateLimitMiddleware');
const { 
  getAdminStats, 
  getAllOrders, 
  updateOrderStatus 
} = require('../controllers/adminController');
const { registerClient } = require('../utils/sse');

// Apply admin rate limiting to all admin routes
router.use(protect, admin, adminRateLimiter);

/**
 * @route GET /api/admin/stats
 */
router.get('/stats', getAdminStats);

/**
 * @route GET /api/admin/stream (SSE)
 */
router.get('/stream', protectOrQuery, (req, res) => registerClient(res));

/**
 * @route GET /api/admin/orders
 */
router.get('/orders', getAllOrders);

/**
 * @route PUT /api/admin/orders/:id/status
 */
router.put('/orders/:id/status', updateOrderStatus);

module.exports = router;
