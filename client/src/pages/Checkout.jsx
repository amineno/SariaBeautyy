import React, { useMemo, useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { useCart } from '../hooks/useCart';
import { useCurrency } from '../context/CurrencyContext';
import { useAuth } from '../hooks/useAuth';

// WhatsApp order configuration
const WHATSAPP_NUMBER = "21653236163";

const OrderConfirmation = ({ whatsappUrl, total, formatPrice }) => {
  const { t } = useTranslation();
  
  return (
    <div className="animate-in fade-in zoom-in-95 duration-500 max-w-xl mx-auto card-strong bg-white dark:bg-gray-800 p-8 ring-1 ring-transparent shadow-xl space-y-6 text-center">
      <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
        <svg className="w-10 h-10 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h1 className="text-3xl font-serif text-gray-900 dark:text-white transition-colors duration-300">
        Commande Prête !
      </h1>
      <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl border border-dashed border-gray-200 dark:border-gray-600 space-y-2">
        <p className="text-sm text-gray-500 dark:text-gray-400 uppercase tracking-wider font-bold">Résumé</p>
        <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatPrice(total)}</p>
      </div>
      <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
        Votre commande a été enregistrée. Pour finaliser l'achat, cliquez sur le bouton ci-dessous pour nous envoyer les détails sur WhatsApp.
      </p>
      <div className="flex flex-col gap-3">
        <a 
          href={whatsappUrl} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="btn btn-primary w-full flex justify-center items-center gap-2 transform hover:scale-[1.02] active:scale-[0.98] transition-all bg-[#25D366] hover:bg-[#20ba56] border-none shadow-lg shadow-green-200 dark:shadow-none"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.438 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
          </svg>
          Envoyer sur WhatsApp
        </a>
        <Link to="/profile" className="text-sm font-bold text-gray-500 hover:text-primary transition-colors py-2">
          Voir mes commandes
        </Link>
      </div>
    </div>
  );
};

const CheckoutForm = ({ cartItems, subtotal, onSuccess }) => {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [notes, setNotes] = useState('');
  const [countryCode, setCountryCode] = useState('TN');
  const [countryOther, setCountryOther] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!fullName.trim() || !email.trim() || !phone.trim() || !addressLine1.trim() || !city.trim()) {
      toast.error(t('checkout.form.errors.required_fields'));
      return;
    }

    const normalizedEmail = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      toast.error(t('checkout.form.errors.email_invalid'));
      return;
    }

    setIsLoading(true);
    try {
      const orderData = {
        customer: {
          name: fullName.trim(),
          email: normalizedEmail,
          phone: phone.trim()
        },
        address: {
          address: addressLine1.trim(),
          city: city.trim(),
          postalCode: postalCode.trim(),
          country: countryCode === 'OTHER' ? countryOther : countryCode,
          notes: notes.trim()
        },
        cart: cartItems.map(item => ({
          _id: item._id,
          name: item.name,
          quantity: item.qty || item.quantity,
          price: item.price
        })),
        totals: {
          subtotal: subtotal,
          delivery: 7,
          total: subtotal + 7
        }
      };

      const { data } = await api.post('/payment/whatsapp', orderData);

      if (data.success && data.whatsappUrl) {
        onSuccess(data.whatsappUrl, subtotal + 7);
      } else {
        throw new Error('Failed to generate WhatsApp order');
      }
    } catch (e) {
      const msg = e.response?.data?.message || e.message || t('checkout.errors.order_failed');
      toast.error(msg);
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
            Notes (Optionnel)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="input w-full dark:bg-gray-700 dark:border-gray-600 dark:text-white transition-colors duration-300 min-h-[100px]"
            placeholder="Instructions spéciales pour la livraison..."
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
          Votre commande sera envoyée via WhatsApp. Le paiement s'effectue à la livraison.
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="btn btn-primary w-full flex justify-center items-center gap-2"
        >
          {isLoading ? (
            t('checkout.form.processing')
          ) : (
            <>
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.438 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
              </svg>
              Commander via WhatsApp
            </>
          )}
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
  const [orderSummary, setOrderSummary] = useState(null);

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

  const handleOrderSuccess = (whatsappUrl, total) => {
    clearCart();
    setOrderSummary({ whatsappUrl, total });
    toast.success("Commande enregistrée !");
  };

  if (orderSummary) {
    return (
      <div className="container mx-auto px-4 py-24">
        <OrderConfirmation 
          whatsappUrl={orderSummary.whatsappUrl} 
          total={orderSummary.total} 
          formatPrice={formatPrice} 
        />
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

          <CheckoutForm
            cartItems={cartItems}
            subtotal={subtotal}
            onSuccess={handleOrderSuccess}
          />
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
              <span>7.00 DT</span>
            </div>
            <div className="flex justify-between text-lg font-bold text-gray-900 dark:text-white">
              <span>{t('cart.summary.total')}</span>
              <span>{formatPrice(subtotal + 7)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
