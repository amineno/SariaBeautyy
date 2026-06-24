import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { useCurrency } from '../../context/CurrencyContext';
import ConfirmModal from '../../components/ConfirmModal';
import toast from 'react-hot-toast';
import { 
  Plus, Trash2, Pencil, Users, ShoppingCart, Package, 
  BarChart3, RefreshCw, LayoutDashboard, 
  ChevronRight, ChevronDown, ChevronUp, Image as ImageIcon,
  DollarSign, Box, UserCheck, AlertCircle, X,
  TrendingUp, Truck, Zap, Star, Target as TargetIcon,
  Download, MessageSquare
} from 'lucide-react';

// Constants for stability and maintainability
const ORDER_STATUS = {
  PENDING: 'pending',
  PENDING_WHATSAPP: 'pending_whatsapp',
  CONFIRMED: 'confirmed',
  SHIPPED: 'shipped',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled'
};

const PAYMENT_METHOD = {
  STRIPE: 'stripe',
  WHATSAPP: 'whatsapp'
};

const TAB = {
  STATS: 'stats',
  PRODUCTS: 'products',
  ORDERS: 'orders',
  USERS: 'users',
  REVIEWS: 'reviews',
  MESSAGES: 'messages',
  ABOUT: 'about'
};

// Sub-component for badges
const StatusBadge = ({ status, t }) => {
  const config = {
    [ORDER_STATUS.DELIVERED]: 'bg-emerald-100 text-emerald-700',
    [ORDER_STATUS.SHIPPED]: 'bg-blue-100 text-blue-700',
    [ORDER_STATUS.CONFIRMED]: 'bg-green-100 text-green-700',
    [ORDER_STATUS.PENDING_WHATSAPP]: 'bg-indigo-100 text-indigo-700',
    [ORDER_STATUS.CANCELLED]: 'bg-rose-100 text-rose-700',
    [ORDER_STATUS.PENDING]: 'bg-amber-100 text-amber-700',
  };
  return (
    <div className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${config[status] || config[ORDER_STATUS.PENDING]}`}>
      {t(`admin.orders.status.${status}`) || status}
    </div>
  );
};

// Premium Skeleton Loader
const Skeleton = ({ className }) => (
  <div className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded-xl ${className}`} />
);

const AdminDashboard = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { formatPrice } = useCurrency();
  const { user } = useAuth();

  // Role Protection
  useEffect(() => {
    if (user && !user.isAdmin) {
      toast.error("Accès refusé. Administrateurs uniquement.");
      navigate('/');
    }
  }, [user, navigate]);

  const authHeader = useMemo(() => ({
    headers: { Authorization: `Bearer ${user?.token}` }
  }), [user?.token]);
  
  const SERVER_ORIGIN = (api.defaults.baseURL || '').replace(/\/api$/, '');
  
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
      if (stored && Object.values(TAB).includes(stored)) return stored;
    }
    return TAB.STATS;
  });

  const [products, setProducts] = useState([]);
  const [users, setUsers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [aboutContent, setAboutContent] = useState(null);
  const [stats, setStats] = useState({ totalSales: 0, products: 0, customers: 0, orders: 0, recentOrders: [], monthly: [] });
  const [orders, setOrders] = useState([]);
  const [categories, setCategories] = useState([]);

  // Loading States
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isProcessingAction, setIsProcessingAction] = useState(false);
  const [errorBanner, setErrorBanner] = useState(null);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ 
    name: '', description: '', price: '', category: '', image: '', 
    countInStock: '', nameFr: '', descFr: '', nameAr: '', descAr: '' 
  });
  const [editingId, setEditingId] = useState(null);

  const [replyModalOpen, setReplyModalOpen] = useState(false);
  const [replyTarget, setReplyTarget] = useState(null);
  const [replyContent, setReplyContent] = useState('');
  const [orderFilter, setOrderFilter] = useState({ status: '', method: '' });
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    icon: null
  });
  const [expandedOrders, setExpandedOrders] = useState({});

  const monthlyStats = stats?.monthly || [];
  const lastMonth = monthlyStats.length > 0 ? monthlyStats[monthlyStats.length - 1] : null;
  const prevMonth = monthlyStats.length > 1 ? monthlyStats[monthlyStats.length - 2] : null;
  const salesDelta = lastMonth && prevMonth ? lastMonth.sales - prevMonth.sales : null;
  const salesChangePercent = lastMonth && prevMonth && prevMonth.sales ? (salesDelta / prevMonth.sales) * 100 : null;

  const displayFields = (p) => {
    if (!p) return { name: '', description: '' };
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

  // Caching & Advanced Loading
  const [cache, setCache] = useState({});
  const [isTabLoading, setIsTabLoading] = useState(false);

  const fetchAllData = useCallback(async (signal, force = false) => {
    try {
      const now = Date.now();
      const CACHE_TTL = 60000; // 1 minute

      if (!force && cache.timestamp && (now - cache.timestamp < CACHE_TTL)) {
        setProducts(cache.products);
        setUsers(cache.users);
        setStats(cache.stats);
        setCategories(cache.categories);
        setMessages(cache.messages);
        setAboutContent(cache.about);
        setOrders(cache.orders);
        setReviews(cache.reviews);
        setIsLoading(false);
        return;
      }

      if (!isRefreshing) setIsTabLoading(true);
      setErrorBanner(null);
      const [pRes, uRes, sRes, cRes, mRes, aRes, oRes] = await Promise.all([
        api.get('/products', { ...authHeader, signal }),
        api.get('/users', { ...authHeader, signal }),
        api.get('/admin/stats', { ...authHeader, signal }),
        api.get('/products/categories/list', { ...authHeader, signal }),
        api.get('/contact', { ...authHeader, signal }),
        api.get('/pages/about', { ...authHeader, signal }),
        api.get('/admin/orders', { ...authHeader, signal })
      ]);

      const fetchedProducts = pRes.data || [];
      const fetchedUsers = uRes.data || [];
      const fetchedStats = sRes.data || { totalSales: 0, products: 0, customers: 0, orders: 0, recentOrders: [], monthly: [] };
      const fetchedOrders = oRes.data || [];

      setProducts(fetchedProducts);
      setUsers(fetchedUsers);
      setStats(fetchedStats);
      setCategories(cRes.data || []);
      setMessages(mRes.data || []);
      setAboutContent(aRes.data || null);
      setOrders(fetchedOrders);

      const rv = fetchedProducts.flatMap(p => (p.reviews || []).map(r => ({
        ...r, productId: p._id, product: p, productName: p.name, productImage: p.image
      }))).sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
      setReviews(rv);

      setCache({
        products: fetchedProducts,
        users: fetchedUsers,
        stats: fetchedStats,
        categories: cRes.data,
        messages: mRes.data,
        about: aRes.data,
        orders: fetchedOrders,
        reviews: rv,
        timestamp: now
      });

    } catch (err) {
      if (err.name !== 'CanceledError') {
        console.error('Admin fetch error', err);
        setErrorBanner("Échec du chargement des données.");
      }
    } finally {
      setIsLoading(false);
      setIsTabLoading(false);
      setIsRefreshing(false);
    }
  }, [authHeader, isRefreshing, cache]);

  useEffect(() => {
    const controller = new AbortController();
    if (user?.isAdmin) {
      fetchAllData(controller.signal);
    }

    const baseUrl = api.defaults.baseURL.replace(/\/api$/, '');
    const productEs = new EventSource(`${baseUrl}/api/products/events`);
    const contactEs = new EventSource(`${baseUrl}/api/contact/events`);
    const pageEs = new EventSource(`${baseUrl}/api/pages/events`);

    productEs.onmessage = (ev) => {
      const payload = JSON.parse(ev.data);
      if (payload.channel === 'product') {
        if (payload.type === 'product_created') setProducts(prev => [payload.product, ...prev]);
        else if (payload.type === 'product_updated') setProducts(prev => prev.map(p => p._id === payload.product._id ? payload.product : p));
        else if (payload.type === 'product_deleted') setProducts(prev => prev.filter(p => p._id !== payload.id));
      }
    };
    
    return () => {
      controller.abort();
      productEs.close();
      contactEs.close();
      pageEs.close();
    };
  }, [authHeader, user?.isAdmin, fetchAllData]);

  const resetForm = () => {
    setForm({ name: '', description: '', price: '', category: '', image: '', countInStock: '', nameFr: '', descFr: '', nameAr: '', descAr: '' });
    setEditingId(null);
    setShowForm(false);
  };

  const handleProductSubmit = async (e) => {
    e.preventDefault();
    setIsProcessingAction(true);
    try {
      const priceValue = parseFloat(form.price);
      const usdPrice = Math.round(priceValue / 3.67 * 1000) / 1000;
      const body = {
        name: form.name, description: form.description, price: usdPrice, category: form.category, image: form.image,
        countInStock: Number(form.countInStock || 0),
        translations: {
          fr: { name: form.nameFr || undefined, description: form.descFr || undefined },
          ar: { name: form.nameAr || undefined, description: form.descAr || undefined },
        }
      };

      if (editingId) {
        const { data } = await api.put(`/products/${editingId}`, body, authHeader);
        setProducts(prev => prev.map(p => p._id === editingId ? data : p));
        toast.success('Produit mis à jour');
      } else {
        const { data } = await api.post('/products', body, authHeader);
        setProducts(prev => [data, ...prev]);
        toast.success('Produit créé');
      }
      resetForm();
    } catch (err) { toast.error('Erreur lors de la sauvegarde'); }
    finally { setIsProcessingAction(false); }
  };

  const editProduct = (p) => {
    setEditingId(p._id);
    const aedPrice = (Math.round(p.price * 3.67 * 100) / 100).toFixed(2);
    setForm({
      name: p.name, description: p.description, price: aedPrice, category: p.category, image: p.image, countInStock: p.countInStock,
      nameFr: p.translations?.fr?.name || '', descFr: p.translations?.fr?.description || '',
      nameAr: p.translations?.ar?.name || '', descAr: p.translations?.ar?.description || ''
    });
    setShowForm(true);
  };

  const handleDeleteProduct = (id) => {
    setConfirmModal({
      isOpen: true, title: 'Supprimer le produit ?', message: 'Cette action est irréversible.', icon: AlertCircle,
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        setIsProcessingAction(true);
        try {
          await api.delete(`/products/${id}`, authHeader);
          setProducts(prev => prev.filter(p => p._id !== id));
          toast.success('Produit supprimé');
        } catch { toast.error('Erreur'); }
        finally { setIsProcessingAction(false); }
      }
    });
  };

  const handleUpdateOrderStatus = async (id, status) => {
    setIsProcessingAction(true);
    try {
      const { data } = await api.put(`/admin/orders/${id}/status`, { status }, authHeader);
      setOrders(prev => prev.map(o => o._id === id ? data : o));
      toast.success('Statut mis à jour');
    } catch { toast.error('Erreur'); }
    finally { setIsProcessingAction(false); }
  };

  const handleDeleteUser = (id) => {
    setConfirmModal({
      isOpen: true, title: 'Supprimer l\'utilisateur ?', message: 'Toutes ses données seront perdues.', icon: AlertCircle,
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        setIsProcessingAction(true);
        try {
          await api.delete(`/users/${id}`, authHeader);
          setUsers(prev => prev.filter(u => u._id !== id));
          toast.success('Utilisateur supprimé');
        } catch { toast.error('Erreur'); }
        finally { setIsProcessingAction(false); }
      }
    });
  };

  const sidebarItems = [
    { id: TAB.STATS, label: 'Tableau de bord CRM', icon: LayoutDashboard },
    { id: TAB.PRODUCTS, label: 'Catalogue Produits', icon: Package },
    { id: TAB.ORDERS, label: 'Gestion des Ventes', icon: ShoppingCart },
    { id: TAB.USERS, label: 'Base Clients', icon: Users },
    { id: TAB.REVIEWS, label: 'Avis & Feedback', icon: Star },
    { id: TAB.MESSAGES, label: 'Support Messages', icon: MessageSquare },
    { id: TAB.ABOUT, label: 'Contenu Pages', icon: ImageIcon },
  ];

  if (isLoading && !products.length) {
    return (
      <div className="flex h-screen items-center justify-center bg-rose-50/30 dark:bg-gray-900">
        <RefreshCw className="w-12 h-12 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-rose-50/20 dark:bg-gray-900 text-gray-900 dark:text-white transition-colors duration-300">
      {/* Sidebar */}
      <aside className="w-64 bg-white dark:bg-gray-800 border-r border-gray-100 dark:border-gray-700 hidden md:flex flex-col sticky top-0 h-screen">
        <div className="p-6 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-xl font-serif font-bold text-primary">Saria <span className="text-gray-900 dark:text-white">Admin</span></h2>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {sidebarItems.map((item) => (
            <button
              key={item.id}
              onClick={() => { setActiveTab(item.id); window.localStorage.setItem('adminActiveTab', item.id); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all ${
                activeTab === item.id ? 'bg-primary text-white shadow-lg shadow-rose-200 dark:shadow-none' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <item.icon size={18} />
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-20 bg-white/80 dark:bg-gray-800/80 backdrop-blur-md border-b border-gray-100 dark:border-gray-700 flex items-center justify-between px-8 sticky top-0 z-20">
          <h1 className="text-xl font-bold">{sidebarItems.find(i=>i.id===activeTab)?.label}</h1>
          <div className="flex items-center gap-4">
            {activeTab === TAB.PRODUCTS && (
              <button onClick={() => setShowForm(true)} className="bg-primary text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-rose-200">
                <Plus size={16}/> Ajouter
              </button>
            )}
            {activeTab === TAB.ORDERS && (
              <button onClick={() => {}} className="text-[10px] font-black uppercase tracking-widest text-primary">Export CSV</button>
            )}
          </div>
        </header>

        <div className="p-6">
          {errorBanner && (
            <div className="mb-6 p-4 bg-rose-50 dark:bg-rose-900/20 text-rose-600 rounded-2xl flex items-center gap-3 text-sm font-bold animate-in slide-in-from-top-2">
              <AlertCircle size={18}/> {errorBanner}
              <button onClick={() => setErrorBanner(null)} className="ml-auto"><X size={16}/></button>
            </div>
          )}

          {/* Render Active Tab */}
          {activeTab === TAB.STATS && (
            <div className="space-y-8 animate-in fade-in duration-500">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {(isLoading || isTabLoading) ? (
                  [...Array(4)].map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-3xl" />)
                ) : (
                  [
                    { label: 'Ventes Totales', value: formatPrice(stats.totalSales), icon: DollarSign, color: 'bg-emerald-50 text-emerald-600', trend: salesChangePercent ? `${salesChangePercent > 0 ? '+' : ''}${salesChangePercent.toFixed(1)}%` : '+0%' },
                    { label: 'Conversion', value: `${stats.conversionRate || 0}%`, icon: TargetIcon, color: 'bg-indigo-50 text-indigo-600', trend: 'SaaS KPI' },
                    { label: 'WhatsApp / Stripe', value: `${stats.whatsappOrders || 0} / ${stats.stripeOrders || 0}`, icon: MessageSquare, color: 'bg-rose-50 text-rose-600', trend: 'Ratio' },
                    { label: 'Clients', value: stats.customers, icon: UserCheck, color: 'bg-amber-50 text-amber-600', trend: '+5%' },
                  ].map((stat, i) => (
                    <div key={i} className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-xl transition-all">
                      <div className="flex justify-between items-start mb-4">
                        <div className={`p-3 rounded-2xl ${stat.color} dark:bg-opacity-10`}>
                          <stat.icon size={22} />
                        </div>
                        <span className="text-[10px] font-black text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded-full">{stat.trend}</span>
                      </div>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{stat.label}</p>
                      <h3 className="text-2xl font-black mt-1">{stat.value}</h3>
                    </div>
                  ))
                )}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm">
                   <h3 className="text-sm font-black uppercase tracking-widest text-gray-400 mb-6 flex items-center gap-2"><BarChart3 size={18}/> Performance des ventes</h3>
                   {(isLoading || isTabLoading) ? <Skeleton className="h-64 w-full" /> : (
                     <div className="h-64 flex items-end gap-3 px-2">
                        {(stats.monthly || []).map((m, i) => (
                          <div key={i} className="flex-1 flex flex-col items-center group relative">
                            <div className="w-full bg-primary/20 dark:bg-primary/40 rounded-t-xl transition-all group-hover:bg-primary/60" style={{ height: `${Math.max(10, (m.sales / (Math.max(...stats.monthly.map(sm=>sm.sales)) || 1)) * 100)}%` }}></div>
                            <p className="text-[9px] text-gray-400 mt-3 font-bold uppercase">{m.month?.split('-')[1] || '---'}</p>
                          </div>
                        ))}
                     </div>
                   )}
                </div>
                <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
                  <h3 className="text-sm font-black uppercase tracking-widest text-gray-400 mb-6 underline decoration-primary decoration-2">Dernières Commandes</h3>
                  <div className="space-y-4">
                    {(isLoading || isTabLoading) ? (
                      [...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)
                    ) : (
                      (stats.recentOrders || []).slice(0, 5).map(o => (
                        <div key={o._id} className="flex items-center justify-between p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-2xl transition-colors">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-full bg-rose-50 text-primary flex items-center justify-center font-black text-xs shrink-0">{o.user?.name?.charAt(0) || 'G'}</div>
                            <div className="truncate">
                              <p className="text-xs font-bold truncate">{o.user?.name || 'Guest'}</p>
                              <p className="text-[9px] text-gray-400">{new Date(o.createdAt).toLocaleDateString()}</p>
                            </div>
                          </div>
                          <p className="text-xs font-black">{formatPrice(o.total)}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === TAB.PRODUCTS && (
            <div className="space-y-6 animate-in slide-in-from-bottom-4">
              {showForm && (
                <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-xl overflow-hidden">
                  <div className="px-8 py-4 border-b border-gray-50 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800">
                    <h3 className="text-sm font-black uppercase tracking-widest">{editingId ? 'Modifier' : 'Nouveau'} Produit</h3>
                    <button onClick={resetForm} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full"><X size={18}/></button>
                  </div>
                  <form onSubmit={handleProductSubmit} className="p-8">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                       <div className="space-y-4">
                         <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                               <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Nom</label>
                               <input className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 rounded-2xl outline-none text-sm font-bold" value={form.name} onChange={e=>setForm({...form, name: e.target.value})} required />
                            </div>
                            <div className="space-y-1">
                               <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Catégorie</label>
                               <select className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 rounded-2xl outline-none text-sm font-bold" value={form.category} onChange={e=>setForm({...form, category: e.target.value})}>
                                 <option value="">Sélectionner</option>
                                 {categories.map(c => <option key={c} value={c}>{c}</option>)}
                               </select>
                            </div>
                         </div>
                         <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                               <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Prix (AED)</label>
                               <input type="number" step="0.01" className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 rounded-2xl outline-none text-sm font-bold" value={form.price} onChange={e=>setForm({...form, price: e.target.value})} required />
                            </div>
                            <div className="space-y-1">
                               <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Stock</label>
                               <input type="number" className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 rounded-2xl outline-none text-sm font-bold" value={form.countInStock} onChange={e=>setForm({...form, countInStock: e.target.value})} required />
                            </div>
                         </div>
                         <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Description</label>
                            <textarea rows="4" className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 rounded-2xl outline-none text-sm resize-none" value={form.description} onChange={e=>setForm({...form, description: e.target.value})}></textarea>
                         </div>
                       </div>
                       <div className="space-y-6">
                         <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Image URL</label>
                            <div className="h-48 bg-gray-50 dark:bg-gray-700 rounded-3xl border-2 border-dashed border-gray-200 dark:border-gray-600 flex items-center justify-center relative overflow-hidden group">
                               {form.image ? (
                                 <img src={resolveImage(form.image)} className="absolute inset-0 w-full h-full object-cover transition-transform group-hover:scale-110" alt=""/>
                               ) : (
                                 <ImageIcon size={32} className="text-gray-300" />
                               )}
                            </div>
                            <input className="w-full mt-2 px-4 py-2 text-[10px] bg-gray-50 dark:bg-gray-700 rounded-xl outline-none" value={form.image} onChange={e=>setForm({...form, image: e.target.value})} placeholder="https://..." />
                         </div>
                         <div className="p-4 bg-rose-50/30 dark:bg-rose-900/10 rounded-2xl border border-rose-100 dark:border-rose-900/20 grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                               <input placeholder="Nom (FR)" className="w-full text-xs p-2 rounded-lg bg-white dark:bg-gray-800" value={form.nameFr} onChange={e=>setForm({...form, nameFr: e.target.value})} />
                               <textarea placeholder="Desc (FR)" className="w-full text-xs p-2 rounded-lg bg-white dark:bg-gray-800 h-16" value={form.descFr} onChange={e=>setForm({...form, descFr: e.target.value})} />
                            </div>
                            <div className="space-y-2">
                               <input dir="rtl" placeholder="الاسم (AR)" className="w-full text-xs p-2 rounded-lg bg-white dark:bg-gray-800 text-right" value={form.nameAr} onChange={e=>setForm({...form, nameAr: e.target.value})} />
                               <textarea dir="rtl" placeholder="الوصف (AR)" className="w-full text-xs p-2 rounded-lg bg-white dark:bg-gray-800 h-16 text-right" value={form.descAr} onChange={e=>setForm({...form, descAr: e.target.value})} />
                            </div>
                         </div>
                       </div>
                    </div>
                    <div className="mt-8 flex gap-3">
                      <button type="submit" disabled={isProcessingAction} className="flex-1 bg-primary text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-rose-200">
                        {isProcessingAction ? <RefreshCw className="animate-spin mx-auto"/> : (editingId ? 'Mettre à jour' : 'Sauvegarder')}
                      </button>
                      <button type="button" onClick={resetForm} className="px-8 py-4 bg-gray-100 dark:bg-gray-700 rounded-2xl font-bold">Annuler</button>
                    </div>
                  </form>
                </div>
              )}

              <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-gray-50/50 dark:bg-gray-700/50 border-b border-gray-100">
                    <tr>
                      <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase">Produit</th>
                      <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase">Prix</th>
                      <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase">Stock</th>
                      <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
                    {products.map(p => (
                      <tr key={p._id} className="hover:bg-gray-50/30 dark:hover:bg-gray-700/30">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <img src={resolveImage(p.image)} className="w-12 h-12 rounded-xl object-cover bg-gray-100" alt=""/>
                            <div className="min-w-0">
                               <p className="text-sm font-bold truncate">{displayFields(p).name}</p>
                               <span className="text-[9px] font-black uppercase text-gray-400">{p.category}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 font-black">{formatPrice(p.price)}</td>
                        <td className="px-6 py-4">
                           <div className="flex items-center gap-2">
                             <div className={`w-1.5 h-1.5 rounded-full ${p.countInStock > 5 ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                             <span className="text-xs font-bold">{p.countInStock}</span>
                           </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                           <div className="flex justify-end gap-2">
                              <button onClick={() => editProduct(p)} className="p-2 text-amber-500 hover:bg-amber-50 rounded-xl transition-all"><Pencil size={16}/></button>
                              <button onClick={() => handleDeleteProduct(p._id)} className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-all"><Trash2 size={16}/></button>
                           </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === TAB.ORDERS && (
            <div className="space-y-6 animate-in slide-in-from-bottom-4">
               <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 overflow-hidden shadow-sm">
                  <table className="w-full text-left">
                    <thead className="bg-gray-50/50 dark:bg-gray-700/50 border-b border-gray-100">
                      <tr>
                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase">Commande</th>
                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase">Client</th>
                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase">Total</th>
                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase">Statut</th>
                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
                      {(isLoading || isTabLoading) ? (
                        [...Array(5)].map((_, i) => (
                          <tr key={i}><td colSpan="5" className="px-6 py-4"><Skeleton className="h-10 w-full" /></td></tr>
                        ))
                      ) : (
                        orders.map(o => (
                          <React.Fragment key={o._id}>
                            <tr className="hover:bg-gray-50/30 transition-colors">
                              <td className="px-6 py-4">
                                <p className="text-sm font-black uppercase">#{o._id.slice(-6)}</p>
                                <p className="text-[9px] text-gray-400 font-bold">{new Date(o.createdAt).toLocaleDateString()}</p>
                              </td>
                              <td className="px-6 py-4">
                                <p className="text-sm font-bold">{o.user?.name || 'Guest'}</p>
                                <p className="text-[9px] text-gray-400 font-bold">{o.paymentMethod === 'whatsapp' ? 'WhatsApp' : 'Stripe'}</p>
                              </td>
                              <td className="px-6 py-4 font-black text-sm">{formatPrice(o.total)}</td>
                              <td className="px-6 py-4"><StatusBadge status={o.status} t={t} /></td>
                              <td className="px-6 py-4 text-right">
                                <div className="flex justify-end gap-2">
                                    {o.status === 'pending_whatsapp' && <button onClick={()=>handleUpdateOrderStatus(o._id, 'confirmed')} className="text-[10px] font-black text-emerald-500 uppercase">Confirmer</button>}
                                    {o.status === 'confirmed' && <button onClick={()=>handleUpdateOrderStatus(o._id, 'shipped')} className="text-[10px] font-black text-blue-500 uppercase font-black">Expédier</button>}
                                    {o.status === 'shipped' && <button onClick={()=>handleUpdateOrderStatus(o._id, 'delivered')} className="text-[10px] font-black text-emerald-600 uppercase font-bold">Livrer</button>}
                                    {o.status !== 'delivered' && o.status !== 'cancelled' && <button onClick={()=>handleUpdateOrderStatus(o._id, 'cancelled')} className="text-[10px] font-black text-rose-500 uppercase">Annuler</button>}
                                    <button onClick={() => setExpandedOrders({...expandedOrders, [o._id]: !expandedOrders[o._id]})} className="p-2 hover:bg-gray-100 rounded-xl">{expandedOrders[o._id] ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}</button>
                                </div>
                              </td>
                            </tr>
                            {expandedOrders[o._id] && (
                              <tr className="bg-gray-50/10 dark:bg-gray-800/20">
                                <td colSpan="5" className="px-8 py-6">
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in zoom-in-95 duration-300">
                                    <div className="space-y-4">
                                      <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Détails de livraison</h4>
                                      <div className="bg-white dark:bg-gray-800 p-4 rounded-3xl border border-gray-100 dark:border-gray-700 text-xs shadow-sm">
                                        <p className="font-bold">{o.shippingAddress?.address}</p>
                                        <p>{o.shippingAddress?.city}, {o.shippingAddress?.postalCode}</p>
                                        <p className="mt-2 text-primary font-black">{o.phone}</p>
                                      </div>
                                      <div className="space-y-2">
                                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Produits</h4>
                                        {o.items?.map((item, idx) => (
                                          <div key={idx} className="flex justify-between items-center text-xs p-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
                                            <span className="font-bold">{item.product?.name || 'Produit'} x{item.quantity}</span>
                                            <span className="font-black text-primary">{formatPrice(item.price * item.quantity)}</span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                    <div className="space-y-4">
                                      <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex justify-between items-center">
                                        WhatsApp CRM Layer
                                        <button 
                                          onClick={() => {
                                            const msg = `🛒 *COMMANDE #${o._id.slice(-6)}*\n\n` + 
                                                        `Produits: ${o.items.map(i => i.product?.name + ' x' + i.quantity).join(', ')}\n` + 
                                                        `Total: ${o.total} DT`;
                                            navigator.clipboard.writeText(msg);
                                            toast.success('Copié !');
                                          }}
                                          className="text-primary hover:underline"
                                        >
                                          Copier Message
                                        </button>
                                      </h4>
                                      <div className="bg-gray-100 dark:bg-gray-900 p-4 rounded-3xl text-[10px] font-mono whitespace-pre-wrap border border-gray-200 dark:border-gray-700 h-full max-h-[200px] overflow-y-auto">
                                        {`🛒 *NOUVELLE COMMANDE*\n\n👤 CLIENT:\nNom: ${o.user?.name}\nTéléphone: ${o.phone}\n\n📍 ADRESSE:\n${o.shippingAddress?.address}, ${o.shippingAddress?.city}\n\n💰 TOTAL: ${o.total.toFixed(2)} DT`}
                                      </div>
                                      <a 
                                        href={`https://wa.me/${o.phone?.replace(/\+/g, '')}`} 
                                        target="_blank" 
                                        rel="noreferrer"
                                        className="block w-full text-center bg-emerald-500 text-white py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-emerald-100 hover:bg-emerald-600 transition-all"
                                      >
                                        Ouvrir WhatsApp Chat
                                      </a>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        ))
                      )}
                    </tbody>
                  </table>
               </div>
            </div>
          )}

          {activeTab === TAB.USERS && (
            <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 overflow-hidden shadow-sm animate-in slide-in-from-bottom-4">
              <table className="w-full text-left">
                <thead className="bg-gray-50/50 dark:bg-gray-700/50 border-b border-gray-100">
                  <tr>
                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase">Utilisateur</th>
                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase">Rôle</th>
                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase">Date</th>
                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
                  {users.map(u => (
                    <tr key={u._id} className="hover:bg-gray-50/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-rose-50 text-primary flex items-center justify-center font-black text-xs">{u.name?.charAt(0) || 'U'}</div>
                          <div>
                            <p className="text-sm font-bold">{u.name}</p>
                            <p className="text-[9px] text-gray-400 font-bold">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg ${u.isAdmin ? 'bg-primary text-white' : 'bg-gray-100 text-gray-500'}`}>
                          {u.isAdmin ? 'Admin' : 'Client'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-[10px] font-bold text-gray-400">{new Date(u.createdAt).toLocaleDateString()}</td>
                      <td className="px-6 py-4 text-right">
                        {!u.isAdmin && <button onClick={() => handleDeleteUser(u._id)} className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-all"><Trash2 size={16}/></button>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === TAB.REVIEWS && (
            <div className="space-y-6 animate-in slide-in-from-bottom-4">
              <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 overflow-hidden shadow-sm">
                <table className="w-full text-left">
                  <thead className="bg-gray-50/50 dark:bg-gray-700/50 border-b border-gray-100">
                    <tr>
                      <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase">Produit</th>
                      <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase">Note</th>
                      <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase">Commentaire</th>
                      <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
                    {reviews.map((r, i) => (
                      <tr key={i} className="hover:bg-gray-50/30 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <img src={resolveImage(r.productImage)} className="w-8 h-8 rounded-lg object-cover" alt=""/>
                            <p className="text-xs font-bold truncate max-w-[120px]">{r.productName}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-0.5 text-amber-400">
                            {[...Array(5)].map((_, idx) => (
                              <Star key={idx} size={10} fill={idx < r.rating ? "currentColor" : "none"} />
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-xs text-gray-600 dark:text-gray-300 italic line-clamp-1">"{r.comment}"</p>
                          <p className="text-[9px] font-bold text-gray-400">- {r.name}</p>
                        </td>
                        <td className="px-6 py-4 text-[10px] font-bold text-gray-400">{new Date(r.createdAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!reviews.length && <div className="p-12 text-center text-gray-400 text-xs italic">Aucun avis pour le moment</div>}
              </div>
            </div>
          )}

          {activeTab === TAB.MESSAGES && (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-500">
                {messages.map(m => (
                  <div key={m._id} className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-4 hover:shadow-lg transition-all">
                     <div className="flex justify-between items-start">
                        <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest ${m.status === 'new' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-400'}`}>{m.status}</span>
                        <span className="text-[9px] text-gray-400 font-bold">{new Date(m.createdAt).toLocaleDateString()}</span>
                     </div>
                     <div>
                        <p className="text-xs font-black truncate">{m.name}</p>
                        <p className="text-[9px] text-gray-440 font-bold truncate opacity-60">{m.email}</p>
                     </div>
                     <p className="text-xs text-gray-600 dark:text-gray-300 italic line-clamp-3">"{m.message}"</p>
                     <div className="pt-4 border-t border-gray-50 dark:border-gray-700 flex justify-end">
                        <button onClick={() => { setReplyTarget(m); setReplyModalOpen(true); }} className="text-[10px] font-black text-primary uppercase tracking-widest hover:underline">Répondre</button>
                     </div>
                  </div>
                ))}
             </div>
          )}

          {activeTab === TAB.ABOUT && aboutContent && (
             <div className="max-w-2xl bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 p-8 shadow-sm animate-in slide-in-from-bottom-4">
                <h3 className="text-sm font-black uppercase tracking-widest text-primary mb-6">Contenu "À Propos"</h3>
                <div className="space-y-6">
                   <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Titre Hero</label>
                      <input className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 rounded-2xl outline-none font-bold text-sm" value={aboutContent.title} onChange={e=>setAboutContent({...aboutContent, title: e.target.value})} />
                   </div>
                   <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Description</label>
                      <textarea rows="4" className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 rounded-2xl outline-none text-sm resize-none" value={aboutContent.subtitle} onChange={e=>setAboutContent({...aboutContent, subtitle: e.target.value})} />
                   </div>
                   <button 
                     onClick={async () => {
                        try {
                          await api.post('/pages/about', aboutContent, authHeader);
                          toast.success('Mise à jour réussie');
                        } catch { toast.error('Erreur'); }
                     }}
                     className="w-full bg-primary text-white py-4 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-rose-200"
                   >
                     Sauvegarder les changements
                   </button>
                </div>
             </div>
          )}
        </div>

        {replyModalOpen && replyTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={()=>setReplyModalOpen(false)}></div>
            <div className="relative bg-white dark:bg-gray-800 w-full max-w-lg rounded-3xl shadow-2xl p-8 animate-in zoom-in-95">
               <h3 className="text-lg font-bold mb-4">Répondre à {replyTarget.name}</h3>
               <textarea className="w-full p-4 bg-gray-50 dark:bg-gray-700 rounded-2xl outline-none min-h-[200px]" placeholder="Votre message..." value={replyContent} onChange={e=>setReplyContent(e.target.value)}></textarea>
               <div className="mt-6 flex gap-3">
                  <button onClick={async () => {
                     try {
                       await api.put(`/contact/${replyTarget._id}/reply`, { reply: replyContent }, authHeader);
                       toast.success('Réponse envoyée');
                       setReplyModalOpen(false);
                       setMessages(prev => prev.map(m => m._id === replyTarget._id ? {...m, status: 'replied'} : m));
                     } catch { toast.error('Erreur'); }
                  }} className="flex-1 bg-primary text-white py-3 rounded-xl font-black uppercase tracking-widest text-xs">Envoyer</button>
                  <button onClick={()=>setReplyModalOpen(false)} className="px-6 py-3 bg-gray-100 rounded-xl font-bold text-xs uppercase">Fermer</button>
               </div>
            </div>
          </div>
        )}

        <ConfirmModal
          isOpen={confirmModal.isOpen}
          onClose={() => setConfirmModal(p => ({ ...p, isOpen: false }))}
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
