import React, { useEffect, useMemo, useState } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { Star, MessageSquare } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';

const Reviews = () => {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const authHeader = useMemo(() => ({
    headers: { Authorization: `Bearer ${user?.token}` }
  }), [user]);
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(false);

  const displayFields = (p) => {
    const lang = i18n.language || 'en';
    const trans = (p.translations || {})[lang];
    const name = trans?.name || p.name;
    const description = trans?.description || p.description;
    return { name, description };
  };

  const displayCategory = (cat) => {
    const map = {
      Beauty: t('category.beauty'),
      Skincare: t('category.skincare'),
      Bodycare: t('category.bodycare'),
      Haircare: t('category.haircare'),
      Fragrance: t('category.fragrance'),
      Tools: t('category.tools'),
      Collection: t('category.collection')
    };
    return map[cat] || cat;
  };

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const { data } = await api.get('/products');
        setProducts(data || []);
      } catch {
        toast.error(t('reviews.error_loading'));
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, [t]);

  const submitReview = async (productId) => {
    const payload = {
      rating: Number(form[productId]?.rating || 0),
      comment: String(form[productId]?.comment || '')
    };
    if (!payload.rating || !payload.comment.trim()) {
      toast.error(t('reviews.validation_required'));
      return;
    }
    try {
      const { data } = await api.post(`/products/${productId}/reviews`, payload, authHeader);
      toast.success(t('reviews.added_success'));
      setProducts(prev => prev.map(p => p._id === productId ? {
        ...p,
        reviews: [...(p.reviews || []), data],
        numReviews: ((p.numReviews || 0) + 1),
      } : p));
      setForm(f => ({ ...f, [productId]: { rating: 0, comment: '' } }));
    } catch (e) {
      toast.error(e.response?.data?.message || t('reviews.add_failed'));
    }
  };

  if (!user) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-rose-50/70 via-white to-rose-100/70 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 flex items-center justify-center px-4 transition-colors duration-300">
        <div className="card-strong max-w-md w-full text-center p-10 bg-white/90 dark:bg-gray-800/90 dark:border-gray-700">
          <div className="bg-rose-50 dark:bg-gray-700 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-6 shadow-md">
            <MessageSquare className="w-12 h-12 text-primary dark:text-rose-400" />
          </div>
          <h1 className="text-3xl md:text-4xl font-serif text-gray-900 dark:text-white mb-4">
            {t('reviews.login_required_title')}
          </h1>
          <p className="text-gray-600 dark:text-gray-300 max-w-md mx-auto mb-8 text-sm md:text-base">
            {t('reviews.login_required_desc')}
          </p>
          <Link
            to="/login"
            className="btn btn-primary rounded-full px-8 py-3 font-semibold text-base"
          >
            {t('reviews.login_cta')}
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-rose-50/70 via-white to-rose-100/70 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 transition-colors duration-300">
      <div className="relative pt-32 pb-16 lg:pt-40 lg:pb-24">
        <div className="absolute inset-0 z-0 opacity-30">
          <div
            className="absolute inset-0 bg-repeat bg-center dark:opacity-5"
            style={{ backgroundImage: 'url(/images/patterns/subtle-dots.svg)' }}
          />
        </div>
        <div className="container mx-auto px-4 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="max-w-3xl mx-auto text-center"
          >
            <p className="text-xs md:text-sm font-semibold tracking-[0.25em] uppercase text-primary/80 dark:text-rose-400/80 mb-3">
              {t('reviews.page_title')}
            </p>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif text-gray-900 dark:text-white mb-4">
              {t('reviews.page_title')}
            </h1>
            <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto text-base md:text-lg">
              {t('reviews.page_subtitle')}
            </p>
          </motion.div>
        </div>
      </div>
      <div className="container mx-auto px-4 pb-16">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {products.map((p) => (
              <motion.div
                key={p._id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
              >
                <div className="card-strong bg-white/90 dark:bg-gray-800/90 rounded-3xl overflow-hidden transition-all duration-300 hover:shadow-2xl hover:-translate-y-2 border border-rose-100/80 dark:border-gray-700 hover:border-rose-200/90 dark:hover:border-gray-600 h-full flex flex-col">
                  <div className="p-6">
                    <div className="flex items-start gap-5">
                      <div className="w-20 h-20 rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-700 flex-shrink-0">
                        <img
                          src={
                            (p.image?.startsWith('http') || p.image?.startsWith('/'))
                              ? p.image
                              : `/images/${p.image}`
                          }
                          alt={displayFields(p).name}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </div>
                      <div className="flex-grow">
                        <h3 className="font-semibold text-gray-900 dark:text-white text-lg mb-1">
                          {displayFields(p).name}
                        </h3>
                        <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 mb-2">
                          {displayCategory(p.category)}
                        </p>
                        <div className="mt-1 flex items-center gap-2 text-amber-500 text-xs md:text-sm">
                          <div className="flex items-center gap-1">
                            <Star className="w-4 h-4" />
                            <span className="font-semibold">
                              {p.rating?.toFixed?.(1) || 0}
                            </span>
                          </div>
                          <span className="text-gray-400 dark:text-gray-600">•</span>
                          <span className="text-gray-600 dark:text-gray-400">
                            {t('product.reviews_label', { count: p.numReviews || 0 })}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50/80 dark:bg-gray-700/50 p-6 space-y-4 mt-auto">
                    <div>
                      <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 block">
                        {t('reviews.rating_label')}
                      </label>
                      <div className="flex items-center gap-2">
                        {[1, 2, 3, 4, 5].map(star => (
                          <button
                            key={star}
                            onClick={() =>
                              setForm(f => ({
                                ...f,
                                [p._id]: { ...(f[p._id] || {}), rating: star }
                              }))
                            }
                            className={`transition-colors hover:text-amber-400 ${
                              (form[p._id]?.rating || 0) >= star
                                ? 'text-amber-400'
                                : 'text-gray-300 dark:text-gray-500'
                            }`}
                          >
                            <Star className="w-6 h-6" />
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 block">
                        {t('reviews.comment_label')}
                      </label>
                      <textarea
                        rows={4}
                        value={form[p._id]?.comment || ''}
                        onChange={(e) =>
                          setForm(f => ({
                            ...f,
                            [p._id]: { ...(f[p._id] || {}), comment: e.target.value }
                          }))
                        }
                        className="input w-full text-sm md:text-base dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                        placeholder={t('reviews.comment_placeholder', {
                          name: displayFields(p).name
                        })}
                      />
                    </div>
                    <button
                      onClick={() => submitReview(p._id)}
                      className="w-full btn btn-primary rounded-full py-3 font-semibold text-base"
                    >
                      {t('reviews.submit')}
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
};

export default Reviews;
