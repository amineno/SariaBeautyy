import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useCurrency } from '../context/CurrencyContext';
import { Star, ShieldCheck, Truck, Sparkles, Quote, Mail, ArrowRight } from 'lucide-react';
import api from '../api/axios';
import Hero from '../components/Hero';
import { toast } from 'react-hot-toast';
import { Helmet } from 'react-helmet-async';

const Home = () => {
  const { t, i18n } = useTranslation();
  const { formatPrice } = useCurrency();
  const [products, setProducts] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');

  const resolveImage = (img) => {
    if (!img) return '';
    const lower = img.toLowerCase();
    if (lower.startsWith('http') || lower.startsWith('data:') || lower.startsWith('/')) return img;
    return `/images/${img}`;
  };

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const [pRes, topRes] = await Promise.all([
          api.get('/products'),
          api.get('/products/top')
        ]);
        setProducts(pRes.data || []);
        setTopProducts(topRes.data || []);
      } catch (e) {
        console.error('Error fetching home products', e);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  const featured = products.slice(0, 6);
  const categories = Array.from(new Set(products.map(p => p.category))).slice(0, 6);
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

  return (
    <main className="bg-gradient-to-b from-rose-50/70 via-white to-rose-100/70 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 transition-colors duration-300">
      <Helmet>
        <title>Saria Beauty | Premium Beauty Products</title>
        <meta name="description" content="Saria Beauty offers the best premium beauty, skincare, and bodycare products in Tunisia. Shop now for elegance and quality." />
        <meta property="og:title" content="Saria Beauty | Premium Beauty Products" />
        <meta property="og:description" content="Discover premium beauty products at Saria Beauty. Quality and elegance delivered to your doorstep." />
      </Helmet>
      <Hero />

      <section className="relative py-20">
        <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-rose-100/70 via-transparent to-transparent dark:from-gray-800/70 pointer-events-none" />
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-3xl mx-auto text-center mb-12">
            <p className="text-xs md:text-sm font-semibold tracking-[0.25em] uppercase text-primary/80 dark:text-rose-400/80">
              {t('tagline')}
            </p>
            <h2 className="mt-4 text-3xl md:text-4xl font-serif text-gray-900 dark:text-white">
              {t('welcome')}
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="card-strong p-8 h-full flex flex-col items-center text-center bg-white dark:bg-gray-800 border-rose-100 dark:border-gray-700">
              <div className="bg-rose-50 dark:bg-gray-700/50 rounded-2xl w-16 h-16 flex items-center justify-center mb-6 shadow-sm">
                <ShieldCheck className="w-8 h-8 text-primary dark:text-rose-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">{t('home.quality_title')}</h3>
              <p className="text-gray-600 dark:text-gray-300 text-sm md:text-base">{t('home.quality_desc')}</p>
            </div>
            <div className="card-strong p-8 h-full flex flex-col items-center text-center bg-white dark:bg-gray-800 border-rose-100 dark:border-gray-700">
              <div className="bg-rose-50 dark:bg-gray-700/50 rounded-2xl w-16 h-16 flex items-center justify-center mb-6 shadow-sm">
                <Truck className="w-8 h-8 text-primary dark:text-rose-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">{t('home.delivery_title')}</h3>
              <p className="text-gray-600 dark:text-gray-300 text-sm md:text-base">{t('home.delivery_desc')}</p>
            </div>
            <div className="card-strong p-8 h-full flex flex-col items-center text-center bg-white dark:bg-gray-800 border-rose-100 dark:border-gray-700">
              <div className="bg-rose-50 dark:bg-gray-700/50 rounded-2xl w-16 h-16 flex items-center justify-center mb-6 shadow-sm">
                <Sparkles className="w-8 h-8 text-primary dark:text-rose-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">{t('home.elegance_title')}</h3>
              <p className="text-gray-600 dark:text-gray-300 text-sm md:text-base">{t('home.elegance_desc')}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="relative bg-rose-50/70 dark:bg-gray-800/50 py-20 transition-colors duration-300">
        <div className="absolute inset-0 z-0 opacity-40 dark:opacity-20">
          <div
            className="absolute inset-0 bg-repeat bg-center"
            style={{ backgroundImage: 'url(/images/patterns/subtle-dots.svg)' }}
          />
        </div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-10">
            <div>
              <p className="text-xs md:text-sm font-semibold tracking-[0.25em] uppercase text-primary/80 dark:text-rose-400/80 mb-2">
                {t('featured_products')}
              </p>
              <h2 className="text-3xl md:text-4xl font-serif text-gray-900 dark:text-white mb-3">
                {t('home.featured_title')}
              </h2>
              <p className="text-gray-600 dark:text-gray-300 max-w-xl text-sm md:text-base">
                {t('shop.subtitle')}
              </p>
            </div>
            <Link
              to="/shop"
              className="self-start md:self-auto btn btn-outline rounded-full px-8 py-3 text-sm font-semibold"
            >
              {t('home.view_shop')}
            </Link>
          </div>
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="card p-4 dark:bg-gray-800 dark:border-gray-700">
                  <div className="h-72 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 rounded-2xl mb-4 relative overflow-hidden shadow-inner">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
                  </div>
                  <div className="h-5 w-3/4 bg-gray-100 dark:bg-gray-700 rounded-md mb-2 animate-pulse" />
                  <div className="h-4 w-full bg-gray-100 dark:bg-gray-700 rounded-md mb-3 animate-pulse" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {featured.map((product) => (
                <Link
                  to={`/product/${product._id}`}
                  key={product._id}
                  className="card-strong bg-white/90 dark:bg-gray-800/90 rounded-3xl overflow-hidden group transition-all duration-500 hover:shadow-2xl hover:-translate-y-2 border border-rose-100/70 hover:border-rose-200/80 dark:border-gray-700 dark:hover:border-gray-600"
                >
                  <div className="h-72 overflow-hidden relative bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 rounded-2xl flex items-center justify-center shadow-inner m-3 mb-0">
                    <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent" />
                    <img
                      src={resolveImage(product.image)}
                      alt={product.name}
                      loading="lazy"
                      className="max-w-full max-h-full object-contain transition-all duration-700 ease-out group-hover:scale-110 group-hover:rotate-1 group-hover:shadow-2xl"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  </div>
                  <div className="p-6 pt-5">
                    <h3 className="text-xl font-serif text-gray-900 dark:text-white mb-2 truncate">
                      {displayFields(product).name}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-2">
                      {displayFields(product).description}
                    </p>
                    <div className="flex justify-between items-center">
                      <p className="text-primary dark:text-rose-400 font-bold text-2xl">
                        {formatPrice(product.price)}
                      </p>
                      <span className="btn btn-primary rounded-full px-6 py-3 text-sm font-semibold">
                        {t('shop_now')}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Best Sellers Section */}
      <section className="py-20 bg-white/50 dark:bg-gray-800/50 transition-colors duration-300">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center mb-12">
            <p className="text-xs md:text-sm font-semibold tracking-[0.25em] uppercase text-primary/80 dark:text-rose-400/80">
              {t('best_sellers')}
            </p>
            <h2 className="mt-4 text-3xl md:text-4xl font-serif text-gray-900 dark:text-white">
              {t('home.best_sellers_title')}
            </h2>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {topProducts.map((product) => (
              <Link
                key={product._id}
                to={`/product/${product._id}`}
                className="card-strong bg-white/90 dark:bg-gray-800/90 rounded-3xl overflow-hidden group transition-all duration-500 hover:shadow-2xl hover:-translate-y-2 flex flex-col border border-rose-100/80 dark:border-gray-700"
              >
                <div className="h-64 overflow-hidden relative bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 rounded-2xl flex items-center justify-center shadow-inner m-3 mb-0">
                  <img
                    src={resolveImage(product.image)}
                    alt={displayFields(product).name}
                    className="max-w-full max-h-full object-contain p-4 transition-transform duration-700 group-hover:scale-110"
                  />
                  {product.rating > 4.7 && (
                    <div className="absolute top-4 right-4 bg-primary text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-lg">
                      {t('home.top_rated')}
                    </div>
                  )}
                </div>
                <div className="p-6">
                  <h3 className="text-lg font-serif text-gray-900 dark:text-white mb-2 truncate">
                    {displayFields(product).name}
                  </h3>
                  <div className="flex items-center gap-1 mb-4 text-amber-400">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={`w-4 h-4 ${i < Math.floor(product.rating) ? 'fill-current' : ''}`} />
                    ))}
                    <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">({product.numReviews})</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <p className="text-primary font-bold text-xl">
                      {formatPrice(product.price)}
                    </p>
                    <span className="text-sm font-medium text-primary hover:underline flex items-center gap-1">
                      {t('shop_now')} <ArrowRight className="w-4 h-4" />
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
          <div className="text-center mt-12">
            <Link to="/shop" className="btn btn-primary px-10 py-4 rounded-full font-semibold">
              {t('view_all_products')}
            </Link>
          </div>
        </div>
      </section>

      <section className="py-20 relative overflow-hidden">
        <div className="absolute inset-0 z-0 opacity-30 dark:opacity-10">
          <div
            className="absolute inset-0 bg-repeat bg-center"
            style={{ backgroundImage: 'url(/images/patterns/subtle-dots.svg)' }}
          />
        </div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-3xl mx-auto text-center mb-10">
            <p className="text-xs md:text-sm font-semibold tracking-[0.25em] uppercase text-primary/80 dark:text-rose-400/80 mb-3">
              {t('category.collection')}
            </p>
            <h2 className="text-3xl md:text-4xl font-serif text-gray-900 dark:text-white mb-3">
              {t('home.categories_title')}
            </h2>
            <p className="text-gray-600 dark:text-gray-300 text-sm md:text-base">
              {t('shop.subtitle')}
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-4">
            {categories.map((cat) => (
              <Link
                key={cat}
                to="/shop"
                className="px-6 py-3 bg-white/90 dark:bg-gray-800/90 rounded-full text-gray-800 dark:text-gray-200 font-semibold shadow-sm hover:bg-primary hover:text-white dark:hover:bg-rose-500 transition-all duration-300 transform hover:-translate-y-1 border border-gray-200/70 dark:border-gray-700"
              >
                {displayCategory(cat)}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-gray-50/80 dark:bg-gray-900/80 transition-colors duration-300">
        <div className="container mx-auto px-4 py-16">
          <div className="bg-white/90 dark:bg-gray-800/90 rounded-3xl p-8 md:p-14 shadow-sm border border-rose-100/80 dark:border-gray-700 transition-colors duration-300">
            <div className="flex flex-col lg:flex-row items-center justify-between gap-10">
              <div className="lg:w-1/2 text-center lg:text-left">
                <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-rose-50 dark:bg-gray-700/50 text-primary dark:text-rose-400 mb-4">
                  <Mail className="w-4 h-4" />
                  <span className="text-xs font-semibold tracking-[0.2em] uppercase">
                    {t('footer.newsletter_title')}
                  </span>
                </div>
                <h3 className="text-3xl md:text-4xl font-serif text-gray-900 dark:text-white mb-3">
                  {t('newsletter.title')}
                </h3>
                <p className="text-gray-600 dark:text-gray-300 text-sm md:text-base max-w-md">
                  {t('newsletter.desc')}
                </p>
              </div>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!email) {
                    toast.error(t('newsletter.email_required'));
                    return;
                  }
                  try {
                    const { data } = await api.post('/newsletter/subscribe', { email });
                    toast.success(data.message || t('newsletter.success'));
                    setEmail('');
                  } catch (error) {
                    toast.error(error.response?.data?.message || t('newsletter.error'));
                  }
                }}
                className="flex w-full max-w-md gap-3"
              >
                <input
                  type="email"
                  placeholder={t('newsletter.email_placeholder')}
                  className="input flex-1 rounded-full px-6 py-3"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <button
                  type="submit"
                  className="btn btn-primary rounded-full px-8 py-3 font-semibold whitespace-nowrap"
                >
                  {t('newsletter.subscribe')}
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
};

export default Home;
