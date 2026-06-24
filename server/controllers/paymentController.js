const asyncHandler = require('express-async-handler');
const Stripe = require('stripe');
const Order = require('../models/Order');
const Product = require('../models/Product');

// Feature flag for Stripe (default false in production unless specified)
const ENABLE_STRIPE = process.env.ENABLE_STRIPE === 'true';

// Helper to sanitize inputs
const sanitize = (str) => (str ? String(str).replace(/[<>]/g, '').trim() : '');

// Initializer for stripe (kept for future compatibility)
const getStripe = () => {
  if (!ENABLE_STRIPE) return null;
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY is missing');
  }
  return new Stripe(secretKey);
};

// @desc    WhatsApp Message Generator
const generateWhatsAppMessage = (order, customer, address, orderItems) => {
  let message = `🛒 *NOUVELLE COMMANDE*\n\n`;
  message += `👤 *CLIENT:*\n`;
  message += `Nom: ${customer.name}\n`;
  message += `Email: ${customer.email}\n`;
  message += `Téléphone: ${customer.phone}\n\n`;

  message += `📍 *ADRESSE:*\n`;
  message += `${address.address}, ${address.city}${address.postalCode ? `, ${address.postalCode}` : ''}\n`;
  if (address.notes) message += `Notes: ${address.notes}\n`;
  message += `\n`;

  message += `🛍️ *PRODUITS:*\n`;
  orderItems.forEach((item) => {
    message += `- ${item.name} x${item.quantity} = ${(item.price * item.quantity).toFixed(2)} DT\n`;
  });
  message += `\n`;

  message += `💰 *TOTAL: ${order.total.toFixed(2)} DT*\n\n`;
  message += `📌 Merci de confirmer la commande.`;
  return message;
};

// @desc    Create Stripe Payment Intent
// @route   POST /api/payment/create-intent
// @access  Private
const createPaymentIntent = asyncHandler(async (req, res) => {
  if (!ENABLE_STRIPE) {
    return res.status(400).json({ message: 'Stripe payments are currently disabled.' });
  }

  // Original Stripe logic would go here...
  res.status(400).json({ message: 'Stripe integration is currently paused.' });
});

const StockService = require('../services/StockService');
const WhatsAppService = require('../services/WhatsAppService');
const { ORDER_STATUS, PAYMENT_METHOD } = require('../utils/constants');

// @desc    Process order via WhatsApp
// @route   POST /api/payment/whatsapp
// @access  Private
const createWhatsAppOrder = asyncHandler(async (req, res) => {
  const { customer: rawCustomer, address: rawAddress, cart } = req.body;

  // 1. Sanitize Inputs
  const customer = {
    name: sanitize(rawCustomer?.name),
    email: sanitize(rawCustomer?.email),
    phone: sanitize(rawCustomer?.phone),
  };
  const address = {
    address: sanitize(rawAddress?.address),
    city: sanitize(rawAddress?.city),
    postalCode: sanitize(rawAddress?.postalCode),
    country: sanitize(rawAddress?.country) || 'TN',
    notes: sanitize(rawAddress?.notes),
  };

  // 2. Strict Validation
  if (!cart || !Array.isArray(cart) || cart.length === 0) {
    res.status(400);
    throw new Error('Votre panier est vide');
  }

  if (!customer.name || !customer.email || !customer.phone) {
    res.status(400);
    throw new Error('Informations client incomplètes');
  }

  // 3. Backend-only Logic & Stock Protection
  let subtotal = 0;
  const verifiedItems = [];
  const itemsForMessage = [];

  for (const item of cart) {
    const productId = item._id || item.product;
    const product = await Product.findById(productId);

    if (!product) {
      res.status(404);
      throw new Error(`Produit non trouvé: ${productId}`);
    }

    const quantity = parseInt(item.quantity);
    if (isNaN(quantity) || quantity <= 0) {
        res.status(400);
        throw new Error(`Quantité invalide pour ${product.name}`);
    }

    // ATOMIC STOCK RESERVATION
    const reserved = await StockService.deductStock(product._id, quantity);
    if (!reserved) {
      res.status(400);
      throw new Error(`Désolé, stock insuffisant pour ${product.name}`);
    }

    subtotal += product.price * quantity;
    verifiedItems.push({ product: product._id, quantity, price: product.price });
    itemsForMessage.push({ name: product.name, quantity, price: product.price });
  }

  const deliveryFee = 7.0;
  const total = subtotal + deliveryFee;

  // 4. Save Order
  const order = new Order({
    user: req.user._id,
    items: verifiedItems,
    total,
    paymentStatus: 'whatsapp',
    status: ORDER_STATUS.PENDING_WHATSAPP,
    paymentMethod: PAYMENT_METHOD.WHATSAPP,
    shippingAddress: address,
    phone: customer.phone,
    statusHistory: [{ status: ORDER_STATUS.PENDING_WHATSAPP, date: new Date() }]
  });

  await order.save();

  // 5. Generate secure message
  const message = WhatsAppService.generateOrderMessage(order, customer, address);
  const whatsappUrl = WhatsAppService.generateWhatsAppUrl(message);

  res.status(201).json({
    success: true,
    orderId: order._id,
    whatsappUrl,
    message // Sending the raw message too for CRM UI
  });
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

module.exports = { createPaymentIntent, stripeWebhook, createOrder, getMyOrders, createWhatsAppOrder };
