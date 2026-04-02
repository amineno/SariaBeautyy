import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { useCurrency } from '../../context/CurrencyContext';
import ConfirmModal from '../../components/ConfirmModal';
import toast from 'react-hot-toast';
import { 
  Plus, Trash2, Pencil, Users, ShoppingCart, Package, 
  BarChart3, RefreshCw, LayoutDashboard, 
  ChevronRight, Search, Filter, Image as ImageIcon,
  DollarSign, Box, UserCheck, AlertCircle, X,
  TrendingUp, TrendingDown, Target, Zap, Star
} from 'lucide-react';

const AdminDashboard = () => {
  const { t, i18n } = useTranslation();
  const { formatPrice } = useCurrency();
  const { user } = useAuth();
  const authHeader = useMemo(() => ({
    headers: { Authorization: `Bearer ${user?.token}` }
  }), [user]);
  
  const SERVER_ORIGIN = api.defaults.baseURL.replace(/\/api$/, '');
  
  const resolveImage = (img) => {
    if (!img) return '';
    const lower = String(img).toLowerCase();
    if (lower.startsWith('http') || lower.startsWith('data:')) return img;
    if (lower.startsWith('/uploads')) return SERVER_ORIGIN + img;
    if (lower.startsWith('/images/')) return img;
    if (lower.startsWith('/')) return img;
    return `/images/${img}`;
  };

  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = window.localStorage.getItem('adminActiveTab');
      if (stored) return stored;
    }
    return 'products';
  });
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [users, setUsers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [aboutContent, setAboutContent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ 
    name: '', description: '', price: '', category: '', image: '', 
    countInStock: '', nameFr: '', descFr: '', nameAr: '', descAr: '' 
  });
  const [editingId, setEditingId] = useState(null);
  const [stats, setStats] = useState({ totalSales: 0, orders: 0, products: 0, customers: 0 });
  const [categories, setCategories] = useState([]);
  const [replyModalOpen, setReplyModalOpen] = useState(false);
  const [replyTarget, setReplyTarget] = useState(null);
  const [replyContent, setReplyContent] = useState('');
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    icon: null
  });

  const monthlyStats = stats.monthly || [];
  const lastMonth = monthlyStats.length > 0 ? monthlyStats[monthlyStats.length - 1] : null;
  const prevMonth = monthlyStats.length > 1 ? monthlyStats[monthlyStats.length - 2] : null;
  const salesDelta = lastMonth && prevMonth ? lastMonth.sales - prevMonth.sales : null;
  const salesChangePercent = lastMonth && prevMonth && prevMonth.sales ? (salesDelta / prevMonth.sales) * 100 : null;

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
    const fetchAll = async () => {
      setLoading(true);
      try {
        const [pRes, oRes, uRes, sRes, cRes, mRes, aRes] = await Promise.all([
          api.get('/products', authHeader),
          api.get('/orders/all', authHeader),
          api.get('/users', authHeader),
          api.get('/admin/stats', authHeader),
          api.get('/products/categories/list', authHeader),
          api.get('/contact', authHeader),
          api.get('/pages/about', authHeader)
        ]);
        setProducts(pRes.data || []);
        const rv = (pRes.data || []).flatMap(p => (p.reviews || []).map(r => ({
          ...r,
          productId: p._id,
          product: p,
          productName: p.name,
          productImage: p.image
        }))).sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
        setReviews(rv);
        setOrders(oRes.data || []);
        setUsers(uRes.data || []);
        setStats(s => sRes.data || s);
        setCategories(cRes.data || []);
        setMessages(mRes.data || []);
        setAboutContent(aRes.data || null);
      } catch (e) {
        console.error('Admin fetch error', e);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();

    const baseUrl = api.defaults.baseURL.replace(/\/api$/, '');
    const es = new EventSource(`${baseUrl}/api/products/events`);
    const contactEs = new EventSource(`${baseUrl}/api/contact/events`);
    const pageEs = new EventSource(`${baseUrl}/api/pages/events`);

    es.onmessage = (ev) => {
      try {
        const payload = JSON.parse(ev.data);

        if (payload.channel === 'order' && payload.type === 'order_created') {
          setOrders(prev => [payload.order, ...prev]);
          toast.success(t('admin.toast.new_order', { amount: payload.order.totalPrice }), { icon: '🛍️' });
        } else if (payload.channel === 'order' && payload.type === 'order_updated') {
          setOrders(prev => prev.map(o => o._id === payload.order._id ? payload.order : o));
        } else if (payload.channel === 'product' && payload.type === 'product_created') {
          setProducts(prev => [payload.product, ...prev]);
        } else if (payload.channel === 'product' && payload.type === 'product_updated') {
          setProducts(prev => {
            const updatedProducts = prev.map(p => p._id === payload.product._id ? payload.product : p);
            setReviews(() => {
              const rv = updatedProducts.flatMap(p => (p.reviews || []).map(r => ({
                ...r,
                productId: p._id,
                product: p,
                productName: p.name,
                productImage: p.image
              }))).sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
              return rv;
            });
            return updatedProducts;
          });
        } else if (payload.channel === 'product' && payload.type === 'review_created') {
          toast.success(t('admin.toast.new_review', { productName: payload.productName }), { icon: '⭐' });
          setReviews(prev => ([{
            ...payload.review,
            productId: payload.productId,
            product: payload.product || products.find(p => p._id === payload.productId), // Try to find product if not in payload
            productName: payload.productName
          }, ...prev]));
        } else if (payload.channel === 'product' && payload.type === 'product_deleted') {
          setProducts(prev => prev.filter(p => p._id !== payload.id));
        }
      } catch (err) {
        console.warn('SSE parse error', err);
      }
    };

    contactEs.onmessage = (ev) => {
      try {
        const payload = JSON.parse(ev.data);
        if (payload.channel === 'contact') {
          if (payload.type === 'new_message') {
            setMessages(prev => [payload.message, ...prev]);
            toast.success(t('admin.toast.new_message', { name: payload.message.name }), { icon: '📧' });
          } else if (payload.type === 'message_replied') {
            setMessages(prev => prev.map(m => m._id === payload.message._id ? payload.message : m));
            toast.success(t('admin.toast.message_replied', { name: payload.message.name }), { icon: '✅' });
          }
        }
      } catch (e) { console.error('Contact SSE Error', e); }
    };

    pageEs.onmessage = (ev) => {
      try {
        const payload = JSON.parse(ev.data);
        if (payload.channel === 'page' && payload.type === 'page_content_updated') {
          if (payload.page === 'about') setAboutContent(payload.content);
          toast.success(t('admin.toast.page_updated', { page: payload.page }), { icon: '📄' });
        }
      } catch (e) { console.error('Page SSE Error', e); }
    };

    es.onerror = (err) => {
      console.warn('SSE products connection error', err);
    };
    contactEs.onerror = (err) => {
      console.warn('SSE contact connection error', err);
    };
    pageEs.onerror = (err) => {
      console.warn('SSE pages connection error', err);
    };

    return () => {
      es.close();
      contactEs.close();
      pageEs.close();
    };
  }, [authHeader, user]);

  const resetForm = () => {
    setForm({ 
      name: '', description: '', price: '', category: '', image: '', 
      countInStock: '', nameFr: '', descFr: '', nameAr: '', descAr: '' 
    });
    setEditingId(null);
    setShowForm(false);
  };

  const createOrUpdateProduct = async (e) => {
    e.preventDefault();
    try {
      const priceValue = parseFloat(form.price);
      if (isNaN(priceValue) || priceValue < 0) {
        toast.error('Please enter a valid price');
        return;
      }
      // Convert AED to USD (backend expects USD) - use ultra-precise conversion to avoid floating point errors
      const usdPrice = Math.round(priceValue / 3.67 * 100000000) / 100000000;
      const body = {
        name: form.name,
        description: form.description,
        price: usdPrice,
        category: form.category,
        image: form.image,
        countInStock: Number(form.countInStock || 0)
      };
      body.translations = {
        fr: { name: form.nameFr || undefined, description: form.descFr || undefined },
        ar: { name: form.nameAr || undefined, description: form.descAr || undefined },
      };
      if (editingId) {
        const { data } = await api.put(`/products/${editingId}`, body, authHeader);
        setProducts(prev => prev.map(p => p._id === editingId ? data : p));
        toast.success(t('admin.products.update_success'));
      } else {
        const { data } = await api.post('/products', body, authHeader);
        setProducts(prev => [data, ...prev]);
        toast.success(t('admin.products.create_success'));
      }
      resetForm();
    } catch (e) {
      toast.error(e.response?.data?.message || t('admin.products.save_error'));
      console.error('Save product failed', e);
    }
  };

  const editProduct = (p) => {
    setEditingId(p._id);
    // Convert USD to AED for admin editing (backend stores in USD) - use ultra-precise conversion to avoid floating point errors
    const aedPrice = (Math.round(p.price * 3.67 * 100000000) / 100000000).toFixed(2);
    setForm({
      name: p.name,
      description: p.description,
      price: aedPrice,
      category: p.category,
      image: p.image,
      countInStock: p.countInStock,
      nameFr: p.translations?.fr?.name || '',
      descFr: p.translations?.fr?.description || '',
      nameAr: p.translations?.ar?.name || '',
      descAr: p.translations?.ar?.description || ''
    });
    setShowForm(true);
  };

  const deleteProduct = (id) => {
    setConfirmModal({
      isOpen: true,
      title: t('admin.products.delete_confirm.title'),
      message: t('admin.products.delete_confirm.text'),
      icon: AlertCircle,
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        try {
          const loadingToast = toast.loading(t('admin.common.deleting'));
          await api.delete(`/products/${id}`, authHeader);
          setProducts(prev => prev.filter(p => p._id !== id));
          toast.success(t('admin.products.delete_success'), { id: loadingToast });
        } catch (e) {
          toast.error(t('admin.products.delete_error'));
          console.error('Delete product failed', e);
        }
      }
    });
  };

  const updateOrderStatus = async (id, updates) => {
    try {
      const { data } = await api.put(`/orders/${id}/status`, updates, authHeader);
      setOrders(prev => prev.map(o => o._id === id ? data : o));
      toast.success(t('admin.orders.status_update_success'));
    } catch (e) {
      toast.error(e.response?.data?.message || t('admin.orders.status_update_error'));
      console.error('Update order status failed', e);
    }
  };

  const deleteUser = (id) => {
    setConfirmModal({
      isOpen: true,
      title: t('admin.users.delete_confirm.title'),
      message: t('admin.users.delete_confirm.text'),
      icon: AlertCircle,
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        try {
          const loadingToast = toast.loading(t('admin.common.deleting'));
          await api.delete(`/users/${id}`, authHeader);
          setUsers(prev => prev.filter(u => u._id !== id));
          toast.success(t('admin.users.delete_success'), { id: loadingToast });
        } catch (e) {
          toast.error(e.response?.data?.message || t('admin.users.delete_error'));
        }
      }
    });
  };

  const deleteReview = (productId, reviewId) => {
    setConfirmModal({
      isOpen: true,
      title: t('admin.reviews.delete_confirm.title'),
      message: t('admin.reviews.delete_confirm.text'),
      icon: AlertCircle,
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        try {
          const loadingToast = toast.loading(t('admin.common.deleting'));
          await api.delete(`/products/${productId}/reviews/${reviewId}`, authHeader);
          setReviews(prev => prev.filter(r => r._id !== reviewId));
          toast.success(t('admin.reviews.delete_success'), { id: loadingToast });
        } catch (e) {
          toast.error(e.response?.data?.message || t('admin.reviews.delete_error'));
        }
      }
    });
  };

  const toggleAdmin = async (id, isAdmin) => {
    try {
      const { data } = await api.put(`/users/${id}/admin`, { isAdmin }, authHeader);
      setUsers(prev => prev.map(u => u._id === id ? data : u));
      toast.success(isAdmin ? t('admin.users.promoted') : t('admin.users.demoted'));
    } catch (e) {
      toast.error(e.response?.data?.message || t('admin.users.toggle_error'));
      console.error('Toggle admin failed', e);
    }
  };

  const sidebarItems = [
    { id: 'stats', label: t('admin.sidebar.dashboard'), icon: LayoutDashboard },
    { id: 'products', label: t('admin.sidebar.products'), icon: Package },
    { id: 'orders', label: t('admin.sidebar.orders'), icon: ShoppingCart },
    { id: 'users', label: t('admin.sidebar.users'), icon: Users },
    { id: 'reviews', label: t('admin.sidebar.reviews'), icon: Star },
    { id: 'messages', label: t('admin.sidebar.messages'), icon: Zap },
    { id: 'about', label: t('admin.sidebar.about'), icon: ImageIcon },
  ];

  return (
    <div className="flex min-h-screen bg-gradient-to-b from-rose-50/70 via-white to-rose-100/70 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 transition-colors duration-300">
      {/* Sidebar */}
      <aside className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 hidden md:flex flex-col sticky top-0 h-screen transition-colors duration-300">
        <div className="p-6 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-xl font-serif font-bold text-primary flex items-center gap-2">
            Saria <span className="text-gray-900 dark:text-white">Admin</span>
          </h2>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {sidebarItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                if (typeof window !== 'undefined') {
                  window.localStorage.setItem('adminActiveTab', item.id);
                }
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                activeTab === item.id
                  ? 'bg-rose-50 dark:bg-rose-900/20 text-primary dark:text-rose-400'
                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <item.icon className={`w-5 h-5 ${activeTab === item.id ? 'text-primary dark:text-rose-400' : 'text-gray-400 dark:text-gray-500'}`} />
              {item.label}
              {activeTab === item.id && <ChevronRight className="w-4 h-4 ml-auto opacity-50" />}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-gray-100 dark:border-gray-700">
          <div className="bg-rose-50 dark:bg-gray-700 rounded-xl p-4 transition-colors duration-300">
            <p className="text-xs text-rose-600 dark:text-rose-400 font-medium mb-1 uppercase tracking-wider">{t('admin.sidebar.loggedin')}</p>
            <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{user?.name}</p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0 flex flex-col">
        <header className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 sticky top-0 z-20 transition-colors duration-300">
          <div className="px-6 py-4 flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-serif font-bold text-gray-900 dark:text-white">
                {sidebarItems.find(i => i.id === activeTab)?.label}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">{t('admin.header.subtitle')}</p>
            </div>
            <div className="flex items-center gap-4">
              {loading && <RefreshCw className="w-5 h-5 text-primary animate-spin" />}
              {activeTab === 'products' && !showForm && (
                <button 
                    onClick={() => setShowForm(true)}
                    className="bg-primary text-white px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 hover:bg-primary/90 transition-colors shadow-lg shadow-rose-200 dark:shadow-none"
                  >
                    <Plus className="w-4 h-4" /> {t('admin.products.add_btn')}
                  </button>
              )}
            </div>
          </div>
          <div className="md:hidden border-t border-gray-100 dark:border-gray-700 bg-white/90 dark:bg-gray-800/90">
            <div className="px-4 py-2 flex gap-2 overflow-x-auto">
              {sidebarItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    if (typeof window !== 'undefined') {
                      window.localStorage.setItem('adminActiveTab', item.id);
                    }
                  }}
                  className={`flex items-center gap-2 px-3 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                    activeTab === item.id
                      ? 'bg-primary text-white shadow'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </header>

        <div className="p-6">
          {/* Messages View */}
          {activeTab === 'messages' && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50/50 dark:bg-gray-700/50">
                      <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('admin.table.date')}</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('admin.messages.table.sender')}</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('admin.messages.table.subject')}</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('admin.messages.table.message')}</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('admin.messages.table.status')}</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">{t('admin.table.actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {messages.map((m) => (
                      <tr key={m._id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/50 transition-colors">
                        <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">{new Date(m.createdAt).toLocaleDateString()}</td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-bold text-gray-900 dark:text-white">{m.name}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">{m.email}</div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">{m.subject}</td>
                        <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300 max-w-xs truncate">{m.message}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            m.status === 'new' ? 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                          }`}>
                            {m.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => {
                                setReplyTarget(m);
                                setReplyContent(m.adminReply || '');
                                setReplyModalOpen(true);
                              }}
                              className="px-3 py-1.5 text-xs font-medium bg-primary text-white rounded-lg hover:bg-primary/90"
                            >
                              {t('admin.messages.reply_btn')}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {replyModalOpen && replyTarget && (
            <div className="fixed inset-0 z-50 flex items-center justify-center">
              <div className="absolute inset-0 bg-black/40 backdrop-blur-sm"></div>
              <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-[520px] max-w-[90vw] p-6 border border-gray-100 dark:border-gray-700">
                <div className="mb-4">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">{t('admin.messages.reply_modal.title')}</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{t('admin.messages.reply_modal.from', { name: replyTarget.name, email: replyTarget.email })}</p>
                </div>
                <div className="space-y-3">
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4">
                    <p className="text-xs font-bold text-gray-500 dark:text-gray-300 uppercase">{t('admin.messages.reply_modal.subject_label')}</p>
                    <p className="text-sm text-gray-900 dark:text-white">{replyTarget.subject}</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4">
                    <p className="text-xs font-bold text-gray-500 dark:text-gray-300 uppercase">{t('admin.messages.reply_modal.message_label')}</p>
                    <p className="text-sm text-gray-700 dark:text-gray-300">{replyTarget.message}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">{t('admin.messages.reply_modal.response_label')}</p>
                    <textarea
                      rows="5"
                      value={replyContent}
                      onChange={(e) => setReplyContent(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                      placeholder={t('admin.messages.reply_modal.response_placeholder')}
                    ></textarea>
                  </div>
                </div>
                <div className="mt-6 flex justify-end gap-2">
                  <button
                    onClick={() => {
                      setReplyModalOpen(false);
                      setReplyTarget(null);
                      setReplyContent('');
                    }}
                    className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    {t('admin.messages.reply_modal.cancel')}
                  </button>
                  <button
                    onClick={async () => {
                      if (!replyContent.trim()) return;
                      try {
                        const { data } = await api.put(`/contact/${replyTarget._id}/reply`, { reply: replyContent }, authHeader);
                        setMessages(prev => prev.map(msg => msg._id === replyTarget._id ? data : msg));
                        setReplyModalOpen(false);
                        setReplyTarget(null);
                        setReplyContent('');
                        toast.success(t('admin.messages.reply_modal.reply_success'));
                      } catch (e) {
                        toast.error(e.response?.data?.message || t('admin.messages.reply_modal.reply_error'));
                      }
                    }}
                    className="px-6 py-2 rounded-xl bg-primary text-white hover:bg-primary/90"
                    disabled={!replyContent.trim()}
                  >
                    {t('admin.messages.reply_modal.send')}
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {activeTab === 'reviews' && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50/50 dark:bg-gray-700/50">
                      <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('admin.table.date')}</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('admin.table.product')}</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('admin.reviews.table.reviewer')}</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('admin.reviews.table.rating')}</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('admin.reviews.table.comment')}</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">{t('admin.table.actions') || 'Actions'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {reviews.map((r, idx) => (
                      <tr key={`${r.productId}-${r.createdAt}-${idx}`} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/50 transition-colors">
                        <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">{new Date(r.createdAt).toLocaleString()}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <img src={resolveImage(r.productImage)} className="w-10 h-10 rounded-lg object-cover bg-gray-100 dark:bg-gray-700" alt="" />
                            <div className="text-sm font-bold text-gray-900 dark:text-white">{r.product ? displayFields(r.product).name : r.productName}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-bold text-gray-900 dark:text-white">{r.name}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1 text-amber-600">
                            <Star className="w-4 h-4" />
                            <span className="text-sm font-medium">{r.rating}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">{r.comment}</td>
                        <td className="px-6 py-4 text-right">
                          <button 
                            onClick={() => deleteReview(r.productId, r._id)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                            title={t('admin.common.delete') || 'Delete'}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* About Page View */}
          {activeTab === 'about' && aboutContent && (
            <div className="max-w-4xl space-y-8 animate-in slide-in-from-bottom-4 duration-500">
              <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-8">
                <div className="flex justify-between items-center border-b dark:border-gray-700 pb-4">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">{t('admin.about.edit_title')}</h3>
                  <button 
                    onClick={async () => {
                      try {
                        await api.post('/pages/about', aboutContent, authHeader);
                        toast.success(t('admin.about.update_success'));
                      } catch {
                        toast.error(t('admin.about.update_error'));
                      }
                    }}
                    className="bg-primary text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-rose-200 dark:shadow-none hover:bg-primary/90 transition-all active:scale-95"
                  >
                    {t('admin.about.save_btn')}
                  </button>
                </div>
                <div className="grid grid-cols-1 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('admin.about.page_title_label')}</label>
                    <input 
                      type="text"  
                      value={aboutContent.title || ''}
                      onChange={(e) => setAboutContent({...aboutContent, title: e.target.value})}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('admin.about.hero_subtitle_label')}</label>
                    <textarea 
                      rows="3"
                      value={aboutContent.subtitle || ''}
                      onChange={(e) => setAboutContent({...aboutContent, subtitle: e.target.value})}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                    ></textarea>
                  </div>

                  <div className="space-y-4 pt-6 border-t dark:border-gray-700">
                    <div className="grid grid-cols-1 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('admin.about.mission_title_label')}</label>
                        <input 
                          type="text" 
                          value={aboutContent.mission?.title || ''}
                          onChange={(e) => setAboutContent({
                            ...aboutContent, 
                            mission: { ...aboutContent.mission, title: e.target.value }
                          })}
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('admin.about.mission_content_label')}</label>
                        <textarea 
                          rows="4"
                          value={aboutContent.mission?.content || ''}
                          onChange={(e) => setAboutContent({
                            ...aboutContent, 
                            mission: { ...aboutContent.mission, content: e.target.value }
                          })}
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                        ></textarea>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('admin.about.mission_image_label')}</label>
                        <input 
                          type="text" 
                          value={aboutContent.mission?.imageUrl || ''}
                          onChange={(e) => setAboutContent({
                            ...aboutContent, 
                            mission: { ...aboutContent.mission, imageUrl: e.target.value }
                          })}
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 pt-6 border-t dark:border-gray-700">
                    <div className="flex justify-between items-center">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('admin.about.sections_label')}</label>
                      <button 
                        onClick={() => setAboutContent({
                          ...aboutContent, 
                          sections: [...(aboutContent.sections || []), { title: '', content: '', icon: 'Heart' }]
                        })}
                        className="text-primary text-sm font-bold flex items-center gap-1 hover:underline"
                      >
                        <Plus className="w-4 h-4" /> {t('admin.about.add_section_btn')}
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {aboutContent.sections?.map((section, idx) => (
                        <div key={idx} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-2xl space-y-3 relative group">
                          <button 
                            onClick={() => {
                              const newSections = aboutContent.sections.filter((_, i) => i !== idx);
                              setAboutContent({...aboutContent, sections: newSections});
                            }}
                            className="absolute -top-2 -right-2 bg-white dark:bg-gray-600 text-rose-500 p-1 rounded-full shadow-sm border border-rose-100 dark:border-gray-500 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-4 h-4" />
                          </button>
                          <input 
                            type="text" 
                            placeholder={t('admin.about.section_title_placeholder')}
                            value={section.title}
                            onChange={(e) => {
                              const newSections = [...aboutContent.sections];
                              newSections[idx].title = e.target.value;
                              setAboutContent({...aboutContent, sections: newSections});
                            }}
                            className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm font-bold"
                          />
                          <textarea 
                            placeholder={t('admin.about.section_content_placeholder')}
                            rows="3"
                            value={section.content}
                            onChange={(e) => {
                              const newSections = [...aboutContent.sections];
                              newSections[idx].content = e.target.value;
                              setAboutContent({...aboutContent, sections: newSections});
                            }}
                            className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm"
                          ></textarea>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                
              </div>
            </div>
          )}
          {activeTab === 'stats' && (
            <div className="space-y-6 animate-in fade-in duration-500">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { 
                    label: t('admin.stats.total_sales'), 
                    value: formatPrice(stats.totalSales), 
                    icon: DollarSign, 
                    color: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400',
                    change: salesChangePercent 
                  },
                  { label: t('admin.stats.total_orders'), value: stats.orders, icon: ShoppingCart, color: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' },
                  { label: t('admin.stats.products'), value: stats.products, icon: Box, color: 'bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400' },
                  { label: t('admin.stats.customers'), value: stats.customers, icon: UserCheck, color: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400' },
                ].map((stat, i) => (
                  <div
                    key={i}
                    className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-xl ${stat.color}`}>
                          <stat.icon className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold tracking-wide uppercase">
                            {stat.label}
                          </p>
                          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stat.value}</p>
                        </div>
                      </div>
                      {typeof stat.change === 'number' && (
                        <div
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-semibold ${
                            stat.change >= 0
                              ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                              : 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                          }`}
                        >
                          {stat.change >= 0 ? (
                            <TrendingUp className="w-3 h-3" />
                          ) : (
                            <TrendingDown className="w-3 h-3" />
                          )}
                          <span>{`${stat.change >= 0 ? '+' : '-'}${Math.abs(stat.change).toFixed(1)}%`}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-primary" /> {t('admin.stats.sales_performance')}
                  </h3>
                  <div className="h-64 flex items-end gap-3">
                    {monthlyStats.map((m, i) => (
                      <div key={i} className="flex-1 flex flex-col items-center group">
                        <div className="w-full relative">
                          <div 
                            className="bg-primary/15 dark:bg-primary/30 hover:bg-primary/35 dark:hover:bg-primary/50 transition-all rounded-t-2xl w-full relative group-hover:shadow-lg"
                            style={{ height: `${Math.max(20, Math.min(200, m.sales / 10))}px` }}
                          >
                            <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 dark:bg-gray-700 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                              {formatPrice(m.sales)}
                            </div>
                          </div>
                        </div>
                        <p className="text-[10px] text-gray-400 mt-2 font-medium uppercase">
                          {m.month.split('-')[1]}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Products View */}
          {activeTab === 'products' && (
            <div className="animate-in slide-in-from-bottom-4 duration-500">
              {showForm && (
                <div className="mb-8 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
                  <div className="bg-gray-50 dark:bg-gray-700/50 px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                    <h3 className="font-bold text-gray-900 dark:text-white">{editingId ? t('admin.products.form.edit_title') : t('admin.products.form.add_title')}</h3>
                    <button onClick={resetForm} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><X className="w-5 h-5" /></button>
                  </div>
                  <form onSubmit={createOrUpdateProduct} className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="md:col-span-2 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">{t('admin.products.form.name_label')}</label>
                            <input className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder={t('admin.products.form.name_placeholder')} required />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">{t('admin.products.form.category_label')}</label>
                            <div className="flex gap-2">
                              <select className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white outline-none" value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))}>
                                <option value="">{t('admin.products.form.category_select')}</option>
                                {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                              </select>
                              <input className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white outline-none" placeholder={t('admin.products.form.category_new_placeholder')} value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))} />
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">{t('admin.products.form.price_label')}</label>
                            <div className="flex items-center">
                              <span className="text-gray-500 dark:text-gray-400 text-sm font-bold mr-2">AED</span>
                              <input 
                                className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white outline-none" 
                                type="number" 
                                step="0.01" 
                                min="0"
                                placeholder="0.00"
                                value={form.price} 
                                onChange={e=>{
                                  const value = e.target.value;
                                  if (value === '' || parseFloat(value) >= 0) {
                                    setForm(f=>({...f,price:value}));
                                  }
                                }} 
                                required 
                              />
                            </div>
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">{t('admin.products.form.stock_label')}</label>
                            <input className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white outline-none" type="number" value={form.countInStock} onChange={e=>setForm(f=>({...f,countInStock:e.target.value}))} required />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">{t('admin.products.form.description_label')}</label>
                          <textarea className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white outline-none min-h-[100px]" value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} />
                        </div>

                        {/* Translations Section */}
                        <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
                          <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                            <RefreshCw className="w-4 h-4 text-primary" /> {t('admin.products.form.translations_title')}
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-4">
                              <div className="space-y-1">
                                <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase">{t('admin.products.form.fr_name_label')}</label>
                                <input className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-100 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white outline-none focus:border-primary" value={form.nameFr} onChange={e=>setForm(f=>({...f,nameFr:e.target.value}))} placeholder={t('admin.products.form.name_fr_placeholder')} />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase">{t('admin.products.form.fr_desc_label')}</label>
                                <textarea className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-100 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white outline-none focus:border-primary min-h-[60px]" value={form.descFr} onChange={e=>setForm(f=>({...f,descFr:e.target.value}))} placeholder={t('admin.products.form.desc_fr_placeholder')} />
                              </div>
                            </div>
                            <div className="space-y-4">
                              <div className="space-y-1">
                                <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase">{t('admin.products.form.ar_name_label')}</label>
                                <input className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-100 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white outline-none focus:border-primary text-right" dir="rtl" value={form.nameAr} onChange={e=>setForm(f=>({...f,nameAr:e.target.value}))} placeholder={t('admin.products.form.name_ar_placeholder')} />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase">{t('admin.products.form.ar_desc_label')}</label>
                                <textarea className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-100 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white outline-none focus:border-primary min-h-[60px] text-right" dir="rtl" value={form.descAr} onChange={e=>setForm(f=>({...f,descAr:e.target.value}))} placeholder={t('admin.products.form.desc_ar_placeholder')} />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-6">
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">{t('admin.products.form.image_label')}</label>
                          <div className="border-2 border-dashed border-gray-200 dark:border-gray-600 rounded-2xl p-4 text-center hover:border-primary dark:hover:border-primary transition-colors cursor-pointer group relative overflow-hidden h-48 flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-700">
                            {form.image ? (
                              <>
                                <img src={resolveImage(form.image)} className="absolute inset-0 w-full h-full object-cover" alt="Preview" />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                  <ImageIcon className="text-white w-8 h-8" />
                                </div>
                              </>
                            ) : (
                              <>
                                <ImageIcon className="w-8 h-8 text-gray-300 dark:text-gray-500 mb-2" />
                                <p className="text-xs text-gray-400 dark:text-gray-400">{t('admin.products.form.image_upload_text')}</p>
                              </>
                            )}
                            <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              const reader = new FileReader();
                              reader.onload = async () => {
                                try {
                                  const { data } = await api.post('/uploads', { dataUrl: reader.result }, authHeader);
                                  setForm(f => ({ ...f, image: data.url }));
                                } catch (err) { console.error(err); }
                              };
                              reader.readAsDataURL(file);
                            }} />
                          </div>
                          <input className="w-full mt-2 px-4 py-2 text-xs bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white outline-none" value={form.image} onChange={e=>setForm(f=>({...f,image:e.target.value}))} placeholder={t('admin.products.form.image_url_placeholder')} />
                        </div>
                      </div>
                    </div>

                    <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-700 flex gap-3">
                      <button type="submit" className="flex-1 bg-primary text-white py-3 rounded-xl font-bold hover:bg-primary/90 transition-colors shadow-lg shadow-rose-100 dark:shadow-none flex items-center justify-center gap-2">
                        {editingId ? <RefreshCw className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                        {editingId ? t('admin.products.form.update_btn') : t('admin.products.form.create_btn')}
                      </button>
                      <button type="button" onClick={resetForm} className="px-6 py-3 border border-gray-200 dark:border-gray-600 rounded-xl font-bold text-gray-500 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                        {t('common.cancel')}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-gray-50/80 dark:bg-gray-700/50">
                      <tr>
                        <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('admin.products.table.product')}</th>
                        <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('admin.products.table.category')}</th>
                        <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('admin.products.table.price')}</th>
                        <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('admin.products.table.stock')}</th>
                        <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">{t('admin.table.actions')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                      {products.map((p) => (
                        <tr key={p._id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/50 transition-colors group">
                          <td className="px-6 py-4">
                            <div>
                              <div className="flex items-center gap-2">
                                <img src={resolveImage(p.image)} className="w-12 h-12 rounded-lg object-cover bg-gray-100 dark:bg-gray-600" alt="" />
                                <div>
                                  <p className="font-bold text-gray-900 dark:text-white">{displayFields(p).name}</p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1 max-w-[200px]">{displayFields(p).description}</p>
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full text-xs font-medium">
                              {displayCategory(p.category)}
                            </span>
                          </td>
                          <td className="px-6 py-4 font-bold text-gray-900 dark:text-white">{formatPrice(p.price)}</td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${p.countInStock > 10 ? 'bg-emerald-500' : p.countInStock > 0 ? 'bg-amber-500' : 'bg-red-500'}`} />
                              <span className="text-sm text-gray-600 dark:text-gray-300">{p.countInStock} units</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => editProduct(p)} className="p-2 text-gray-400 dark:text-gray-500 hover:text-primary dark:hover:text-primary hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors">
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button onClick={() => deleteProduct(p._id)} className="p-2 text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Orders View */}
          {activeTab === 'orders' && (
            <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-500">
              {orders.map((o) => (
                <div key={o._id} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-6 hover:shadow-md transition-shadow">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                    <div className="flex items-center gap-4">
                      <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-xl">
                        <ShoppingCart className="w-6 h-6 text-gray-400 dark:text-gray-300" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-gray-900 dark:text-white">{t('admin.orders.order')} #{o._id.slice(-8).toUpperCase()}</p>
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                            o.isPaid ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                          }`}>
                            {o.isPaid ? t('admin.orders.status.paid') : t('admin.orders.status.unpaid')}
                          </span>
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                            o.isDelivered ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                          }`}>
                            {o.isDelivered ? t('admin.orders.status.delivered') : t('admin.orders.status.processing')}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                          {t('admin.orders.customer_label')}: <span className="text-gray-900 dark:text-white font-medium">{o.user?.name || t('admin.orders.guest')}</span> • {o.user?.email || t('admin.orders.no_email')} • {new Date(o.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-primary">{formatPrice(o.totalPrice)}</p>
                      <p className="text-xs text-gray-400">{o.orderItems?.length || 0} {t('admin.orders.items')}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                      <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">{t('admin.orders.customer')}</p>
                      <p className="text-sm text-gray-900 dark:text-white">
                        {(o.user?.name || t('admin.orders.guest'))} • {(o.user?.email || t('admin.orders.no_email'))}
                      </p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                      <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">{t('admin.orders.shipping')}</p>
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        {(o.shippingAddress?.address || '')}
                        {o.shippingAddress?.city ? `, ${o.shippingAddress.city}` : ''}
                        {o.shippingAddress?.postalCode ? ` ${o.shippingAddress.postalCode}` : ''}
                        {o.shippingAddress?.country ? `, ${o.shippingAddress.country}` : ''}
                      </p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 md:col-span-2">
                      <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">{t('admin.orders.payment')}</p>
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        {(o.paymentMethod || t('admin.common.unknown'))}
                        {o.paymentResult?.email_address ? ` • ${o.paymentResult.email_address}` : ''}
                      </p>
                      <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-gray-600 dark:text-gray-400">
                        <p>
                          <span className="font-semibold">Gateway:</span>{' '}
                          {o.paymentProvider || t('common.unknown')}
                        </p>
                        <p>
                          <span className="font-semibold">Status:</span>{' '}
                          {o.paymentResult?.status || t('common.unknown')}
                        </p>
                        <p className="break-all">
                          <span className="font-semibold">Transaction ID:</span>{' '}
                          {o.paymentResult?.id || t('common.unknown')}
                        </p>
                        <p>
                          <span className="font-semibold">Paid at:</span>{' '}
                          {o.isPaid && o.paidAt
                            ? new Date(o.paidAt).toLocaleString()
                            : t('common.unknown')}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 pt-4 border-t border-gray-50 dark:border-gray-700">
                    <button 
                      onClick={() => updateOrderStatus(o._id, { isPaid: !o.isPaid })}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                        o.isPaid ? 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300' : 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                      }`}
                    >
                      {o.isPaid ? t('admin.orders.mark_unpaid') : t('admin.orders.mark_paid')}
                    </button>
                    <button 
                      onClick={() => updateOrderStatus(o._id, { isDelivered: !o.isDelivered })}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                        o.isDelivered ? 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300' : 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800'
                      }`}
                    >
                      {o.isDelivered ? t('admin.orders.mark_undelivered') : t('admin.orders.mark_delivered')}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Users View */}
          {activeTab === 'users' && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden animate-in slide-in-from-bottom-4 duration-500">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-gray-50/80 dark:bg-gray-700/50">
                    <tr>
                      <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('admin.users.table.customer')}</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('admin.users.table.role')}</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('admin.users.table.joined')}</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">{t('admin.users.table.actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {users.map((u) => (
                      <tr key={u._id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center text-primary font-bold">
                              {u.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-bold text-gray-900 dark:text-white">{u.name}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">{u.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            u.isAdmin ? 'bg-primary text-white shadow-sm shadow-rose-200 dark:shadow-none' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                          }`}>
                            {u.isAdmin ? t('admin.users.role.administrator') : t('admin.users.role.customer')}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                          {new Date(u.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-3">
                            <button 
                              onClick={() => toggleAdmin(u._id, !u.isAdmin)}
                              className="text-xs font-bold text-primary hover:text-rose-600 dark:hover:text-rose-400 hover:underline"
                            >
                              {u.isAdmin ? t('admin.users.remove_admin') : t('admin.users.make_admin')}
                            </button>
                            <button 
                              onClick={() => deleteUser(u._id)}
                              className="p-2 text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                              title={t('admin.common.delete') || 'Delete User'}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Confirmation Modal */}
        <ConfirmModal
          isOpen={confirmModal.isOpen}
          onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
          onConfirm={confirmModal.onConfirm}
          title={confirmModal.title}
          message={confirmModal.message}
          icon={confirmModal.icon}
        />
      </main>
    </div>
  );
};

export default AdminDashboard;
