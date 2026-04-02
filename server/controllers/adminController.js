const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const { broadcastEvent } = require('../utils/sse');

const getAdminStats = async (req, res) => {
  try {
    const [orders, products, customers] = await Promise.all([
      Order.find({}),
      Product.countDocuments(),
      User.countDocuments()
    ]);
    const totalSales = orders
      .filter(o => o.isPaid)
      .reduce((sum, o) => sum + Number(o.totalPrice || 0), 0);
    // monthly buckets for last 6 months
    const monthly = Array.from({ length: 6 }).map((_, idx) => {
      const d = new Date();
      d.setMonth(d.getMonth() - idx);
      return { month: `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`, sales: 0, orders: 0 };
    });
    orders.forEach(o => {
      const d = new Date(o.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
      const bucket = monthly.find(m => m.month === key);
      if (bucket) {
        bucket.orders += 1;
        bucket.sales += (o.isPaid ? Number(o.totalPrice || 0) : 0);
      }
    });
    res.json({
      totalSales,
      orders: orders.length,
      products,
      customers,
      monthly: monthly.reverse()
    });
  } catch (e) {
    res.status(500).json({ message: 'Failed to load stats' });
  }
};

module.exports = { getAdminStats };
