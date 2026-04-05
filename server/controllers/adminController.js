const Product = require('../models/Product');
const User = require('../models/User');
const { broadcastEvent } = require('../utils/sse');

const getAdminStats = async (req, res) => {
  try {
    const [products, customers] = await Promise.all([
      Product.countDocuments(),
      User.countDocuments()
    ]);
    const monthly = Array.from({ length: 6 }).map((_, idx) => {
      const d = new Date();
      d.setMonth(d.getMonth() - idx);
      return { month: `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`, sales: 0, orders: 0 };
    });
    res.json({
      totalSales: 0,
      orders: 0,
      products,
      customers,
      monthly: monthly.reverse()
    });
  } catch (e) {
    res.status(500).json({ message: 'Failed to load stats' });
  }
};

module.exports = { getAdminStats };
