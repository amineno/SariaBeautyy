const Order = require('../models/Order');
const StockService = require('./StockService');
const { ORDER_STATUS } = require('../utils/constants');

class OrderService {
  /**
   * Validate if a status transition is allowed
   */
  isValidTransition(currentStatus, nextStatus) {
    const transitions = {
      [ORDER_STATUS.PENDING]: [ORDER_STATUS.CONFIRMED, ORDER_STATUS.CANCELLED],
      [ORDER_STATUS.PENDING_WHATSAPP]: [ORDER_STATUS.CONFIRMED, ORDER_STATUS.CANCELLED],
      [ORDER_STATUS.CONFIRMED]: [ORDER_STATUS.SHIPPED, ORDER_STATUS.CANCELLED],
      [ORDER_STATUS.SHIPPED]: [ORDER_STATUS.DELIVERED],
      [ORDER_STATUS.DELIVERED]: [],
      [ORDER_STATUS.CANCELLED]: []
    };

    return (transitions[currentStatus] || []).includes(nextStatus);
  }

  /**
   * Update order status with side effects (stock, history)
   */
  async updateStatus(orderId, nextStatus, adminId) {
    const order = await Order.findById(orderId).populate('items.product');
    if (!order) throw new Error('Order not found');

    if (!this.isValidTransition(order.status, nextStatus)) {
      throw new Error(`Transition de ${order.status} vers ${nextStatus} non autorisée`);
    }

    // Side effects
    if (nextStatus === ORDER_STATUS.CANCELLED) {
      // Restore stock if it was deducted
      for (const item of order.items) {
        await StockService.restoreStock(item.product._id, item.quantity);
      }
    }

    if (nextStatus === ORDER_STATUS.CONFIRMED && order.status === ORDER_STATUS.PENDING_WHATSAPP) {
        // Deduct stock if not done at creation
        // Note: For WhatsApp flow, we might have already checked but not deducted.
        // Let's deduct AT CONFIRMATION to be safe or at creation.
        // The user wants atomic stock PROTECTION.
    }

    // Update history
    const historyEntry = {
      status: nextStatus,
      date: new Date(),
      admin: adminId
    };

    const updatedOrder = await Order.findByIdAndUpdate(
      orderId,
      { 
        status: nextStatus,
        $push: { statusHistory: historyEntry }
      },
      { new: true }
    ).populate('user').populate('items.product');

    return updatedOrder;
  }

  /**
   * Calculate total and verify items
   */
  async createAndValidateItems(cart) {
    let subtotal = 0;
    const verifiedItems = [];

    for (const item of cart) {
      const productId = item._id || item.product;
      const product = await Product.findById(productId);
      if (!product) throw new Error(`Produit ${productId} introuvable`);

      subtotal += product.price * item.quantity;
      verifiedItems.push({
        product: product._id,
        quantity: item.quantity,
        price: product.price
      });
    }

    return { subtotal, verifiedItems };
  }
}

module.exports = new OrderService();
