import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { useTranslation } from 'react-i18next';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { useCart } from '../hooks/useCart';
import { useCurrency } from '../context/CurrencyContext';
import { useAuth } from '../hooks/useAuth';

const stripePublicKey = String(import.meta.env.VITE_STRIPE_PUBLIC_KEY || '').trim();

if (!stripePublicKey) {
  console.error('[Stripe] VITE_STRIPE_PUBLIC_KEY is missing. Payment system will not work.');
}

// Initialize stripePromise outside the component to avoid re-creations
const stripePromise = stripePublicKey ? loadStripe(stripePublicKey) : null;

const CheckoutForm = ({ cartItems, payLabel, onSuccess }) => {
  const { t } = useTranslation();
  const stripe = useStripe();
  const elements = useElements();
  const [clientSecret, setClientSecret] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [countryCode, setCountryCode] = useState('TN');
  const [countryOther, setCountryOther] = useState('');

  useEffect(() => {
    let isActive = true;

    const init = async () => {
      if (!cartItems || cartItems.length === 0) return;
      
      // If no stripePromise, don't even try
      if (!stripePromise) {
        setErrorMessage(t('checkout.form.errors.stripe_not_configured'));
        return;
      }

      setIsLoading(true);
      setErrorMessage('');
      try {
        console.log('[Stripe] Initializing PaymentIntent...');
        // Amount is now securely calculated on the backend
        const { data } = await api.post('/payment/create-payment-intent', {
          items: cartItems,
        });
        
        if (!isActive) return;
        
        if (data?.clientSecret) {
          console.log('[Stripe] PaymentIntent initialized successfully');
          setClientSecret(String(data.clientSecret));
        } else {
          throw new Error('No client secret returned from server');
        }
      } catch (e) {
        if (!isActive) return;
        setClientSecret('');
        const msg = e.response?.data?.message || e.response?.data?.error || e.message || t('checkout.errors.payment_init_failed');
        console.error('[Stripe] Initialization failed:', msg);
        setErrorMessage(String(msg || ''));
        toast.error(msg);
      } finally {
        if (isActive) setIsLoading(false);
      }
    };

    init();
    return () => {
      isActive = false;
    };
  }, [cartItems, t]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements || !clientSecret) return;

    setErrorMessage('');
    const selectedCode = String(countryCode || '').trim().toUpperCase();
    const normalizedCountry =
      selectedCode === 'OTHER' ? String(countryOther || '').trim().toUpperCase() : selectedCode;
    if (!fullName.trim()) {
      toast.error(t('checkout.form.errors.name_required'));
      return;
    }
    if (!email.trim()) {
      toast.error(t('checkout.form.errors.email_required'));
      return;
    }
    const normalizedEmail = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      toast.error(t('checkout.form.errors.email_invalid'));
      return;
    }
    if (!phone.trim()) {
      toast.error(t('checkout.form.errors.phone_required'));
      return;
    }
    if (!addressLine1.trim()) {
      toast.error(t('checkout.form.errors.address_required'));
      return;
    }
    if (!city.trim()) {
      toast.error(t('checkout.form.errors.city_required'));
      return;
    }
    if (!postalCode.trim()) {
      toast.error(t('checkout.form.errors.postal_code_required'));
      return;
    }
    if (normalizedCountry.length !== 2) {
      toast.error(t('checkout.form.errors.country_code_required'));
      return;
    }

    setIsLoading(true);
    try {
      const result = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: elements.getElement(CardElement),
          billing_details: {
            name: fullName.trim(),
            email: normalizedEmail,
            phone: phone.trim(),
            address: {
              line1: addressLine1.trim(),
              line2: addressLine2.trim() || undefined,
              city: city.trim(),
              postal_code: postalCode.trim(),
              country: normalizedCountry,
            },
          },
        },
        shipping: {
          name: fullName.trim(),
          phone: phone.trim(),
          address: {
            line1: addressLine1.trim(),
            line2: addressLine2.trim() || undefined,
            city: city.trim(),
            postal_code: postalCode.trim(),
            country: normalizedCountry,
          },
        },
      });

      if (result.error) {
        const msg = result.error.message || t('checkout.form.errors.payment_failed');
        setErrorMessage(String(msg || ''));
        toast.error(msg);
        return;
      }

      if (result.paymentIntent?.status === 'succeeded') {
        toast.success(t('checkout.form.success.payment_successful'));
        if (typeof onSuccess === 'function') onSuccess(result.paymentIntent);
      } else {
        const msg = t('checkout.form.errors.payment_not_completed');
        setErrorMessage(String(msg || ''));
        toast.error(msg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/40 px-4 py-3">
          <div className="text-xs font-semibold text-gray-500 dark:text-gray-400">{t('checkout.steps.shipping')}</div>
          <div className="text-sm font-bold text-gray-900 dark:text-white">{t('checkout.form.sections.contact_shipping')}</div>
        </div>
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/40 px-4 py-3">
          <div className="text-xs font-semibold text-gray-500 dark:text-gray-400">{t('checkout.steps.payment')}</div>
          <div className="text-sm font-bold text-gray-900 dark:text-white">{t('checkout.form.sections.payment')}</div>
        </div>
      </div>

      <div className="card p-6 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 transition-colors duration-300 rounded-xl space-y-4">
        <div className="text-sm font-semibold text-gray-900 dark:text-white">{t('checkout.form.sections.contact')}</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('checkout.form.full_name')}
            </label>
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="input w-full dark:bg-gray-700 dark:border-gray-600 dark:text-white transition-colors duration-300"
              autoComplete="name"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('checkout.form.email')}
            </label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input w-full dark:bg-gray-700 dark:border-gray-600 dark:text-white transition-colors duration-300"
              autoComplete="email"
              inputMode="email"
            />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('checkout.form.phone')}
            </label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="input w-full dark:bg-gray-700 dark:border-gray-600 dark:text-white transition-colors duration-300"
              autoComplete="tel"
            />
          </div>
        </div>
      </div>

      <div className="card p-6 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 transition-colors duration-300 rounded-xl space-y-4">
        <div className="text-sm font-semibold text-gray-900 dark:text-white">{t('checkout.form.sections.shipping')}</div>
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            {t('checkout.form.address_line1')}
          </label>
          <input
            value={addressLine1}
            onChange={(e) => setAddressLine1(e.target.value)}
            className="input w-full dark:bg-gray-700 dark:border-gray-600 dark:text-white transition-colors duration-300"
            autoComplete="address-line1"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            {t('checkout.form.address_line2')}
          </label>
          <input
            value={addressLine2}
            onChange={(e) => setAddressLine2(e.target.value)}
            className="input w-full dark:bg-gray-700 dark:border-gray-600 dark:text-white transition-colors duration-300"
            autoComplete="address-line2"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('checkout.form.city')}
            </label>
            <input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="input w-full dark:bg-gray-700 dark:border-gray-600 dark:text-white transition-colors duration-300"
              autoComplete="address-level2"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('checkout.form.postal_code')}
            </label>
            <input
              value={postalCode}
              onChange={(e) => setPostalCode(e.target.value)}
              className="input w-full dark:bg-gray-700 dark:border-gray-600 dark:text-white transition-colors duration-300"
              autoComplete="postal-code"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('checkout.form.country')}
            </label>
            <select
              value={countryCode}
              onChange={(e) => setCountryCode(e.target.value)}
              className="input w-full dark:bg-gray-700 dark:border-gray-600 dark:text-white transition-colors duration-300"
              autoComplete="country"
            >
              <option value="TN">{t('checkout.countries.TN')}</option>
              <option value="FR">{t('checkout.countries.FR')}</option>
              <option value="AE">{t('checkout.countries.AE')}</option>
              <option value="DZ">{t('checkout.countries.DZ')}</option>
              <option value="MA">{t('checkout.countries.MA')}</option>
              <option value="SA">{t('checkout.countries.SA')}</option>
              <option value="US">{t('checkout.countries.US')}</option>
              <option value="GB">{t('checkout.countries.GB')}</option>
              <option value="DE">{t('checkout.countries.DE')}</option>
              <option value="IT">{t('checkout.countries.IT')}</option>
              <option value="ES">{t('checkout.countries.ES')}</option>
              <option value="OTHER">{t('checkout.countries.OTHER')}</option>
            </select>
            {countryCode === 'OTHER' ? (
              <input
                value={countryOther}
                onChange={(e) => setCountryOther(e.target.value)}
                className="input w-full dark:bg-gray-700 dark:border-gray-600 dark:text-white transition-colors duration-300 mt-2"
                placeholder={t('checkout.form.country_placeholder')}
              />
            ) : null}
          </div>
        </div>
      </div>

      <div className="card p-6 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 transition-colors duration-300 rounded-xl space-y-4">
        <div className="text-sm font-semibold text-gray-900 dark:text-white">{t('checkout.form.sections.payment')}</div>
        <div className="text-sm text-gray-600 dark:text-gray-300">
          {t('checkout.payment.element_help')}
        </div>
        <div className="card p-5 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 transition-colors duration-300 rounded-xl">
          <CardElement options={{ hidePostalCode: true }} />
        </div>

        {errorMessage ? (
          <div className="text-sm text-red-600 dark:text-red-400">
            {errorMessage}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={!stripe || !clientSecret || isLoading}
          className="btn btn-primary w-full flex justify-center items-center"
        >
          {isLoading
            ? t('checkout.form.initializing_payment')
            : clientSecret
              ? payLabel
              : t('checkout.form.initializing_payment')}
        </button>
      </div>
    </form>
  );
};

const Checkout = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { cartItems, clearCart } = useCart();
  const { formatPrice } = useCurrency();
  const { user } = useAuth();
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (!user) {
      toast.error(t('profile.login_required'));
      navigate('/login');
    }
  }, [user, navigate, t]);

  const resolveImage = (img) => {
    if (!img) return '';
    const lower = String(img).toLowerCase();
    if (lower.startsWith('http') || lower.startsWith('data:') || lower.startsWith('/')) return img;
    return `/images/${img}`;
  };

  const subtotal = useMemo(() => {
    return (cartItems || []).reduce((acc, item) => acc + Number(item.price || 0) * Number(item.qty || 0), 0);
  }, [cartItems]);

  const handleOrderSuccess = () => {
    clearCart();
    setIsSuccess(true);
    toast.success(t('checkout.success.order_placed'));
    // Redirect after a short delay to let user see success message
    setTimeout(() => {
      navigate('/profile');
    }, 3000);
  };

  if (isSuccess) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-xl mx-auto card-strong bg-white dark:bg-gray-800 p-8 ring-1 ring-transparent shadow-xl space-y-6 text-center">
          <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-3xl font-serif text-gray-900 dark:text-white transition-colors duration-300">
            {t('checkout.success.order_placed')}
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Thank you for your order! Your payment was successful and we are now processing your order. You can view your order status in your profile.
          </p>
          <Link to="/profile" className="btn btn-primary w-full inline-block">
            View My Orders
          </Link>
        </div>
      </div>
    );
  }

  if (!stripePromise) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-xl mx-auto card-strong bg-white dark:bg-gray-800 p-8 ring-1 ring-transparent shadow-xl">
          <div className="text-red-600 dark:text-red-400 text-sm">
            {t('checkout.form.errors.stripe_not_configured')}
          </div>
        </div>
      </div>
    );
  }

  if (!cartItems || cartItems.length === 0) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-xl mx-auto card-strong bg-white dark:bg-gray-800 p-8 ring-1 ring-transparent shadow-xl space-y-4">
          <h1 className="text-3xl font-serif text-gray-900 dark:text-white transition-colors duration-300">
            {t('checkout.title')}
          </h1>
          <div className="text-gray-600 dark:text-gray-300">
            {t('cart.empty.message')}
          </div>
          <Link to="/shop" className="btn btn-primary w-full">
            {t('cart.empty.action')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="card-strong bg-white dark:bg-gray-800 p-8 ring-1 ring-transparent shadow-xl space-y-6">
          <h1 className="text-3xl font-serif text-gray-900 dark:text-white transition-colors duration-300">
            {t('checkout.title')}
          </h1>

          <Elements stripe={stripePromise}>
            <CheckoutForm
              cartItems={cartItems}
              payLabel={t('checkout.form.pay_amount', { amount: formatPrice(subtotal) })}
              onSuccess={handleOrderSuccess}
            />
          </Elements>
        </div>

        <div className="card-strong bg-white dark:bg-gray-800 p-8 ring-1 ring-transparent shadow-xl space-y-6">
          <h2 className="text-xl font-serif text-gray-900 dark:text-white transition-colors duration-300">
            {t('cart.summary.title')}
          </h2>

          <div className="space-y-4">
            {cartItems.map((item) => (
              <div key={item._id} className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-14 h-14 bg-gray-50 dark:bg-gray-700 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0">
                    <img
                      src={resolveImage(item.image)}
                      alt={item.name}
                      className="w-12 h-12 object-contain"
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {item.name}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {t('checkout.form.qty')}: {item.qty}
                    </div>
                  </div>
                </div>
                <div className="text-sm font-semibold text-gray-900 dark:text-white flex-shrink-0">
                  {formatPrice(Number(item.price || 0) * Number(item.qty || 0))}
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-2">
            <div className="flex justify-between text-sm text-gray-600 dark:text-gray-300">
              <span>{t('cart.summary.subtotal')}</span>
              <span>{formatPrice(subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-600 dark:text-gray-300">
              <span>{t('cart.summary.shipping')}</span>
              <span>{t('cart.summary.free')}</span>
            </div>
            <div className="flex justify-between text-lg font-bold text-gray-900 dark:text-white">
              <span>{t('cart.summary.total')}</span>
              <span>{formatPrice(subtotal)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
