const Product = require('../models/Product');
const User = require('../models/User');
const Order = require('../models/Order');
const { broadcastEvent } = require('../utils/sse');

const getAdminStats = async (req, res) => {
  try {
    const [products, customers, ordersData] = await Promise.all([
      Product.countDocuments(),
      User.countDocuments(),
      Order.find({ paymentStatus: 'paid' })
    ]);

    const totalOrders = ordersData.length;
    const totalSales = ordersData.reduce((acc, order) => acc + (order.total || 0), 0);

    const monthly = Array.from({ length: 6 }).map((_, idx) => {
      const d = new Date();
      d.setMonth(d.getMonth() - idx);
      const monthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      
      // Calculate monthly sales and orders
      const monthOrders = ordersData.filter(o => {
        const od = new Date(o.createdAt);
        return od.getFullYear() === d.getFullYear() && od.getMonth() === d.getMonth();
      });

      return {
        month: monthStr,
        sales: monthOrders.reduce((acc, o) => acc + (o.total || 0), 0),
        orders: monthOrders.length
      };
    });

    res.json({
      totalSales,
      orders: totalOrders,
      products,
      customers,
      monthly: monthly.reverse()
    });
  } catch (e) {
    console.error('Stats error:', e);
    res.status(500).json({ message: 'Failed to load stats' });
  }
};

module.exports = { getAdminStats };
