import React, { useEffect, useMemo, useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useElements, useStripe } from '@stripe/react-stripe-js';
import api from '../api/axios';
import toast from 'react-hot-toast';

const stripePublishableKey = String(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '').trim();
const stripePromise = stripePublishableKey ? loadStripe(stripePublishableKey) : null;

const CheckoutForm = ({ amountCents, currency }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [clientSecret, setClientSecret] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [country, setCountry] = useState('');

  useEffect(() => {
    let isActive = true;

    const init = async () => {
      if (!amountCents || amountCents <= 0) return;
      setIsLoading(true);
      try {
        const { data } = await api.post('/payment/create-payment-intent', {
          amount: amountCents,
          currency,
        });
        if (!isActive) return;
        setClientSecret(String(data?.clientSecret || ''));
      } catch (e) {
        if (!isActive) return;
        setClientSecret('');
        toast.error(e.response?.data?.message || e.response?.data?.error || 'Payment initialization failed');
      } finally {
        if (isActive) setIsLoading(false);
      }
    };

    init();
    return () => {
      isActive = false;
    };
  }, [amountCents, currency]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements || !clientSecret) return;

    const normalizedCountry = String(country || '').trim().toUpperCase();
    if (!fullName.trim()) {
      toast.error('Name is required');
      return;
    }
    if (!phone.trim()) {
      toast.error('Phone number is required');
      return;
    }
    if (!addressLine1.trim()) {
      toast.error('Address is required');
      return;
    }
    if (!city.trim()) {
      toast.error('City is required');
      return;
    }
    if (!postalCode.trim()) {
      toast.error('Postal code is required');
      return;
    }
    if (normalizedCountry.length !== 2) {
      toast.error('Country must be a 2-letter code (e.g. TN, US, FR)');
      return;
    }

    setIsLoading(true);
    try {
      const result = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: elements.getElement(CardElement),
          billing_details: {
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
        toast.error(result.error.message || 'Payment failed');
        return;
      }

      if (result.paymentIntent?.status === 'succeeded') {
        toast.success('Payment successful');
      } else {
        toast.error('Payment not completed');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Full name
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
              Phone
            </label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="input w-full dark:bg-gray-700 dark:border-gray-600 dark:text-white transition-colors duration-300"
              autoComplete="tel"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Address line 1
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
            Address line 2 (optional)
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
              City
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
              Postal code
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
              Country (2 letters)
            </label>
            <input
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="input w-full dark:bg-gray-700 dark:border-gray-600 dark:text-white transition-colors duration-300"
              autoComplete="country"
              placeholder="TN"
            />
          </div>
        </div>
      </div>

      <div className="card p-5 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 transition-colors duration-300 rounded-xl">
        <CardElement options={{ hidePostalCode: true }} />
      </div>
      <button
        type="submit"
        disabled={!stripe || !clientSecret || isLoading}
        className="btn btn-primary w-full flex justify-center items-center"
      >
        {isLoading ? 'Processing…' : 'Pay'}
      </button>
    </form>
  );
};

const Checkout = () => {
  const [amountDollars, setAmountDollars] = useState('50.00');
  const currency = 'usd';

  const amountCents = useMemo(() => {
    const numeric = Number(amountDollars);
    if (!Number.isFinite(numeric) || numeric <= 0) return 0;
    return Math.round(numeric * 100);
  }, [amountDollars]);

  if (!stripePromise) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-xl mx-auto card-strong bg-white dark:bg-gray-800 p-8 ring-1 ring-transparent shadow-xl">
          <div className="text-red-600 dark:text-red-400 text-sm">
            Stripe is not configured (missing VITE_STRIPE_PUBLISHABLE_KEY)
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-xl mx-auto card-strong bg-white dark:bg-gray-800 p-8 ring-1 ring-transparent shadow-xl space-y-6">
        <h1 className="text-3xl font-serif text-gray-900 dark:text-white transition-colors duration-300">
          Checkout
        </h1>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Amount (USD)
          </label>
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={amountDollars}
            onChange={(e) => setAmountDollars(e.target.value)}
            className="input w-full dark:bg-gray-700 dark:border-gray-600 dark:text-white transition-colors duration-300"
          />
        </div>

        <Elements stripe={stripePromise}>
          <CheckoutForm amountCents={amountCents} currency={currency} />
        </Elements>
      </div>
    </div>
  );
};

export default Checkout;
