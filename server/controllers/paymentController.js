const asyncHandler = require('express-async-handler');
const Stripe = require('stripe');
const https = require('https');
const Order = require('../models/Order');
const User = require('../models/User');
const { broadcastEvent } = require('../utils/sse');
const { sendOrderConfirmation, sendAdminNewOrderAlert } = require('../utils/sendEmail');

let stripeClient = null;

const getStripeClient = () => {
  if (stripeClient) return stripeClient;
  const apiKey = process.env.STRIPE_SECRET_KEY;
  if (!apiKey) return null;
  stripeClient = new Stripe(apiKey);
  return stripeClient;
};

// @desc    Send Stripe Publishable Key
// @route   GET /api/payment/config
// @access  Public
const sendStripeApiKey = asyncHandler(async (req, res) => {
  res.json({
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
  });
});

// @desc    Create Payment Intent
// @route   POST /api/payment/create-payment-intent
// @access  Private
const createPaymentIntent = asyncHandler(async (req, res) => {
  const stripe = getStripeClient();
  if (!stripe) {
    res.status(503);
    throw new Error('Stripe is not configured');
  }

  const { orderId } = req.body;
  const currency = 'aed';

  if (!orderId) {
    res.status(400);
    throw new Error('Order ID is required');
  }

  const order = await Order.findById(orderId);

  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }

  if (!order.user.equals(req.user._id)) {
    res.status(403);
    throw new Error('Not authorized to pay for this order');
  }

  if (order.isPaid) {
    res.status(400);
    throw new Error('Order is already paid');
  }

  const amountInCents = Math.round(order.totalPrice * 100);

  try {
    let paymentIntent;

    if (order.stripePaymentIntentId) {
      paymentIntent = await stripe.paymentIntents.retrieve(order.stripePaymentIntentId);
    }

    if (!paymentIntent || paymentIntent.status === 'canceled') {
      paymentIntent = await stripe.paymentIntents.create(
        {
          amount: amountInCents,
          currency,
          automatic_payment_methods: {
            enabled: true,
          },
          metadata: {
            orderId: String(order._id),
          },
        },
        {
          idempotencyKey: `order_${order._id}`,
        }
      );

      order.stripePaymentIntentId = paymentIntent.id;
      order.paymentProvider = 'Stripe';
      await order.save();
    } else if (paymentIntent.status === 'succeeded') {
      res.status(400);
      throw new Error('Payment already succeeded for this order');
    }

    res.send({
      clientSecret: paymentIntent.client_secret,
    });
  } catch (error) {
    console.error('Stripe Error:', error);
    res.status(400);
    throw new Error(error.message);
  }
});

const getPayPalBaseUrl = () => {
  if (process.env.PAYPAL_MODE === 'live') {
    return 'https://api-m.paypal.com';
  }
  return 'https://api-m.sandbox.paypal.com';
};

const getPayPalAccessToken = () =>
  new Promise((resolve, reject) => {
    const clientId = process.env.PAYPAL_CLIENT_ID;
    const secret = process.env.PAYPAL_SECRET;

    if (!clientId || !secret) {
      reject(new Error('PayPal credentials are not configured'));
      return;
    }

    const auth = Buffer.from(`${clientId}:${secret}`).toString('base64');
    const data = 'grant_type=client_credentials';
    const baseUrl = getPayPalBaseUrl();

    const req = https.request(
      `${baseUrl}/v1/oauth2/token`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': data.length,
        },
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => {
          body += chunk;
        });
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            try {
              const parsed = JSON.parse(body);
              resolve(parsed.access_token);
            } catch (e) {
              reject(new Error('Failed to parse PayPal token response'));
            }
          } else {
            reject(new Error('Failed to obtain PayPal access token'));
          }
        });
      }
    );

    req.on('error', (err) => {
      reject(err);
    });

    req.write(data);
    req.end();
  });

const getPayPalOrder = (accessToken, paypalOrderId) =>
  new Promise((resolve, reject) => {
    const baseUrl = getPayPalBaseUrl();
    const req = https.request(
      `${baseUrl}/v2/checkout/orders/${paypalOrderId}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => {
          body += chunk;
        });
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            try {
              resolve(JSON.parse(body));
            } catch (e) {
              reject(new Error('Failed to parse PayPal order response'));
            }
          } else {
            reject(new Error('Failed to fetch PayPal order details'));
          }
        });
      }
    );

    req.on('error', (err) => {
      reject(err);
    });

    req.end();
  });

const verifyPayPalPayment = asyncHandler(async (req, res) => {
  const { orderId, paypalOrderId } = req.body;

  if (!orderId || !paypalOrderId) {
    res.status(400);
    throw new Error('Order ID and PayPal order ID are required');
  }

  const order = await Order.findById(orderId);

  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }

  if (!order.user.equals(req.user._id)) {
    res.status(403);
    throw new Error('Not authorized to verify this order');
  }

  if (order.isPaid) {
    res.status(400);
    throw new Error('Order is already paid');
  }

  try {
    const accessToken = await getPayPalAccessToken();
    const payPalOrder = await getPayPalOrder(accessToken, paypalOrderId);

    if (!payPalOrder || payPalOrder.status !== 'COMPLETED') {
      res.status(400);
      throw new Error('PayPal order is not completed');
    }

    const unit = payPalOrder.purchase_units && payPalOrder.purchase_units[0];
    const amount = unit && unit.amount;

    if (!amount || amount.currency_code !== 'AED') {
      res.status(400);
      throw new Error('Invalid PayPal currency');
    }

    const expectedTotal = order.totalPrice.toFixed(2);

    if (amount.value !== expectedTotal) {
      res.status(400);
      throw new Error('PayPal amount does not match order total');
    }

    order.isPaid = true;
    order.paidAt = new Date();
    order.paymentMethod = 'PayPal';
    order.paymentProvider = 'PayPal';
    order.paymentResult = {
      id: payPalOrder.id,
      status: payPalOrder.status,
      update_time: payPalOrder.update_time || new Date().toISOString(),
      email_address:
        (payPalOrder.payer && payPalOrder.payer.email_address) || undefined,
    };
    order.paypalOrderId = payPalOrder.id;

    const saved = await order.save();
    broadcastEvent({ channel: 'order', type: 'order_updated', order: saved });

    // Send Emails
    try {
      const user = await User.findById(order.user);
      if (user) {
        await sendOrderConfirmation(saved, user);
        await sendAdminNewOrderAlert(saved);
      }
    } catch (emailError) {
      console.error('Email confirmation error:', emailError);
    }

    res.json(saved);
  } catch (error) {
    console.error('PayPal verification error:', error);
    res.status(400);
    throw new Error(error.message || 'PayPal verification failed');
  }
});

const stripeWebhook = async (req, res) => {
  const stripe = getStripeClient();
  if (!stripe || !process.env.STRIPE_WEBHOOK_SECRET) {
    res.status(503).send('Stripe webhook is not configured');
    return;
  }

  const sig = req.headers['stripe-signature'];

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Stripe webhook signature verification failed:', err.message);
    res.status(400).send(`Webhook Error: ${err.message}`);
    return;
  }

  try {
    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object;
      const metadataOrderId =
        paymentIntent.metadata && paymentIntent.metadata.orderId;

      let order = null;

      if (metadataOrderId) {
        order = await Order.findById(metadataOrderId);
      }

      if (!order) {
        order = await Order.findOne({
          stripePaymentIntentId: paymentIntent.id,
        });
      }

      if (order && !order.isPaid) {
        order.isPaid = true;
        order.paidAt = new Date();
        order.paymentProvider = 'Stripe';
        order.stripePaymentIntentId = paymentIntent.id;
        order.paymentResult = {
          id: paymentIntent.id,
          status: paymentIntent.status,
          update_time: new Date().toISOString(),
          email_address:
            paymentIntent.receipt_email ||
            (paymentIntent.charges &&
              paymentIntent.charges.data &&
              paymentIntent.charges.data[0] &&
              paymentIntent.charges.data[0].billing_details &&
              paymentIntent.charges.data[0].billing_details.email) ||
            undefined,
        };

        const saved = await order.save();
        broadcastEvent({ channel: 'order', type: 'order_updated', order: saved });

        // Send Emails
        try {
          const user = await User.findById(order.user);
          if (user) {
            await sendOrderConfirmation(saved, user);
            await sendAdminNewOrderAlert(saved);
          }
        } catch (emailError) {
          console.error('Email confirmation error:', emailError);
        }
      }
    } else if (event.type === 'payment_intent.payment_failed') {
      const paymentIntent = event.data.object;
      const order = await Order.findOne({
        stripePaymentIntentId: paymentIntent.id,
      });

      if (order && !order.isPaid) {
        order.paymentResult = {
          id: paymentIntent.id,
          status: paymentIntent.status,
          update_time: new Date().toISOString(),
          email_address:
            paymentIntent.receipt_email ||
            (paymentIntent.charges &&
              paymentIntent.charges.data &&
              paymentIntent.charges.data[0] &&
              paymentIntent.charges.data[0].billing_details &&
              paymentIntent.charges.data[0].billing_details.email) ||
            undefined,
        };

        const saved = await order.save();
        broadcastEvent({ channel: 'order', type: 'order_updated', order: saved });
      }
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Stripe webhook handler error:', error);
    res.status(500).send('Webhook handler error');
  }
};

module.exports = {
  createPaymentIntent,
  sendStripeApiKey,
  verifyPayPalPayment,
  stripeWebhook,
};
