import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../hooks/useCart';
import { useCurrency } from '../context/CurrencyContext';
import { Trash2, ArrowRight, Minus, Plus, ShoppingBag } from 'lucide-react';
import ConfirmModal from '../components/ConfirmModal';
import { useTranslation } from 'react-i18next';

const Cart = () => {
  const { t } = useTranslation();
  const { cartItems, removeFromCart, incrementQty, decrementQty } = useCart();
  const { formatPrice } = useCurrency();
  const [deleteId, setDeleteId] = useState(null);
  
  const resolveImage = (img) => {
    if (!img) return '';
    const lower = img.toLowerCase();
    if (lower.startsWith('http') || lower.startsWith('data:') || lower.startsWith('/')) return img;
    return `/images/${img}`;
  };

  const getCategoryLabel = (cat) => {
    if (!cat) return '';
    let key = cat.toLowerCase();
    
    return t(`category.${key}`, { defaultValue: cat });
  };

  const subtotal = cartItems.reduce((acc, item) => acc + item.qty * item.price, 0);

  if (cartItems.length === 0) {
    return (
      <main className="bg-gray-50 dark:bg-gray-900 min-h-screen flex items-center justify-center transition-colors duration-300">
        <div className="text-center p-8">
          <div className="bg-white dark:bg-gray-800 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-6 shadow-lg">
            <ShoppingBag className="w-12 h-12 text-primary dark:text-rose-400" />
          </div>
          <h1 className="text-3xl md:text-4xl font-serif text-gray-900 dark:text-white mb-4">{t('cart.empty.title')}</h1>
          <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto mb-8">{t('cart.empty.message')}</p>
          <Link to="/shop" className="btn btn-primary rounded-full px-8 py-4 font-semibold text-base shadow-lg shadow-primary/30 dark:shadow-rose-900/30">
            {t('cart.empty.action')}
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="bg-gray-50 dark:bg-gray-900 min-h-screen transition-colors duration-300">
      <div className="relative bg-rose-100/50 dark:bg-gray-800/50 pt-32 pb-20 lg:pt-48 lg:pb-28">
        <div className="absolute inset-0 z-0 opacity-10 dark:opacity-5">
          <div className="absolute inset-0 bg-repeat bg-center" style={{ backgroundImage: 'url(/images/patterns/subtle-dots.svg)' }}></div>
        </div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-serif text-gray-900 dark:text-white mb-4">{t('cart.title')}</h1>
            <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto text-lg">{t('cart.subtitle')}</p>
          </div>
        </div>
      </div>
      <div className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-6">
            {cartItems.map((item) => (
              <div key={item._id} className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 flex items-center space-x-6 transition-colors duration-300">
                <div className="w-28 h-28 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center shadow-inner relative">
                  <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent dark:from-black/20"></div>
                  <img src={resolveImage(item.image)} alt={item.name} className="max-h-full max-w-full object-contain p-2 transition-all duration-300 hover:scale-105 relative z-10" />
                </div>
                
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{item.name}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">{getCategoryLabel(item.category)}</p>
                  <div className="flex items-center">
                    <button
                      aria-label="Decrease quantity"
                      onClick={() => decrementQty(item._id)}
                      className="w-8 h-8 rounded-full border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center justify-center relative z-10"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="mx-4 w-8 text-center text-gray-800 dark:text-white font-semibold text-lg">{item.qty}</span>
                    <button
                      aria-label="Increase quantity"
                      onClick={() => incrementQty(item._id)}
                      className="w-8 h-8 rounded-full border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center justify-center relative z-10"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-xl font-bold text-primary dark:text-rose-400 mb-2">{formatPrice(item.price * item.qty)}</p>
                  <button 
                    onClick={() => setDeleteId(item._id)}
                    className="text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 transition-colors p-2 cursor-pointer relative z-10"
                    title={t('cart.delete')}
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 sticky top-28 transition-colors duration-300">
            <h2 className="text-2xl font-serif text-gray-900 dark:text-white mb-6">{t('cart.summary.title')}</h2>
            
            <div className="space-y-4 mb-8">
              <div className="flex justify-between text-gray-600 dark:text-gray-300">
                <span>{t('cart.summary.subtotal')}</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              <div className="flex justify-between text-gray-600 dark:text-gray-300">
                <span>{t('cart.summary.shipping')}</span>
                <span className="font-semibold text-green-600 dark:text-green-400">{t('cart.summary.free')}</span>
              </div>
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4 flex justify-between font-bold text-xl text-gray-900 dark:text-white">
                <span>{t('cart.summary.total')}</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
            </div>

            <Link 
              to="/checkout"
              className="btn btn-primary w-full py-4 text-lg rounded-full font-semibold shadow-lg shadow-primary/30 dark:shadow-rose-900/30 flex items-center justify-center gap-3"
            >
              {t('cart.checkout')}
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
        </div>
      </div>
      <ConfirmModal 
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => {
          if (deleteId) {
            removeFromCart(deleteId);
            setDeleteId(null);
          }
        }}
        title={t('cart.confirm.title')}
        message={t('cart.confirm.message')}
        icon={Trash2}
      />
    </main>
  );
};

export default Cart;
