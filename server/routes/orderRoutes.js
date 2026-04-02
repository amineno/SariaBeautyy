const express = require('express');
const router = express.Router();
const { createOrder, getOrderById, getMyOrders, getAllOrders, updateOrderStatus } = require('../controllers/orderController');
const { protect, admin } = require('../middleware/authMiddleware');

router.route('/').post(protect, createOrder);
router.route('/myorders').get(protect, getMyOrders);
router.route('/all').get(protect, admin, getAllOrders);
router.route('/:id/status').put(protect, admin, updateOrderStatus);
router.route('/:id').get(protect, getOrderById);

module.exports = router;
