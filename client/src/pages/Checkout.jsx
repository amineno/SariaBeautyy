import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useCart } from '../hooks/useCart';
import { useAuth } from '../hooks/useAuth';
import { useCurrency } from '../context/CurrencyContext';
import { ChevronLeft, CreditCard, MapPin, Package, CheckCircle } from 'lucide-react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import StripePaymentForm from '../components/StripePaymentForm';

const Checkout = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { cartItems, clearCart } = useCart();
  const { user } = useAuth();
  const { formatPrice } = useCurrency();

  const [shippingAddress, setShippingAddress] = useState({
    address: '',
    city: '',
    postalCode: '',
    country: '',
  });
  const [paymentMethod, setPaymentMethod] = useState('Stripe');
  const [activeStep, setActiveStep] = useState(1); // 1: Shipping, 2: Payment, 3: Place Order
  const [stripePromise, setStripePromise] = useState(null);
  const [clientSecret, setClientSecret] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPayPalReady, setIsPayPalReady] = useState(false);
  const [orderId, setOrderId] = useState(null);

  const resolveImage = (img) => {
    if (!img) return '';
    const lower = img.toLowerCase();
    if (lower.startsWith('http') || lower.startsWith('data:') || lower.startsWith('/')) return img;
    return `/images/${img}`;
  };

  useEffect(() => {
    if (!user) {
      navigate('/login?redirect=/checkout');
    }
    if (cartItems.length === 0) {
      navigate('/cart');
    }

    // Load Stripe key
    const getStripeKey = async () => {
      const { data } = await api.get('/payment/config');
      setStripePromise(loadStripe(data.publishableKey));
    };
    getStripeKey();
  }, [user, cartItems, navigate]);

  const itemsPrice = cartItems.reduce((acc, item) => acc + item.qty * item.price, 0);
  const shippingPrice = 0; // Free shipping
  const taxPrice = 0; // No tax
  const totalPrice = itemsPrice + shippingPrice + taxPrice;

  useEffect(() => {
    if (!user || !user.token) return;
    if (activeStep === 3 && paymentMethod === 'Stripe' && !clientSecret && totalPrice > 0) {
      const initStripePayment = async () => {
        try {
          const config = {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${user.token}`,
            },
          };

          let currentOrderId = orderId;

          if (!currentOrderId) {
            const orderPayload = {
              orderItems: cartItems.map(item => ({
                product: item._id,
                name: item.name,
                image: item.image,
                qty: item.qty,
              })),
              shippingAddress,
              paymentMethod: 'Stripe',
            };

            const createdOrder = await api.post('/orders', orderPayload, config);
            currentOrderId = createdOrder.data._id;
            setOrderId(currentOrderId);
          }

          const { data } = await api.post(
            '/payment/create-payment-intent',
            { orderId: currentOrderId },
            config
          );
          setClientSecret(data.clientSecret);
        } catch (error) {
          console.error('Failed to initialize Stripe payment', error);
          toast.error(error.response?.data?.message || t('checkout.errors.payment_init_failed'));
        }
      };
      initStripePayment();
    }
  }, [activeStep, paymentMethod, totalPrice, user, clientSecret, t, cartItems, shippingAddress, orderId]);

  useEffect(() => {
    if (activeStep === 3 && paymentMethod === 'PayPal' && !isPayPalReady && totalPrice > 0) {
      if (window.paypal) {
        setIsPayPalReady(true);
        return;
      }
      const clientId = import.meta.env.VITE_PAYPAL_CLIENT_ID;
      if (!clientId) {
        toast.error(t('checkout.errors.paypal_not_configured'));
        return;
      }
      const script = document.createElement('script');
      script.src = `https://www.paypal.com/sdk/js?client-id=${clientId}&currency=AED`;
      script.async = true;
      script.onload = () => setIsPayPalReady(true);
      script.onerror = () => {
        toast.error(t('checkout.errors.payment_unexpected'));
      };
      document.body.appendChild(script);
    }
  }, [activeStep, paymentMethod, isPayPalReady, totalPrice, t]);

  const submitShippingHandler = (e) => {
    e.preventDefault();
    // In a real app, you'd save this to user profile or session
    setActiveStep(2);
  };

  const submitPaymentHandler = (e) => {
    e.preventDefault();
    // In a real app, you'd save this to session
    setActiveStep(3);
  };

  const onStripePaymentSuccess = () => {
    toast.success(t('checkout.success.order_placed'));
    clearCart();
    if (orderId) {
      navigate(`/order-success/${orderId}`);
    } else {
      navigate('/profile');
    }
  };

  const onStripePaymentError = (errorMessage) => {
    toast.error(errorMessage);
  };

  useEffect(() => {
    if (activeStep === 3 && paymentMethod === 'PayPal' && isPayPalReady && totalPrice > 0 && window.paypal && user && user.token) {
      const renderButtons = async () => {
        const container = document.getElementById('paypal-button-container');
        if (!container || container.children.length > 0) return;

        const config = {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${user.token}`,
          },
        };

        let currentOrderId = orderId;

        if (!currentOrderId) {
          try {
            const orderPayload = {
              orderItems: cartItems.map(item => ({
                product: item._id,
                name: item.name,
                image: item.image,
                qty: item.qty,
              })),
              shippingAddress,
              paymentMethod: 'PayPal',
            };

            const createdOrder = await api.post('/orders', orderPayload, config);
            currentOrderId = createdOrder.data._id;
            setOrderId(currentOrderId);
          } catch (error) {
            console.error('Failed to create order for PayPal', error);
            toast.error(error.response?.data?.message || t('checkout.errors.order_failed'));
            return;
          }
        }

        window.paypal
          .Buttons({
            createOrder: (data, actions) => {
              return actions.order.create({
                purchase_units: [
                  {
                    amount: {
                      value: totalPrice.toFixed(2),
                      currency_code: 'AED',
                    },
                  },
                ],
              });
            },
            onApprove: async (data, actions) => {
              setIsProcessing(true);
              try {
                const details = await actions.order.capture();
                const response = await api.post(
                  '/payment/paypal/verify',
                  {
                    orderId: currentOrderId,
                    paypalOrderId: details.id,
                  },
                  config
                );
                clearCart();
                toast.success(t('checkout.success.order_placed'));
                navigate(`/order-success/${response.data._id}`);
              } catch (err) {
                console.error('PayPal verification failed', err);
                toast.error(err.response?.data?.message || err.message || t('checkout.errors.payment_unexpected'));
              } finally {
                setIsProcessing(false);
              }
            },
            onError: (err) => {
              toast.error(err.message || t('checkout.errors.payment_unexpected'));
            },
          })
          .render('#paypal-button-container');
      };

      renderButtons();
    }
  }, [activeStep, paymentMethod, isPayPalReady, totalPrice, user, cartItems, shippingAddress, orderId, t, clearCart, navigate]);

  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-4xl font-serif text-gray-900 dark:text-white mb-10 text-center transition-colors duration-300">Checkout</h1>

      <div className="max-w-4xl mx-auto card-strong bg-white dark:bg-gray-800 p-8 ring-1 ring-transparent hover:ring-primary/20 transition-all duration-300 shadow-xl">
        {/* Progress Stepper */}
        <div className="flex justify-between items-center mb-10 relative">
          <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-1 bg-gray-200 dark:bg-gray-700 rounded-full transition-colors duration-300">
            <div 
              className="h-full bg-primary transition-all duration-500 ease-in-out rounded-full" 
              style={{ width: `${(activeStep - 1) / 2 * 100}%` }}
            ></div>
          </div>
          {[1, 2, 3].map((step) => (
            <div key={step} className="relative z-10 flex flex-col items-center">
              <div className={`w-10 h-10 rounded-full ring-2 ring-white dark:ring-gray-800 shadow flex items-center justify-center text-white font-bold text-lg transition-all duration-300 ${
                activeStep >= step ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'
              }`}>
                {activeStep > step ? <CheckCircle size={20} /> : step}
              </div>
              <span className={`mt-2 text-sm font-medium transition-colors duration-300 ${activeStep >= step ? 'text-primary' : 'text-gray-500 dark:text-gray-400'}`}>
                {step === 1 && t('checkout.steps.shipping')}
                {step === 2 && t('checkout.steps.payment')}
                {step === 3 && t('checkout.steps.place_order')}
              </span>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          <div className="lg:col-span-2">
            {/* Shipping Step */}
            {activeStep === 1 && (
              <form onSubmit={submitShippingHandler} className="space-y-6">
                <h2 className="text-2xl font-serif text-gray-800 dark:text-white mb-6 flex items-center transition-colors duration-300"><MapPin className="mr-3" /> {t('checkout.shipping.title')}</h2>
                <div>
                  <label htmlFor="address" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('checkout.shipping.address_label')}</label>
                  <input
                    type="text"
                    id="address"
                    className="input w-full dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400 transition-colors duration-300"
                    value={shippingAddress.address}
                    onChange={(e) => setShippingAddress({ ...shippingAddress, address: e.target.value })}
                    required
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="city" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('checkout.shipping.city_label')}</label>
                    <input
                      type="text"
                      id="city"
                      className="input w-full dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400 transition-colors duration-300"
                      value={shippingAddress.city}
                      onChange={(e) => setShippingAddress({ ...shippingAddress, city: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="postalCode" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('checkout.shipping.postal_code_label')}</label>
                    <input
                      type="text"
                      id="postalCode"
                      className="input w-full dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400 transition-colors duration-300"
                      value={shippingAddress.postalCode}
                      onChange={(e) => setShippingAddress({ ...shippingAddress, postalCode: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="country" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('checkout.shipping.country_label')}</label>
                  <input
                    type="text"
                    id="country"
                    className="input w-full dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400 transition-colors duration-300"
                    value={shippingAddress.country}
                    onChange={(e) => setShippingAddress({ ...shippingAddress, country: e.target.value })}
                    required
                  />
                </div>
                <button type="submit" className="btn btn-primary w-full shadow-lg shadow-primary/30 transition-all duration-300">
                  {t('checkout.shipping.continue_btn')}
                </button>
              </form>
            )}

            {/* Payment Step */}
            {activeStep === 2 && (
              <form onSubmit={submitPaymentHandler} className="space-y-6">
                <h2 className="text-2xl font-serif text-gray-800 dark:text-white mb-6 flex items-center transition-colors duration-300"><CreditCard className="mr-3" /> {t('checkout.payment.title')}</h2>
                <div className="space-y-4">
                  <div className="flex items-center p-4 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer" onClick={() => { setPaymentMethod('Stripe'); setActiveStep(3); }}>
                    <input
                      type="radio"
                      id="stripe"
                      name="paymentMethod"
                      value="Stripe"
                      checked={paymentMethod === 'Stripe'}
                      onChange={(e) => {
                        setPaymentMethod(e.target.value);
                        setActiveStep(3);
                      }}
                      className="h-5 w-5 text-primary focus:ring-primary border-gray-300 dark:border-gray-600 dark:bg-gray-700"
                    />
                    <label htmlFor="stripe" className="ml-3 block text-base font-medium text-gray-700 dark:text-gray-200 cursor-pointer w-full">
                      {t('checkout.payment.stripe')}
                    </label>
                  </div>
                  <div className="flex items-center p-4 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer" onClick={() => setPaymentMethod('PayPal')}>
                    <input
                      type="radio"
                      id="paypal"
                      name="paymentMethod"
                      value="PayPal"
                      checked={paymentMethod === 'PayPal'}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="h-5 w-5 text-primary focus:ring-primary border-gray-300 dark:border-gray-600 dark:bg-gray-700"
                    />
                    <label htmlFor="paypal" className="ml-3 block text-base font-medium text-gray-700 dark:text-gray-200 cursor-pointer w-full">
                      {t('checkout.payment.paypal')}
                    </label>
                  </div>
                </div>
                <div className="flex justify-between gap-4">
                  <button 
                    type="button" 
                    onClick={() => setActiveStep(1)} 
                    className="btn btn-soft w-1/2 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 transition-colors duration-300"
                  >
                    <ChevronLeft className="mr-2" size={20} /> {t('checkout.payment.back_btn')}
                  </button>
                  <button type="submit" className="btn btn-primary w-1/2 shadow-lg shadow-primary/30 transition-all duration-300">
                    {t('checkout.payment.continue_btn')}
                  </button>
                </div>
              </form>
            )}

            {/* Place Order / Payment Details Step */}
            {activeStep === 3 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-serif text-gray-800 dark:text-white mb-6 flex items-center transition-colors duration-300">
                  <Package className="mr-3" />
                  {paymentMethod === 'Stripe' ? t('checkout.review.title_card') : t('checkout.review.title')}
                </h2>
                
                {/* Shipping Info */}
                <div className="card bg-gray-50 dark:bg-gray-700/30 p-5 border border-gray-100 dark:border-gray-600 rounded-xl transition-colors duration-300">
                  <h3 className="text-xl font-medium text-gray-800 dark:text-white mb-3">{t('checkout.review.shipping_info')}</h3>
                  <p className="text-gray-600 dark:text-gray-300">{shippingAddress.address}, {shippingAddress.city}, {shippingAddress.postalCode}, {shippingAddress.country}</p>
                </div>

                {/* Payment Info */}
                <div className="card bg-gray-50 dark:bg-gray-700/30 p-5 border border-gray-100 dark:border-gray-600 rounded-xl transition-colors duration-300">
                  <h3 className="text-xl font-medium text-gray-800 dark:text-white mb-3">{t('checkout.review.payment_method')}</h3>
                  <p className="text-gray-600 dark:text-gray-300">{paymentMethod}</p>
                </div>

                {/* Order Items */}
                <div className="card bg-gray-50 dark:bg-gray-700/30 p-5 border border-gray-100 dark:border-gray-600 rounded-xl transition-colors duration-300">
                  <h3 className="text-xl font-medium text-gray-800 dark:text-white mb-3">{t('checkout.review.order_items')}</h3>
                  {cartItems.map((item) => (
                    <div key={item._id} className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-600 last:border-b-0">
                      <div className="flex items-center">
                        <div className="w-12 h-12 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 rounded-md flex items-center justify-center shadow-inner mr-3 transition-colors duration-300">
                          <img src={resolveImage(item.image)} alt={item.name} className="w-10 h-10 object-contain transition-all duration-300 hover:scale-105" />
                        </div>
                        <span className="text-gray-700 dark:text-gray-300 text-sm">{item.name} x {item.qty}</span>
                      </div>
                      <span className="text-gray-800 dark:text-gray-200 font-medium">{formatPrice(item.qty * item.price)}</span>
                    </div>
                  ))}
                </div>

                <div className="flex justify-between gap-4">
                  <button 
                    type="button" 
                    onClick={() => setActiveStep(2)} 
                    className="btn btn-soft w-1/2 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 transition-colors duration-300"
                  >
                    <ChevronLeft className="mr-2" size={20} /> {t('checkout.review.back_btn')}
                  </button>
                  {paymentMethod === 'Stripe' && (
                    clientSecret && stripePromise ? (
                      <div className="w-full">
                        <Elements stripe={stripePromise} options={{ clientSecret }}>
                          <StripePaymentForm 
                            onPaymentSuccess={onStripePaymentSuccess}
                            onPaymentError={onStripePaymentError}
                            isProcessing={isProcessing}
                            setIsProcessing={setIsProcessing}
                          />
                        </Elements>
                      </div>
                    ) : (
                      <div className="w-full flex justify-center py-4">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                      </div>
                    )
                  )}
                  {paymentMethod === 'PayPal' && (
                    <div className="w-full flex justify-center py-2">
                      {isPayPalReady ? (
                        <div id="paypal-button-container" className="w-full flex justify-center" />
                      ) : (
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="card bg-white dark:bg-gray-800 p-6 sticky top-24 ring-1 ring-transparent hover:ring-primary/20 transition-all duration-300 shadow-xl rounded-xl">
              <h2 className="text-xl font-serif font-bold text-gray-900 dark:text-white mb-6 transition-colors duration-300">{t('checkout.summary.title')}</h2>
              
              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-gray-600 dark:text-gray-400 transition-colors duration-300">
                  <span>{t('checkout.summary.items')}</span>
                  <span>{formatPrice(itemsPrice)}</span>
                </div>
                <div className="border-t border-gray-200 dark:border-gray-700 pt-4 flex justify-between font-bold text-lg text-gray-900 dark:text-white transition-colors duration-300">
                  <span>{t('checkout.summary.total')}</span>
                  <span>{formatPrice(totalPrice)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
