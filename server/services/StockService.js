const Product = require('../models/Product');

/**
 * Service to handle product stock operations atomically
 */
class StockService {
  /**
   * Reserve stock (atomic decrement)
   * @param {string} productId 
   * @param {number} quantity 
   * @returns {Promise<boolean>} Success status
   */
  async deductStock(productId, quantity) {
    const product = await Product.findOneAndUpdate(
      { _id: productId, countInStock: { $gte: quantity } },
      { $inc: { countInStock: -quantity } },
      { new: true }
    );
    return !!product;
  }

  /**
   * Restore stock (atomic increment)
   * @param {string} productId 
   * @param {number} quantity 
   */
  async restoreStock(productId, quantity) {
    await Product.findByIdAndUpdate(
      productId,
      { $inc: { countInStock: quantity } }
    );
  }

  /**
   * Check if stock exists for multiple items
   * @param {Array} items [{product, quantity}]
   * @throws Error if stock insufficient
   */
  async checkStockAvailability(items) {
    for (const item of items) {
      const product = await Product.findById(item.product);
      if (!product || product.countInStock < item.quantity) {
        throw new Error(`Stock insuffisant pour ${product?.name || 'produit inconnu'}`);
      }
    }
  }
}

module.exports = new StockService();
