import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useCurrency } from '../context/CurrencyContext';
import { ArrowLeft, Star, ShoppingBag, Heart } from 'lucide-react';
import api from '../api/axios';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { Helmet } from 'react-helmet-async';
import toast from 'react-hot-toast';

const ProductDetails = () => {
  const { id } = useParams();
  const { t, i18n } = useTranslation();
  const { formatPrice } = useCurrency();
  const { user } = useAuth();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isInWishlist, setIsInWishlist] = useState(false);
  const { addToCart } = useCart();
  const [newReviewNotification, setNewReviewNotification] = useState(false);
  const [newReviewIds, setNewReviewIds] = useState([]);
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

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const { data } = await api.get(`/products/${id}`);
        setProduct(data);
      } catch (error) {
        console.error("Error fetching product:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();

    // Check if in wishlist
    const checkWishlist = async () => {
      if (user) {
        try {
          const config = { headers: { Authorization: `Bearer ${user.token}` } };
          const { data } = await api.get('/users/wishlist', config);
          setIsInWishlist(data.some(p => p._id === id));
        } catch (e) {
          console.error(e);
        }
      }
    };
    checkWishlist();

    // Set up real-time review updates using EventSource
    const baseUrl = api.defaults.baseURL.replace(/\/api$/, '');
    const es = new EventSource(`${baseUrl}/api/products/events`);

    es.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        
        // Check if this is a review update for our product
        if (payload.channel === 'product' && payload.type === 'review_created' && payload.productId === id) {
          // Refresh product data to get updated reviews
          fetchProduct();
          // Show notification
          setNewReviewNotification(true);
          // Hide notification after 3 seconds
          setTimeout(() => setNewReviewNotification(false), 3000);
          // Track the new review ID for highlighting
          if (payload.review && payload.review._id) {
            setNewReviewIds(prev => [...prev, payload.review._id]);
            // Remove the highlight after 5 seconds
            setTimeout(() => {
              setNewReviewIds(prev => prev.filter(id => id !== payload.review._id));
            }, 5000);
          }
        }
      } catch (err) {
        console.warn('SSE parse error', err);
      }
    };

    es.onerror = (err) => {
      console.warn('SSE connection error', err);
    };

    return () => {
      es.close();
    };
  }, [id, user]);

  const toggleWishlist = async () => {
    if (!user) {
      toast.error(t('auth.login_required'));
      return;
    }
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      if (isInWishlist) {
        await api.delete(`/users/wishlist/${id}`, config);
        setIsInWishlist(false);
        toast.success(t('wishlist.removed_success'));
      } else {
        await api.post(`/users/wishlist/${id}`, {}, config);
        setIsInWishlist(true);
        toast.success(t('wishlist.added_success'));
      }
    } catch {
      toast.error(t('wishlist.error'));
    }
  };

  if (loading) return <div className="text-center py-20 text-primary dark:text-rose-400">{t('product.loading')}</div>;
  if (!product) return <div className="text-center py-20 dark:text-white">{t('product.not_found')}</div>;

  const { name, description } = displayFields(product);

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 transition-colors duration-300">
      <Helmet>
        <title>{name} | Saria Beauty</title>
        <meta name="description" content={description.substring(0, 160)} />
        <meta property="og:title" content={`${name} | Saria Beauty`} />
        <meta property="og:description" content={description.substring(0, 160)} />
        <meta property="og:image" content={resolveImage(product.image)} />
      </Helmet>
      <div className="container mx-auto px-4 py-8">
        <Link to="/" className="inline-flex items-center text-gray-500 dark:text-gray-400 hover:text-primary dark:hover:text-rose-400 mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2 rtl:ml-2 rtl:mr-0" />
          {t('back_to_shop')}
        </Link>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          {/* Image Section */}
          <div className="card p-4 ring-1 ring-transparent hover:ring-primary/20 dark:hover:ring-rose-500/30 transition-all dark:bg-gray-800 dark:border-gray-700">
            <div className="h-[28rem] w-full overflow-hidden rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center relative shadow-inner">
              <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent dark:from-black/20"></div>
              <img 
                src={resolveImage(product.image)} 
                alt={displayFields(product).name}
                className="max-w-full max-h-full object-contain drop-shadow-xl hover:scale-105 transition-transform duration-500"
              />
            </div>
          </div>

          {/* Info Section */}
          <div className="flex flex-col justify-center">
            <div className="mb-2">
              <span className="px-3 py-1 bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-300 rounded-full text-xs font-semibold tracking-wider uppercase">
                {product.category}
              </span>
            </div>
            
            <h1 className="text-3xl md:text-4xl font-serif text-gray-900 dark:text-white mb-4 leading-tight">
              {displayFields(product).name}
            </h1>

            <div className="flex items-center mb-6">
              <div className="flex text-yellow-400 mr-2">
                {[...Array(5)].map((_, i) => (
                  <Star 
                    key={i} 
                    className={`w-5 h-5 ${i < Math.floor(product.rating) ? 'fill-current' : 'text-gray-300 dark:text-gray-600'}`} 
                  />
                ))}
              </div>
              <span className="text-gray-500 dark:text-gray-400 text-sm">
                ({product.numReviews} {t('reviews')})
              </span>
            </div>

            <p className="text-3xl font-bold text-primary dark:text-rose-400 mb-6">
              {formatPrice(product.price)}
            </p>

            <div className="prose prose-sm dark:prose-invert text-gray-600 dark:text-gray-300 mb-8 leading-relaxed">
              {displayFields(product).description}
            </div>

            <div className="flex flex-col sm:flex-row gap-4 mb-8">
              <button
                onClick={() => addToCart(product, 1)}
                disabled={product.countInStock === 0}
                className={`flex-1 px-8 py-4 rounded-full flex items-center justify-center gap-2 text-white font-semibold shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300 ${
                  product.countInStock > 0 
                    ? 'bg-gray-900 dark:bg-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100' 
                    : 'bg-gray-300 dark:bg-gray-700 cursor-not-allowed'
                }`}
              >
                <ShoppingBag className="w-5 h-5" />
                {product.countInStock > 0 ? t('add_to_cart') : t('out_of_stock')}
              </button>
              
              <button
                onClick={toggleWishlist}
                className={`px-8 py-4 rounded-full flex items-center justify-center gap-2 font-semibold border-2 transition-all duration-300 ${
                  isInWishlist 
                    ? 'border-primary bg-primary text-white' 
                    : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:border-primary hover:text-primary'
                }`}
              >
                <Heart className={`w-5 h-5 ${isInWishlist ? 'fill-current' : ''}`} />
                {isInWishlist ? t('wishlist.saved') : t('wishlist.save')}
              </button>
            </div>
          </div>
        </div>

        {/* Reviews Section */}
        {product.reviews && product.reviews.length > 0 && (
          <div className="mt-16">
            <div className="border-t border-gray-200 dark:border-gray-700 pt-12">
              {/* New Review Notification */}
              {newReviewNotification && (
                <div className="mb-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 flex items-center transition-colors">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-green-400 dark:text-green-500" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-green-800 dark:text-green-300">New review added!</p>
                    <p className="text-sm text-green-700 dark:text-green-400">A new review has been posted for this product.</p>
                  </div>
                </div>
              )}
              <h2 className="text-2xl font-serif text-gray-900 dark:text-white mb-8">Customer Reviews</h2>
              
              {/* Review Summary */}
              <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-6 mb-8">
                <div className="flex items-center gap-4">
                  <div className="flex text-yellow-400">
                    {[...Array(5)].map((_, i) => (
                      <svg key={i} className={`w-6 h-6 ${i < Math.floor(product.rating) ? 'fill-current' : 'text-gray-300 dark:text-gray-600'}`} viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{product.rating.toFixed(1)}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Based on {product.numReviews} {product.numReviews === 1 ? 'review' : 'reviews'}</p>
                  </div>
                </div>
              </div>

              {/* Individual Reviews */}
              <div className="space-y-6">
                {product.reviews.map((review, index) => (
                  <div key={index} className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 transition-all duration-300 ${
                    newReviewIds.includes(review._id) ? 'new-review-highlight' : ''
                  }`}>
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h4 className="font-semibold text-gray-900 dark:text-white">{review.name}</h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {new Date(review.createdAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </p>
                      </div>
                      <div className="flex text-yellow-400">
                        {[...Array(5)].map((_, i) => (
                          <svg key={i} className={`w-4 h-4 ${i < review.rating ? 'fill-current' : 'text-gray-300 dark:text-gray-600'}`} viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                        ))}
                      </div>
                    </div>
                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{review.comment}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* No Reviews Message */}
        {(!product.reviews || product.reviews.length === 0) && (
          <div className="mt-16">
            <div className="border-t border-gray-200 dark:border-gray-700 pt-12">
              <h2 className="text-2xl font-serif text-gray-900 dark:text-white mb-4">Customer Reviews</h2>
              <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-8 text-center">
                <p className="text-gray-600 dark:text-gray-400">No reviews yet. Be the first to review this product!</p>
              </div>
            </div>
          </div>
        )}
      </div>

    </div>
  );
};

export default ProductDetails;
