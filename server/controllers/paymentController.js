const asyncHandler = require('express-async-handler');
const Stripe = require('stripe');
const Order = require('../models/Order');
const Product = require('../models/Product');

// Initialize stripe inside a getter to ensure env vars are loaded
const getStripe = () => {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    console.error('[Stripe Config Error] STRIPE_SECRET_KEY is missing in environment variables');
    throw new Error('STRIPE_SECRET_KEY is not defined in environment variables');
  }
  
  // Log partially for verification without exposing full secret
  const keyHint = secretKey.startsWith('sk_test') ? 'Test Key' : 'Live Key';
  console.log(`[Stripe Config] Initializing Stripe with ${keyHint}`);
  
  return new Stripe(secretKey);
};

const createPaymentIntent = asyncHandler(async (req, res) => {
  let stripe;
  try {
    stripe = getStripe();
  } catch (err) {
    console.error('[Stripe Config Error]', err.message);
    res.status(500).json({ message: 'Payment provider configuration error' });
    return;
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
    const productId = item._id || item.productId;
    const qty = Number(item.qty || item.quantity);
    
    // Validate quantity: must be integer between 1 and 100
    if (!Number.isInteger(qty) || qty < 1 || qty > 100) {
      res.status(400);
      throw new Error(`Invalid quantity for product ${productId}`);
    }

    const product = await Product.findById(productId);
    if (!product) {
      res.status(404);
      throw new Error(`Product not found: ${productId}`);
    }
    
    if (product.price <= 0) {
      res.status(400);
      throw new Error(`Invalid price for product ${product.name}`);
    }
    
    // Amount in cents (backend price is USD)
    // We use Math.round to avoid floating point issues
    const priceInCents = Math.round(product.price * 100);
    amountCents += priceInCents * qty;
    
    // Minimal data for metadata to stay within Stripe's limits (50 keys, 500 chars per value)
    safeItemsForMetadata.push({
      id: product._id.toString(),
      qty: qty
    });
  }

  // Final check for amount and currency
  const currency = 'usd'; // Force USD as requested (not TND)
  
  if (!amountCents || isNaN(amountCents)) {
    res.status(400);
    throw new Error('Invalid total amount calculation');
  }

  if (amountCents < 50) { // Stripe minimum is 50 cents
    res.status(400);
    throw new Error('Total amount is too small (minimum $0.50)');
  }

  try {
    console.log(`[Stripe] Creating PaymentIntent for ${amountCents} cents in ${currency}`);
    
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amountCents), // Ensure it's an integer
      currency: currency,
      // Explicitly specify payment methods to avoid "No valid payment method types" error
      // if Automatic Payment Methods aren't fully configured in the dashboard.
      payment_method_types: ['card'],
      metadata: {
        userId: req.user._id.toString(),
        items: JSON.stringify(safeItemsForMetadata)
      }
    });
    
    console.log(`[Stripe Success] PaymentIntent created: ${paymentIntent.id}`);
    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (err) {
    console.error('[Stripe API Error Details]', {
      message: err.message,
      type: err.type,
      code: err.code,
      param: err.param,
      requestId: err.requestId
    });
    
    if (err.type === 'StripeAuthenticationError') {
      res.status(401).json({ message: 'Invalid Stripe API Key. Check your environment variables.' });
    } else if (err.type === 'StripeInvalidRequestError') {
      res.status(400).json({ message: err.message });
    } else {
      res.status(502).json({ message: 'Stripe gateway error: ' + err.message });
    }
  }
});

// Webhook Handler for production-ready reliability
const stripeWebhook = async (req, res) => {
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
  let stripe;
  try {
    stripe = getStripe();
  } catch (err) {
    console.error('[Stripe Webhook Config Error]', err.message);
    return res.status(500).send('Webhook config error');
  }
  
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

        // 7. Extract Shipping and Phone details
        const shipping = paymentIntent.shipping || {};
        const billing = paymentIntent.billing_details || {};
        const phone = shipping.phone || billing.phone;
        const address = shipping.address || billing.address || {};

        const order = new Order({
          user: userId,
          items: verifiedOrderItems,
          total: verifiedTotalCents / 100,
          paymentStatus: 'paid',
          status: 'pending',
          shippingAddress: {
            address: address.line1 + (address.line2 ? `, ${address.line2}` : ''),
            city: address.city,
            postalCode: address.postal_code,
            country: address.country
          },
          phone: phone,
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
  const orders = await Order.find({ user: req.user._id })
    .populate('items.product')
    .sort({ createdAt: -1 });
  res.json(orders);
});

module.exports = { createPaymentIntent, stripeWebhook, createOrder, getMyOrders };
