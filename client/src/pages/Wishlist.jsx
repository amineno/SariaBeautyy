import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useCurrency } from '../context/CurrencyContext';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import { Heart, ShoppingBag, Trash2, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

const Wishlist = () => {
  const { t, i18n } = useTranslation();
  const { formatPrice } = useCurrency();
  const { user } = useAuth();
  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWishlist = async () => {
      try {
        setLoading(true);
        const config = {
          headers: {
            Authorization: `Bearer ${user.token}`,
          },
        };
        const { data } = await api.get('/users/wishlist', config);
        setWishlist(data);
      } catch (error) {
        console.error("Error fetching wishlist:", error);
        toast.error(t('wishlist.fetch_error'));
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchWishlist();
    }
  }, [user, t]);

  const removeFromWishlist = async (productId) => {
    try {
      const config = {
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      };
      await api.delete(`/users/wishlist/${productId}`, config);
      setWishlist(prev => prev.filter(p => p._id !== productId));
      toast.success(t('wishlist.removed_success'));
    } catch {
      toast.error(t('wishlist.remove_error'));
    }
  };

  const resolveImage = (img) => {
    if (!img) return '';
    const lower = img.toLowerCase();
    if (lower.startsWith('http') || lower.startsWith('data:') || lower.startsWith('/')) return img;
    return `/images/${img}`;
  };

  const displayFields = (p) => {
    const lang = i18n.language || 'en';
    const trans = (p.translations || {})[lang];
    const name = trans?.name || p.name;
    const description = trans?.description || p.description;
    return { name, description };
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-primary">{t('common.loading')}</div>;

  return (
    <main className="min-h-screen bg-gradient-to-b from-rose-50/70 via-white to-rose-100/70 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 pt-32 pb-16 transition-colors duration-300">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <header className="text-center mb-12">
            <h1 className="text-4xl font-serif text-gray-900 dark:text-white mb-4 flex items-center justify-center gap-3">
              <Heart className="text-primary fill-primary" /> {t('wishlist.title')}
            </h1>
            <p className="text-gray-600 dark:text-gray-300">
              {wishlist.length} {t('wishlist.items_count')}
            </p>
          </header>

          {wishlist.length === 0 ? (
            <div className="text-center py-20 card-strong bg-white/80 dark:bg-gray-800/80">
              <Heart className="w-16 h-16 text-gray-200 dark:text-gray-700 mx-auto mb-6" />
              <h2 className="text-2xl font-serif text-gray-900 dark:text-white mb-4">{t('wishlist.empty_title')}</h2>
              <p className="text-gray-500 dark:text-gray-400 mb-8">{t('wishlist.empty_message')}</p>
              <Link to="/shop" className="btn btn-primary inline-flex items-center gap-2">
                {t('wishlist.go_shopping')} <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {wishlist.map((product) => (
                <motion.div
                  key={product._id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="card-strong bg-white/90 dark:bg-gray-800/90 p-4 flex gap-4 group"
                >
                  <div className="w-32 h-32 bg-gray-50 dark:bg-gray-700 rounded-2xl overflow-hidden flex items-center justify-center shadow-inner shrink-0">
                    <img
                      src={resolveImage(product.image)}
                      alt={displayFields(product).name}
                      className="max-w-full max-h-full object-contain p-2"
                    />
                  </div>
                  <div className="flex flex-col flex-grow">
                    <div className="flex justify-between items-start">
                      <Link to={`/product/${product._id}`} className="hover:text-primary transition-colors">
                        <h3 className="font-serif text-lg text-gray-900 dark:text-white leading-tight">
                          {displayFields(product).name}
                        </h3>
                      </Link>
                      <button 
                        onClick={() => removeFromWishlist(product._id)}
                        className="text-gray-400 hover:text-red-500 transition-colors p-1"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{product.category}</p>
                    <div className="mt-auto flex justify-between items-center pt-4">
                      <span className="text-primary font-bold text-xl">{formatPrice(product.price)}</span>
                      <Link 
                        to={`/product/${product._id}`}
                        className="btn btn-primary rounded-full p-2.5"
                      >
                        <ShoppingBag className="w-5 h-5" />
                      </Link>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
};

export default Wishlist;
