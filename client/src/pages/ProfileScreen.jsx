import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';
import api from '../api/axios';
import { MessageSquare } from 'lucide-react';
import toast from 'react-hot-toast';

const ProfileScreen = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();

  const [activeTab, setActiveTab] = useState('messages');
  const [name, setName] = useState(() => (user?.name || ''));
  const [email, setEmail] = useState(() => (user?.email || ''));
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [errorMessages, setErrorMessages] = useState(null);

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

      fetchMyMessages();
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
                activeTab === 'messages' 
                  ? 'text-primary border-b-2 border-primary' 
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
              onClick={() => setActiveTab('messages')}
            >
              Support Messages
            </button>
          </div>

          {loadingMessages ? (
            <div className="text-center text-lg text-gray-600 dark:text-gray-400">Loading messages...</div>
          ) : errorMessages ? (
            <div className="card p-3 text-red-700 dark:text-red-400 ring-1 ring-red-200 dark:ring-red-900 bg-red-50/60 dark:bg-red-900/20">{errorMessages}</div>
          ) : (
            <div className="card-strong bg-white dark:bg-gray-800 p-8 ring-1 ring-transparent hover:ring-primary/20 transition-all duration-300 shadow-xl">
              {messages.length === 0 ? (
                <div className="text-center text-lg text-gray-600 dark:text-gray-400">No support messages found.</div>
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
                          {msg.isReplied ? 'Replied' : 'Pending'}
                        </span>
                      </div>

                      <div className="bg-gray-50 dark:bg-gray-600/30 p-4 rounded-lg mb-4">
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Your message:</p>
                        <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{msg.message}</p>
                      </div>

                      {msg.isReplied && (
                        <div className="mt-4 p-4 bg-primary/5 dark:bg-primary/10 rounded-lg border-l-4 border-primary animate-fadeIn">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold">
                              A
                            </div>
                            <p className="text-sm font-bold text-gray-900 dark:text-white">Admin Reply</p>
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
