const asyncHandler = require('express-async-handler');
const Stripe = require('stripe');

let stripeClient = null;

const getStripeClient = () => {
  if (stripeClient) return stripeClient;
  const apiKey = String(process.env.STRIPE_SECRET_KEY || '').trim();
  if (!apiKey) return null;
  stripeClient = new Stripe(apiKey);
  return stripeClient;
};

const createPaymentIntent = asyncHandler(async (req, res) => {
  const stripe = getStripeClient();
  if (!stripe) {
    res.status(503);
    throw new Error('Stripe is not configured');
  }

  const amountRaw = Number(req.body?.amount);
  const amount = Math.round(amountRaw);
  const currency = String(req.body?.currency || 'usd').trim().toLowerCase();

  if (!Number.isFinite(amountRaw) || !Number.isInteger(amount) || amount <= 0) {
    res.status(400);
    throw new Error('Amount must be a positive integer in cents');
  }

  if (!currency) {
    res.status(400);
    throw new Error('Currency is required');
  }

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency,
      automatic_payment_methods: { enabled: true },
    });
    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (err) {
    const rawMessage = String(err?.message || '').trim();
    const stripeType = err?.type;
    if (stripeType === 'StripeInvalidRequestError') {
      res.status(400);
    } else if (stripeType === 'StripeAuthenticationError') {
      res.status(502);
    } else if (stripeType) {
      res.status(502);
    } else {
      res.status(500);
    }
    if (stripeType === 'StripeAuthenticationError' || rawMessage.toLowerCase().includes('invalid api key')) {
      throw new Error('Payment service configuration error');
    }
    throw new Error(rawMessage || 'Stripe error');
  }
});

module.exports = { createPaymentIntent };
