import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';
import { useCurrency } from '../context/CurrencyContext';
import api from '../api/axios';
import { MessageSquare, ChevronDown, ChevronUp, Package } from 'lucide-react';
import toast from 'react-hot-toast';

const ProfileScreen = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  const { formatPrice } = useCurrency();

  const [activeTab, setActiveTab] = useState('orders');
  const [expandedOrders, setExpandedOrders] = useState({});
  const [name, setName] = useState(() => (user?.name || ''));
  const [email, setEmail] = useState(() => (user?.email || ''));
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [messages, setMessages] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [errorMessages, setErrorMessages] = useState(null);
  const [errorOrders, setErrorOrders] = useState(null);

  useEffect(() => {
    if (!user) {
      navigate('/login');
    } else {
      const fetchMyMessages = async () => {
        try {
          setLoadingMessages(true);
          const config = {
            headers: {
              Authorization: `Bearer ${user.token}`,
            },
          };
          const { data } = await api.get('/contact/my-messages', config);
          setMessages(data);
          setLoadingMessages(false);
        } catch (err) {
          setErrorMessages(err.response && err.response.data.message ? err.response.data.message : err.message);
          setLoadingMessages(false);
        }
      };

      const fetchMyOrders = async () => {
        try {
          setLoadingOrders(true);
          const config = {
            headers: {
              Authorization: `Bearer ${user.token}`,
            },
          };
          const { data } = await api.get('/payment/my-orders', config);
          setOrders(data);
          setLoadingOrders(false);
        } catch (err) {
          setErrorOrders(err.response && err.response.data.message ? err.response.data.message : err.message);
          setLoadingOrders(false);
        }
      };

      fetchMyMessages();
      fetchMyOrders();
    }
  }, [user, navigate]);

  useEffect(() => {
    if (user && activeTab === 'messages' && messages.some(m => m.unreadReply)) {
      const markRead = async () => {
        try {
           const config = { headers: { Authorization: `Bearer ${user.token}` } };
           await api.put('/contact/mark-read', {}, config);
           // Update local state
           setMessages(prev => prev.map(m => ({ ...m, unreadReply: false })));
        } catch (e) {
           console.error(e);
        }
      };
      markRead();
    }
  }, [activeTab, messages, user]);

  const submitHandler = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error(t('profile.passwords_mismatch'));
      return;
    }

    try {
      const config = {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`,
        },
      };

      const { data } = await api.put(
        '/users/profile',
        { name, email, password },
        config
      );

      updateUser(data);
      toast.success(t('profile.update_success'));
      setPassword('');
      setConfirmPassword('');
    } catch (err) {
      const message =
        err.response && err.response.data.message
          ? err.response.data.message
          : err.message;
      toast.error(message);
    }
  };

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Profile Update Form */}
        <div className="lg:col-span-1">
          <h2 className="text-3xl font-serif text-gray-900 dark:text-white mb-6 transition-colors duration-300">{t('profile.title')}</h2>
          <form onSubmit={submitHandler} className="card-strong bg-white dark:bg-gray-800 p-8 space-y-6 ring-1 ring-transparent hover:ring-primary/20 transition-all duration-300 shadow-xl">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('profile.name')}</label>
              <input
                type="text"
                id="name"
                placeholder={t('profile.name_placeholder')}
                className="input w-full dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400 transition-colors duration-300"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('profile.email')}</label>
              <input
                type="email"
                id="email"
                placeholder={t('profile.email_placeholder')}
                className="input w-full dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400 transition-colors duration-300"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('profile.password')}</label>
              <input
                type="password"
                id="password"
                placeholder={t('profile.enter_password_placeholder')}
                className="input w-full dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400 transition-colors duration-300"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('profile.confirm_password')}</label>
              <input
                type="password"
                id="confirmPassword"
                placeholder={t('profile.confirm_password_placeholder')}
                className="input w-full dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400 transition-colors duration-300"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
            <button
              type="submit"
              className="btn btn-primary w-full shadow-lg shadow-primary/30 transition-all duration-300"
            >
              {t('profile.update_btn')}
            </button>
          </form>
        </div>

        {/* Right Column: Orders & Messages */}
        <div className="lg:col-span-2">
          {/* Tabs */}
          <div className="flex space-x-6 mb-6 border-b border-gray-200 dark:border-gray-700 transition-colors duration-300">
            <button
              className={`pb-2 px-1 text-lg font-medium transition-colors relative ${
                activeTab === 'orders' 
                  ? 'text-primary border-b-2 border-primary' 
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
              onClick={() => setActiveTab('orders')}
            >
              {t('profile.my_orders')}
            </button>
            <button
              className={`pb-2 px-1 text-lg font-medium transition-colors relative ${
                activeTab === 'messages' 
                  ? 'text-primary border-b-2 border-primary' 
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
              onClick={() => setActiveTab('messages')}
            >
              {t('profile.support_messages')}
            </button>
          </div>

          {activeTab === 'orders' ? (
            loadingOrders ? (
              <div className="text-center text-lg text-gray-600 dark:text-gray-400">{t('profile.loading_orders')}</div>
            ) : errorOrders ? (
              <div className="card p-3 text-red-700 dark:text-red-400 ring-1 ring-red-200 dark:ring-red-900 bg-red-50/60 dark:bg-red-900/20">{errorOrders}</div>
            ) : (
              <div className="card-strong bg-white dark:bg-gray-800 p-8 ring-1 ring-transparent hover:ring-primary/20 transition-all duration-300 shadow-xl">
                {orders.length === 0 ? (
                  <div className="text-center text-lg text-gray-600 dark:text-gray-400">{t('profile.no_orders')}</div>
                ) : (
                  <div className="space-y-6">
                    {orders.map((order) => {
                      const isExpanded = expandedOrders[order._id];
                      return (
                        <div key={order._id} className="card p-0 hover:shadow-md transition-all duration-200 bg-white dark:bg-gray-700/50 border border-gray-100 dark:border-gray-600 rounded-xl overflow-hidden">
                          <div 
                            className="p-6 cursor-pointer" 
                            onClick={() => setExpandedOrders(prev => ({ ...prev, [order._id]: !isExpanded }))}
                          >
                            <div className="flex flex-col md:flex-row md:justify-between md:items-start mb-4 gap-2">
                              <div>
                                <h3 className="text-xl font-semibold text-gray-800 dark:text-white flex items-center gap-2">
                                  {t('profile.order')} #{order._id.slice(-6).toUpperCase()}
                                  {isExpanded ? <ChevronUp size={20} className="text-gray-400" /> : <ChevronDown size={20} className="text-gray-400" />}
                                </h3>
                                <p className="text-xs text-gray-400 mt-1">
                                  {new Date(order.createdAt).toLocaleDateString()}
                                </p>
                              </div>
                              <div className="flex flex-col items-end gap-2">
                                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                  order.paymentStatus === 'paid' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                                }`}>
                                  {order.paymentStatus === 'paid' ? t('admin.orders.status.paid') : t('admin.orders.status.unpaid')}
                                </span>
                                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                  order.status === 'delivered' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                                }`}>
                                  {order.status === 'delivered' ? t('admin.orders.status.delivered') : order.status === 'shipped' ? t('admin.orders.status.shipped') : t('admin.orders.status.pending')}
                                </span>
                              </div>
                            </div>
                            <div className="border-t border-gray-100 dark:border-gray-600 pt-4 mt-4 flex justify-between items-center">
                              <span className="text-sm text-gray-500 dark:text-gray-400">{order.items?.length || 0} {t('profile.items')}</span>
                              <span className="text-lg font-bold text-gray-900 dark:text-white">
                                {formatPrice(order.total)}
                              </span>
                            </div>
                          </div>

                          {isExpanded && (
                            <div className="bg-gray-50 dark:bg-gray-800/50 p-6 border-t border-gray-100 dark:border-gray-600 animate-fadeIn">
                              <h4 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                <Package size={16} /> {t('profile.items')}
                              </h4>
                              <div className="space-y-4">
                                {order.items?.map((item, idx) => {
                                  const lang = i18n.language || 'en';
                                  const p = item.product || {};
                                  const trans = (p.translations || {})[lang];
                                  const name = trans?.name || p.name || t('common.unknown');
                                  
                                  return (
                                    <div key={idx} className="flex items-center gap-4">
                                      <div className="w-12 h-12 rounded-lg bg-white dark:bg-gray-700 border border-gray-100 dark:border-gray-600 overflow-hidden flex-shrink-0">
                                        {p.image ? (
                                          <img 
                                            src={p.image.startsWith('http') ? p.image : (api.defaults.baseURL.replace(/\/api$/, '') + (p.image.startsWith('/') ? p.image : `/uploads/${p.image}`))} 
                                            alt={name} 
                                            className="w-full h-full object-cover"
                                          />
                                        ) : (
                                          <div className="w-full h-full flex items-center justify-center text-gray-300">
                                            <Package size={20} />
                                          </div>
                                        )}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{name}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                          {item.quantity} x {formatPrice(item.price)}
                                        </p>
                                      </div>
                                      <div className="text-sm font-bold text-gray-900 dark:text-white">
                                        {formatPrice(item.quantity * item.price)}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )
          ) : loadingMessages ? (
            <div className="text-center text-lg text-gray-600 dark:text-gray-400">{t('profile.loading_messages')}</div>
          ) : errorMessages ? (
            <div className="card p-3 text-red-700 dark:text-red-400 ring-1 ring-red-200 dark:ring-red-900 bg-red-50/60 dark:bg-red-900/20">{errorMessages}</div>
          ) : (
            <div className="card-strong bg-white dark:bg-gray-800 p-8 ring-1 ring-transparent hover:ring-primary/20 transition-all duration-300 shadow-xl">
              {messages.length === 0 ? (
                <div className="text-center text-lg text-gray-600 dark:text-gray-400">{t('profile.no_messages')}</div>
              ) : (
                <div className="space-y-6">
                  {messages.map((msg) => (
                    <div key={msg._id} className="card p-6 hover:shadow-md transition-all duration-200 bg-white dark:bg-gray-700/50 border border-gray-100 dark:border-gray-600 rounded-xl">
                      <div className="flex flex-col md:flex-row md:justify-between md:items-start mb-4 gap-2">
                        <div>
                          <h3 className="text-xl font-semibold text-gray-800 dark:text-white flex items-center gap-2">
                            <MessageSquare size={20} className="text-primary" />
                            {msg.subject}
                          </h3>
                          <p className="text-xs text-gray-400 mt-1">
                            {new Date(msg.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium self-start ${
                          msg.isReplied ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                        }`}>
                          {msg.isReplied ? t('admin.messages.status.replied') : t('admin.orders.status.pending')}
                        </span>
                      </div>

                      <div className="bg-gray-50 dark:bg-gray-600/30 p-4 rounded-lg mb-4">
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">{t('profile.your_message')}</p>
                        <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{msg.message}</p>
                      </div>

                      {msg.isReplied && (
                        <div className="mt-4 p-4 bg-primary/5 dark:bg-primary/10 rounded-lg border-l-4 border-primary animate-fadeIn">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold">
                              A
                            </div>
                            <p className="text-sm font-bold text-gray-900 dark:text-white">{t('profile.admin_reply')}</p>
                            <span className="text-xs text-gray-400 ml-auto">
                              {new Date(msg.repliedAt).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap pl-8">{msg.adminReply}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfileScreen;
