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

    setIsLoading(true);
    try {
      const result = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: elements.getElement(CardElement),
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
