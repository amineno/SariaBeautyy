const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/authMiddleware');
const { uploadImage } = require('../controllers/uploadController');

// Increase JSON body limit for base64 data URLs
router.use(express.json({ limit: '20mb' }));

router.post('/', protect, admin, uploadImage);

module.exports = router;
