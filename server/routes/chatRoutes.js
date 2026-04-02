const express = require('express');
const router = express.Router();
const { getChatResponse } = require('../controllers/chatController');
const { registerClient } = require('../utils/sse');

// Chat endpoint
router.post('/', getChatResponse);

// SSE endpoint for real-time chat events
router.get('/events', (req, res) => {
  registerClient(res);
});

module.exports = router;
