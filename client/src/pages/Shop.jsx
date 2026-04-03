import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useCurrency } from '../context/CurrencyContext';
import api from '../api/axios';
import { Search, X } from 'lucide-react';
import { motion } from 'framer-motion';

const Shop = () => {
  const { t, i18n } = useTranslation();
  const { formatPrice } = useCurrency();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [sort, setSort] = useState('newest');

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const { data } = await api.get('/products', {
          params: {
            keyword: query,
            category: category === 'All' ? '' : category,
            sort: sort
          }
        });
        setProducts(data);
      } catch (error) {
        console.error("Error fetching products:", error);
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(() => {
      fetchProducts();
    }, 500); // Debounce search

    return () => clearTimeout(timer);
  }, [query, category, sort]);

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

  const categories = ['All', 'Beauty', 'Skincare', 'Bodycare', 'Haircare'];
  
  const filtered = products; // Sorting and filtering handled by backend now

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
            <p className="text-xs md:text-sm font-semibold tracking-[0.25em] uppercase text-primary/80 mb-3">
              {t('featured_products')}
            </p>
            <h1 className="text-4xl md:text-6xl font-serif text-gray-900 dark:text-white mb-4">
              {t('shop.title')}
            </h1>
            <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto text-base md:text-lg">
              {t('shop.subtitle')}
            </p>
          </motion.div>
        </div>
      </div>

      <div className="container mx-auto px-4 pb-16">
        <div className="max-w-5xl mx-auto -mt-24 relative z-20">
          <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-md rounded-3xl shadow-xl border border-rose-100/80 dark:border-gray-700 px-4 py-4 md:px-6 md:py-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between transition-colors duration-300">
            <div className="flex items-center flex-1 bg-gray-50/60 dark:bg-gray-700/60 rounded-2xl px-3 py-2 md:px-4 md:py-2 border border-gray-200/80 dark:border-gray-600 focus-within:ring-4 focus-within:ring-primary/10 transition-all duration-300">
              <div className="pl-1 text-gray-400 dark:text-gray-500">
                <Search className="w-5 h-5" />
              </div>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('shop.search_placeholder')}
                className="w-full bg-transparent border-none focus:ring-0 text-sm md:text-base text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 px-3 py-2 outline-none"
              />
              {query && (
                <button
                  onClick={() => setQuery('')}
                  className="p-1.5 md:p-2 ml-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-full transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            
            <div className="flex flex-wrap items-center gap-4 justify-start md:justify-end">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t('sort_by')}:</span>
                <select 
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                  className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-sm rounded-xl px-3 py-1.5 outline-none focus:ring-2 focus:ring-primary/20 dark:text-white"
                >
                  <option value="newest">{t('shop.sort.newest')}</option>
                  <option value="price_asc">{t('shop.sort.price_low_to_high')}</option>
                  <option value="price_desc">{t('shop.sort.price_high_to_low')}</option>
                  <option value="rating">{t('shop.sort.highest_rated')}</option>
                </select>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setCategory(cat)}
                    className={`px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm font-medium rounded-full transition-all duration-300 border ${
                      category === cat
                        ? 'bg-primary border-primary text-white shadow-md shadow-primary/30 transform -translate-y-0.5'
                        : 'bg-white/80 dark:bg-gray-800/80 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-primary/50 dark:hover:border-primary/50 hover:text-primary dark:hover:text-primary hover:bg-rose-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    {cat === 'All' ? t('category.all') : t(`category.${cat.toLowerCase()}`)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-16">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="card p-4 dark:bg-gray-800 dark:border-gray-700">
                  <div className="h-72 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 rounded-2xl mb-4 relative overflow-hidden shadow-inner">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 dark:via-gray-600/30 to-transparent animate-shimmer" />
                  </div>
                  <div className="h-6 w-3/4 bg-gray-100 dark:bg-gray-700 rounded-md mb-2 animate-pulse" />
                  <div className="h-4 w-full bg-gray-100 dark:bg-gray-700 rounded-md mb-4 animate-pulse" />
                  <div className="flex justify-between items-center">
                    <div className="h-6 w-20 bg-gray-100 dark:bg-gray-700 rounded-md animate-pulse" />
                    <div className="h-10 w-28 bg-gray-100 dark:bg-gray-700 rounded-full animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {filtered.map((product) => (
                <motion.div
                  key={product._id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  <Link
                    to={`/product/${product._id}`}
                    className="card-strong bg-white/90 dark:bg-gray-800/90 rounded-3xl overflow-hidden group transition-all duration-500 hover:shadow-2xl hover:-translate-y-2 flex flex-col border border-rose-100/80 dark:border-gray-700 hover:border-rose-200/90 dark:hover:border-gray-600"
                  >
                    <div className="h-72 overflow-hidden relative bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 rounded-2xl flex items-center justify-center shadow-inner m-3 mb-0">
                      <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent dark:from-black/20" />
                      <img
                        src={resolveImage(product.image)}
                        alt={displayFields(product).name}
                        loading="lazy"
                        className="max-w-full max-h-full object-contain transition-all duration-700 ease-out group-hover:scale-110 group-hover:rotate-1 group-hover:shadow-2xl"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    </div>
                    <div className="p-6 flex flex-col flex-grow">
                      <h3 className="text-xl font-serif text-gray-900 dark:text-white mb-2 truncate">
                        {displayFields(product).name}
                      </h3>
                      <p className="text-gray-600 dark:text-gray-300 text-sm mb-4 line-clamp-2 flex-grow">
                        {displayFields(product).description}
                      </p>
                      <div className="flex items-center mb-3 text-xs md:text-sm text-gray-500 dark:text-gray-400">
                        <span
                          className={`w-2 h-2 rounded-full mr-2 ${
                            product.countInStock > 0 ? 'bg-green-500' : 'bg-red-500'
                          }`}
                        />
                        {product.countInStock > 0 ? t('in_stock') : t('out_of_stock')}
                      </div>
                      <div className="flex justify-between items-center mt-auto">
                        <p className="text-primary font-bold text-2xl">
                          {formatPrice(product.price)}
                        </p>
                        <button
                          className={`btn rounded-full px-6 py-3 text-sm font-semibold ${
                            product.countInStock > 0
                              ? 'btn-primary'
                              : 'btn-disabled bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                          }`}
                          disabled={product.countInStock === 0}
                        >
                          {product.countInStock > 0 ? t('shop_now') : t('out_of_stock')}
                        </button>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-20 card bg-gray-50/70 dark:bg-gray-800/50 backdrop-blur-sm border-2 border-dashed border-gray-200 dark:border-gray-700">
              <Search className="w-16 h-16 text-gray-200 dark:text-gray-500 mx-auto mb-4" />
              <h3 className="text-xl font-medium text-gray-800 dark:text-gray-200">
                {t('shop.no_products_title')}
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mt-2">
                {t('shop.no_products_desc')}
              </p>
              <button
                onClick={() => {
                  setQuery('');
                  setCategory('All');
                }}
                className="mt-6 text-primary dark:text-rose-400 font-medium hover:underline hover:text-rose-600 dark:hover:text-rose-300 transition-colors"
              >
                {t('shop.clear_filters')}
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
};

export default Shop;
