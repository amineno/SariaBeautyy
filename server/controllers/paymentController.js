const asyncHandler = require('express-async-handler');
const Stripe = require('stripe');
const Order = require('../models/Order');

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

const createOrder = asyncHandler(async (req, res) => {
  const { items, total, paymentIntentId } = req.body;

  if (!items || items.length === 0) {
    res.status(400);
    throw new Error('No order items');
  }

  const order = new Order({
    user: req.user._id,
    items: items.map(item => ({
      product: item.productId || item._id,
      quantity: item.qty || item.quantity,
      price: item.price
    })),
    total,
    paymentStatus: 'paid', // For now, assume paid if this is called after successful stripe payment
    status: 'pending'
  });

  const createdOrder = await order.save();
  res.status(201).json(createdOrder);
});

const getMyOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });
  res.json(orders);
});

module.exports = { createPaymentIntent, createOrder, getMyOrders };
