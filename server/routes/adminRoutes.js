const express = require('express');
const router = express.Router();
const { protect, admin, protectOrQuery } = require('../middleware/authMiddleware');
const { getAdminStats } = require('../controllers/adminController');
const { registerClient } = require('../utils/sse');

router.get('/stats', protect, admin, getAdminStats);
router.get('/stream', protectOrQuery, admin, (req, res) => registerClient(res));

module.exports = router;
