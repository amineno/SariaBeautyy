const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcryptjs');

dotenv.config({ path: path.join(__dirname, '.env') });

const connectDB = require('./config/db');
const User = require('./models/User');
const PageContent = require('./models/PageContent');
const productRoutes = require('./routes/productRoutes');
const userRoutes = require('./routes/userRoutes');
const chatRoutes = require('./routes/chatRoutes');
const orderRoutes = require('./routes/orderRoutes');
const adminRoutes = require('./routes/adminRoutes');
const contactRoutes = require('./routes/contactRoutes');
const pageRoutes = require('./routes/pageRoutes');
const newsletterRoutes = require('./routes/newsletterRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const { stripeWebhook } = require('./controllers/paymentController');

connectDB();

const app = express();
const PORT = process.env.PORT || 5001;

// Global Rate Limiting
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // increased for SSE and multiple tabs
  message: 'Too many requests from this IP, please try again after 15 minutes',
  skip: (req) => req.path.endsWith('/events') // Skip rate limiting for SSE
});

app.use(globalLimiter);

const corsOptions = {};

const normalizeOrigin = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const unwrapped = raw.replace(/^['"`]+|['"`]+$/g, '');
  return unwrapped.replace(/\/$/, '').toLowerCase();
};

const defaultAllowedOrigins = [
  'https://www.sariabeauty.com',
  'https://sariabeauty.com',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
].map((o) => normalizeOrigin(o));

const envAllowedOrigins = String(process.env.CORS_ORIGIN || '')
  .split(',')
  .map((o) => normalizeOrigin(o))
  .filter(Boolean);

const allowedOrigins = Array.from(new Set([...defaultAllowedOrigins, ...envAllowedOrigins]));

const isAllowedOrigin = (origin) => {
  const normalizedOrigin = normalizeOrigin(origin);
  if (!normalizedOrigin) return true;
  if (allowedOrigins.includes(normalizedOrigin)) return true;

  try {
    const url = new URL(origin);
    if (url.protocol === 'https:' && (url.hostname === 'sariabeauty.com' || url.hostname.endsWith('.sariabeauty.com'))) {
      return true;
    }
  } catch {
    return false;
  }

  return false;
};

if (process.env.NODE_ENV === 'production') {
  corsOptions.origin = (origin, callback) => {
    if (isAllowedOrigin(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  };
} else {
  corsOptions.origin = true;
}

corsOptions.credentials = true;

const createPaymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
});

const webhookLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
});

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        connectSrc: ["'self'", "https://api-m.sandbox.paypal.com", "https://api-m.paypal.com", "https://api.stripe.com"],
        frameSrc: ["'self'", "https://js.stripe.com", "https://hooks.stripe.com"],
        scriptSrc: ["'self'", "'unsafe-inline'", "https://js.stripe.com"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https://*.stripe.com", "https://www.paypalobjects.com"],
      },
    },
    crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    const proto = req.headers['x-forwarded-proto'] || req.protocol;
    if (proto !== 'https') {
      const host = req.headers.host;
      return res.redirect(301, `https://${host}${req.originalUrl}`);
    }
    return next();
  });
}

app.post(
  '/api/payment/webhook',
  webhookLimiter,
  express.raw({ type: 'application/json' }),
  stripeWebhook
);

app.use(express.json({ limit: '20mb' }));

app.get('/', (req, res) => {
  res.send('Saria Beauty API is running');
});

app.get('/api/config/public', (req, res) => {
  res.json({
    googleClientId: process.env.GOOGLE_CLIENT_ID || '',
  });
});

app.use('/api/products', productRoutes);
app.use('/api/users', userRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/pages', pageRoutes);
app.use('/api/newsletter', newsletterRoutes);
app.use('/api/payment/create-payment-intent', createPaymentLimiter);
app.use('/api/payment/paypal/verify', createPaymentLimiter);
app.use('/api/payment', paymentRoutes);
app.use('/api/uploads', require('./routes/uploadRoutes'));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const seedAdmin = async () => {
  try {
    const email = process.env.ADMIN_EMAIL;
    const password = process.env.ADMIN_PASSWORD;
    const name = process.env.ADMIN_NAME || 'Administrator';
    if (email && password) {
      const normalizedEmail = String(email).trim().toLowerCase();
      const exists = await User.findOne({ email: normalizedEmail });
      if (!exists) {
        const admin = await User.create({ name, email: normalizedEmail, password, isAdmin: true });
        console.log(`Seeded admin: ${admin.email}`);
      } else {
        let shouldSave = false;
        if (!exists.isAdmin) {
          exists.isAdmin = true;
          shouldSave = true;
        }
        if (!exists.name) {
          exists.name = name;
          shouldSave = true;
        }
        const forceReset = String(process.env.ADMIN_FORCE_RESET || '').toLowerCase() === 'true';
        const passwordMatches =
          exists.password && (await bcrypt.compare(String(password), String(exists.password)));
        if (!exists.password || forceReset || !passwordMatches) {
          exists.password = password;
          shouldSave = true;
        }
        if (exists.email !== normalizedEmail) {
          exists.email = normalizedEmail;
          shouldSave = true;
        }
        if (shouldSave) {
          await exists.save();
          console.log(`Admin ensured: ${exists.email}`);
        }
      }
    }
  } catch (e) {
    console.error('Admin seed failed', e.message);
  }
};
const seedAboutPage = async () => {
  try {
    const exists = await PageContent.findOne({ page: 'about' });
    if (!exists) {
      await PageContent.create({
        page: 'about',
        title: 'About Saria Beauty',
        subtitle: 'Redefining elegance and self-care through a curated collection of premium beauty products.',
        mission: {
          title: 'Our Mission',
          content: 'At Saria Beauty, we believe that beauty is more than just skin deep. It\'s about confidence, elegance, and taking a moment for yourself in a busy world. Our mission is to deliver a luxurious shopping experience with trusted items and seamless service.',
          imageUrl: '/images/Gemini_Generated_Image_6qpale6qpale6qpa.png'
        },
        sections: [
          {
            icon: 'Heart',
            title: 'Passion for Beauty',
            content: 'We believe beauty is an art form and a way to express your unique self.'
          },
          {
            icon: 'Sparkles',
            title: 'Quality First',
            content: 'Every product is carefully selected and tested to meet our high standards.'
          },
          {
            icon: 'ShieldCheck',
            title: 'Trusted Service',
            content: 'Your satisfaction and trust are at the heart of everything we do.'
          }
        ]
      });
      console.log('Seeded About page content');
    }
  } catch (e) {
    console.error('About page seed failed', e.message);
  }
};

seedAdmin();
seedAboutPage();

app.use((err, req, res, next) => {
  if (err && err.message === 'Not allowed by CORS') {
    return res.status(403).json({ message: err.message });
  }
  const statusCode = res.statusCode && res.statusCode !== 200 ? res.statusCode : 500;
  res.status(statusCode).json({ message: err.message || 'Server Error' });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
