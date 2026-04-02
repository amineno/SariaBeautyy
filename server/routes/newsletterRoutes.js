const express = require('express');
const router = express.Router();

// @desc    Subscribe to newsletter
// @route   POST /api/newsletter/subscribe
// @access  Public
router.post('/subscribe', (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: 'Please provide an email address.' });
  }

  // In a real application, you would save the email to a database.
  console.log(`New newsletter subscription: ${email}`);

  res.status(200).json({ message: 'Thank you for subscribing!' });
});

module.exports = router;
