const Product = require('../models/Product');
const User = require('../models/User');
const Order = require('../models/Order');
const OrderService = require('../services/OrderService');
const AuditService = require('../services/AuditService');
const { broadcastEvent } = require('../utils/sse');
const { ORDER_STATUS } = require('../utils/constants');

/**
 * @desc Get SaaS Dashboard Stats
 */
const getAdminStats = async (req, res) => {
  try {
    const [productsCount, customersCount, ordersData, recentOrders] = await Promise.all([
      Product.countDocuments(),
      User.countDocuments(),
      Order.find({}),
      Order.find({}).sort({ createdAt: -1 }).limit(10).populate('user')
    ]);

    const totalSales = ordersData
      .filter(o => o.paymentStatus === 'paid' || o.status === ORDER_STATUS.DELIVERED)
      .reduce((acc, order) => acc + (order.total || 0), 0);

    const whatsappOrders = ordersData.filter(o => o.paymentMethod === 'whatsapp').length;
    const stripeOrders = ordersData.filter(o => o.paymentMethod === 'stripe').length;

    const monthly = Array.from({ length: 6 }).map((_, idx) => {
      const d = new Date();
      d.setMonth(d.getMonth() - idx);
      const monthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      
      const monthOrders = ordersData.filter(o => {
        const od = new Date(o.createdAt);
        return od.getFullYear() === d.getFullYear() && od.getMonth() === d.getMonth();
      });

      return {
        month: monthStr,
        sales: monthOrders
          .filter(o => o.paymentStatus === 'paid' || o.status === ORDER_STATUS.DELIVERED)
          .reduce((acc, o) => acc + (o.total || 0), 0),
        orders: monthOrders.length
      };
    });

    res.json({
      totalSales,
      orders: ordersData.length,
      products: productsCount,
      customers: customersCount,
      whatsappOrders,
      stripeOrders,
      conversionRate: customersCount > 0 ? ((ordersData.length / customersCount) * 100).toFixed(1) : 0,
      monthly: monthly.reverse(),
      recentOrders
    });
  } catch (e) {
    console.error('Stats error:', e);
    res.status(500).json({ message: 'Failed to load stats' });
  }
};

/**
 * @desc Get All Orders for Admin
 */
const getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find({})
      .populate('user')
      .populate('items.product')
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * @desc Update Order Status with strict transitions & Audit
 */
const updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const orderId = req.params.id;

    const updatedOrder = await OrderService.updateStatus(orderId, status, req.user._id);

    // Audit Log
    await AuditService.log(
      req.user._id,
      `UPDATE_STATUS_${status.toUpperCase()}`,
      'Order',
      orderId,
      { previousStatus: updatedOrder.statusHistory[updatedOrder.statusHistory.length - 2]?.status }
    );

    res.json(updatedOrder);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

/**
 * @desc Update Order Payment Status
 */
const updateOrderPaymentStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const orderId = req.params.id;

    const updatedOrder = await OrderService.updatePaymentStatus(orderId, status);
    res.json(updatedOrder);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

/**
 * @desc Delete Order
 */
const deleteOrder = async (req, res) => {
  try {
    const orderId = req.params.id;
    await OrderService.deleteOrder(orderId);
    res.json({ message: 'Order removed' });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

module.exports = { 
  getAdminStats, 
  getAllOrders, 
  updateOrderStatus,
  updateOrderPaymentStatus,
  deleteOrder
};
