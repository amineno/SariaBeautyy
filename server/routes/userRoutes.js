const express = require('express');
const router = express.Router();
const {
  authUser,
  registerUser,
  updateUserProfile,
  getUsers,
  updateUserAdmin,
  deleteUser,
  googleLogin,
  getWishlist,
  addToWishlist,
  removeFromWishlist,
} = require('../controllers/userController');
const { protect, admin } = require('../middleware/authMiddleware');

router.post('/login', authUser);
router.post('/google-login', googleLogin);
router.post('/', registerUser);
router.route('/profile').put(protect, updateUserProfile);
router.get('/', protect, admin, getUsers);
router.put('/:id/admin', protect, admin, updateUserAdmin);
router.delete('/:id', protect, admin, deleteUser);

// Wishlist routes
router.route('/wishlist').get(protect, getWishlist);
router.route('/wishlist/:id').post(protect, addToWishlist).delete(protect, removeFromWishlist);

module.exports = router;
