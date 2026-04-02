const express = require('express');
const router = express.Router();
const { getProducts, getProductById, createProduct, updateProduct, deleteProduct, getCategories, addProductReview, deleteProductReview, getTopProducts } = require('../controllers/productController');
const { protect, admin, userOnly } = require('../middleware/authMiddleware');
const { registerClient } = require('../utils/sse');

router.get('/', getProducts);
router.get('/top', getTopProducts);
router.get('/events', (req, res) => registerClient(res));
router.get('/:id', getProductById);
router.get('/categories/list', getCategories);
router.post('/', protect, admin, createProduct);
router.put('/:id', protect, admin, updateProduct);
router.delete('/:id', protect, admin, deleteProduct);
router.post('/:id/reviews', protect, userOnly, addProductReview);
router.delete('/:id/reviews/:reviewId', protect, admin, deleteProductReview);

module.exports = router;
