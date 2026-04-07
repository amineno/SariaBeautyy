const asyncHandler = require('express-async-handler');
const Stripe = require('stripe');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const Order = require('../models/Order');
const Product = require('../models/Product');

const createPaymentIntent = asyncHandler(async (req, res) => {
  if (!stripe) {
    res.status(503);
    throw new Error('Stripe is not configured');
  }

  const { items } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    res.status(400);
    throw new Error('No items in cart');
  }

  // Securely recalculate amount from DB
  let amountCents = 0;
  const safeItemsForMetadata = [];

  for (const item of items) {
    const qty = Number(item.qty || item.quantity);
    
    // Validate quantity: must be integer between 1 and 100
    if (!Number.isInteger(qty) || qty < 1 || qty > 100) {
      res.status(400);
      throw new Error(`Invalid quantity for product ${item._id || item.productId}`);
    }

    const product = await Product.findById(item._id || item.productId);
    if (!product) {
      res.status(404);
      throw new Error(`Product not found: ${item.name || item._id}`);
    }
    
    if (product.price <= 0) {
      res.status(400);
      throw new Error(`Invalid price for product ${product.name}`);
    }
    
    // Amount in cents (backend price is USD)
    amountCents += Math.round(product.price * 100 * qty);
    
    // Minimal data for metadata to stay within Stripe's limits (50 keys, 500 chars per value)
    safeItemsForMetadata.push({
      id: product._id.toString(),
      qty: qty
    });
  }

  if (amountCents <= 0) {
    res.status(400);
    throw new Error('Invalid order total');
  }

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: 'usd',
      automatic_payment_methods: { enabled: true },
      metadata: {
        userId: req.user._id.toString(),
        // Only store IDs and quantities to re-verify in webhook
        items: JSON.stringify(safeItemsForMetadata)
      }
    });
    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (err) {
    console.error('Payment Intent Error:', err.message);
    const stripeType = err?.type;
    res.status(stripeType === 'StripeInvalidRequestError' ? 400 : 502);
    throw new Error('Failed to initialize payment');
  }
});

// Webhook Handler for production-ready reliability
const stripeWebhook = async (req, res) => {
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
  
  let event;

  if (endpointSecret) {
    const sig = req.headers['stripe-signature'];
    try {
      event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch (err) {
      console.error(`Webhook signature verification failed: ${err.message}`);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }
  } else {
    // In production, endpointSecret MUST be set
    if (process.env.NODE_ENV === 'production') {
      console.error('Webhook Error: STRIPE_WEBHOOK_SECRET is missing in production');
      return res.status(400).send('Webhook Error: Missing secret');
    }
    event = req.body;
  }

  // Handle the event
  switch (event.type) {
    case 'payment_intent.succeeded': {
      const paymentIntent = event.data.object;
      console.log(`[Stripe Webhook] Processing payment_intent.succeeded: ${paymentIntent.id}`);
      
      try {
        const { userId, items } = paymentIntent.metadata;

        // 1. Validate metadata existence
        if (!userId || !items) {
          console.error(`[Stripe Webhook Error] Missing metadata for PI: ${paymentIntent.id}`);
          return res.status(400).send('Webhook Error: Missing metadata');
        }

        // 2. Safe JSON parsing
        let metadataItems;
        try {
          metadataItems = JSON.parse(items);
        } catch (parseErr) {
          console.error(`[Stripe Webhook Error] Invalid JSON metadata for PI: ${paymentIntent.id}`);
          return res.status(400).send('Webhook Error: Invalid metadata format');
        }

        // 3. Check if order already exists (idempotency)
        const orderExists = await Order.findOne({ paymentIntentId: paymentIntent.id });
        if (orderExists) {
          console.log(`[Stripe Webhook] Order already exists for PI: ${paymentIntent.id}. Skipping creation.`);
          return res.json({ received: true });
        }

        // 4. RE-FETCH products from DB and recalculate total
        let verifiedTotalCents = 0;
        const verifiedOrderItems = [];

        for (const item of metadataItems) {
          const product = await Product.findById(item.id);
          
          // 5. Strict Product Validation: Do NOT allow missing products
          if (!product) {
            const errorMsg = `Critical Webhook Error: Product ${item.id} not found for PI: ${paymentIntent.id}`;
            console.error(`[Stripe Webhook Error] ${errorMsg}`);
            // Return 4xx to Stripe to stop retries if it's a permanent error, 
            // but for product sync issues, 500 might be safer to trigger a retry.
            // Given the requirement, we throw/reject.
            return res.status(400).send(`Webhook Error: Product not found ${item.id}`);
          }
          
          verifiedTotalCents += Math.round(product.price * 100 * item.qty);
          verifiedOrderItems.push({
            product: product._id,
            quantity: item.qty,
            price: product.price
          });
        }

        // 6. Final Amount Security Check: Compare recalculated total with Stripe's amount
        if (verifiedTotalCents !== paymentIntent.amount) {
          console.error(`[Stripe Webhook Error] Amount mismatch for PI: ${paymentIntent.id}. Expected ${paymentIntent.amount}, calculated ${verifiedTotalCents}`);
          return res.status(400).send('Webhook Error: Amount mismatch');
        }

        const order = new Order({
          user: userId,
          items: verifiedOrderItems,
          total: verifiedTotalCents / 100,
          paymentStatus: 'paid',
          status: 'pending',
          paymentIntentId: paymentIntent.id
        });

        await order.save();
        console.log(`[Stripe Webhook Success] Order ${order._id} created for user ${userId}`);
      } catch (err) {
        console.error(`[Stripe Webhook Exception] PI: ${paymentIntent.id}: ${err.message}`);
        // Returning 500 triggers Stripe's automatic retry mechanism (exponential backoff)
        return res.status(500).send('Internal Server Error');
      }
      break;
    }

    case 'payment_intent.payment_failed': {
      const paymentIntent = event.data.object;
      console.error(`[Stripe Webhook Failure] Payment failed for PI ${paymentIntent.id}: ${paymentIntent.last_payment_error?.message}`);
      break;
    }

    case 'payment_intent.processing': {
      console.log(`[Stripe Webhook] Payment processing for PI: ${event.data.object.id}`);
      break;
    }

    default:
      console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
  }

  res.json({ received: true });
};

const createOrder = asyncHandler(async (req, res) => {
  // This manual order creation is now deprecated for security
  res.status(403);
  throw new Error('Order creation must be handled via Stripe Webhook');
});

const getMyOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });
  res.json(orders);
});

module.exports = { createPaymentIntent, stripeWebhook, createOrder, getMyOrders };
