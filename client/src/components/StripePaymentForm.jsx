import React from 'react';
import { PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { useTranslation } from 'react-i18next';

const StripePaymentForm = ({ onPaymentSuccess, onPaymentError, isProcessing, setIsProcessing }) => {
  const { t } = useTranslation();
  const stripe = useStripe();
  const elements = useElements();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        redirect: 'if_required',
      });

      if (error) {
        onPaymentError(error.message || t('checkout.errors.payment_unexpected'));
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        onPaymentSuccess(paymentIntent);
      } else {
        onPaymentError(t('checkout.errors.payment_unexpected'));
      }
    } catch (err) {
      onPaymentError(err.message || t('checkout.errors.payment_unexpected'));
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <p className="text-sm text-gray-600 dark:text-gray-400 transition-colors duration-300">
        {t('checkout.payment.element_help')}
      </p>
      <div className="card p-5 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 transition-colors duration-300 rounded-xl">
        <PaymentElement />
      </div>
      <button 
        type="submit" 
        disabled={isProcessing || !stripe || !elements}
        className="btn btn-primary w-full flex justify-center items-center"
      >
        {isProcessing ? (
          <span className="flex items-center">
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            {t('checkout.payment.processing')}
          </span>
        ) : (
          t('checkout.payment.pay_now')
        )}
      </button>
    </form>
  );
};

export default StripePaymentForm;
