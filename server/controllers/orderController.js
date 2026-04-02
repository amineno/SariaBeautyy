const asyncHandler = require('express-async-handler');
const mongoose = require('mongoose');
const Order = require('../models/Order');
const Product = require('../models/Product');
const { broadcastEvent } = require('../utils/sse');

// @desc    Create new order
// @route   POST /api/orders
// @access  Private
const createOrder = asyncHandler(async (req, res) => {
  const {
    orderItems,
    shippingAddress,
    paymentMethod,
  } = req.body;

  if (orderItems && orderItems.length === 0) {
    res.status(400);
    throw new Error('No order items');
  } else if (!shippingAddress || !shippingAddress.address || !shippingAddress.city || !shippingAddress.postalCode || !shippingAddress.country) {
    res.status(400);
    throw new Error('Please provide complete shipping address');
  } else {
    const itemsWithPrices = [];
    let itemsPrice = 0;

    for (const item of orderItems) {
      const product = await Product.findById(item.product);
      if (!product) {
        res.status(400);
        throw new Error('Product not found');
      }
      const price = product.price;
      itemsWithPrices.push({
        name: item.name || product.name,
        qty: item.qty,
        image: item.image || product.image,
        price,
        product: product._id,
      });
      itemsPrice += price * item.qty;
    }

    const taxPrice = Number((0.15 * itemsPrice).toFixed(2)); // 15% Tax (Example)
    const shippingPrice = itemsPrice > 100 ? 0 : 10; // Free shipping over 100, else 10
    const totalPrice = Number((itemsPrice + taxPrice + shippingPrice).toFixed(2));

    const order = new Order({
      user: req.user._id,
      orderItems: itemsWithPrices,
      shippingAddress,
      paymentMethod,
      itemsPrice,
      taxPrice,
      shippingPrice,
      totalPrice,
    });

    const createdOrder = await order.save();
    // decrement stock
    for (const item of createdOrder.orderItems) {
      try {
        const p = await Product.findById(item.product);
        if (p) {
          p.countInStock = Math.max(0, (p.countInStock || 0) - item.qty);
          await p.save();
          broadcastEvent({ channel: 'product', type: 'product_updated', product: p });
        }
      } catch {}
    }
    broadcastEvent({ channel: 'order', type: 'order_created', order: createdOrder });
    res.status(201).json(createdOrder);
  }
});

// @desc    Get order by ID
// @route   GET /api/orders/:id
// @access  Private
const getOrderById = asyncHandler(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    res.status(404);
    throw new Error('Order not found');
  }
  const order = await Order.findById(req.params.id).populate('user', 'name email');
  if (order) {
    res.json(order);
  } else {
    res.status(404);
    throw new Error('Order not found');
  }
});

// @desc    Get logged in user orders
// @route   GET /api/orders/myorders
// @access  Private
const getMyOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({ user: req.user._id });
  res.json(orders);
});

// @desc    Get all orders (admin)
// @route   GET /api/orders/all
// @access  Private/Admin
const getAllOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({}).populate('user', 'name email').sort({ createdAt: -1 });
  res.json(orders);
});

// @desc    Update order status (paid/delivered)
// @route   PUT /api/orders/:id/status
// @access  Private/Admin
const updateOrderStatus = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }
  if (typeof req.body.isPaid === 'boolean') {
    order.isPaid = req.body.isPaid;
    order.paidAt = req.body.isPaid ? new Date() : undefined;
  }
  if (typeof req.body.isDelivered === 'boolean') {
    order.isDelivered = req.body.isDelivered;
    order.deliveredAt = req.body.isDelivered ? new Date() : undefined;
  }
  const saved = await order.save();
  broadcastEvent({ channel: 'order', type: 'order_updated', order: saved });
  res.json(saved);
});

module.exports = { createOrder, getOrderById, getMyOrders, getAllOrders, updateOrderStatus };
