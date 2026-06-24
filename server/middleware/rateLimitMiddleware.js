const rateLimit = require('express-rate-limit');

// 100 requests per 15 minutes for admin
const adminRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { message: 'Trop de requêtes admin. Veuillez patienter 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// 5 requests per 15 minutes for public order creation (prevent spam)
const orderRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { message: 'Trop de commandes. Veuillez patienter avant de réessayer.' },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { adminRateLimiter, orderRateLimiter };
