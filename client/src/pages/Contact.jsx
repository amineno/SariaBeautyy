import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Phone, Send, Instagram, MessageCircle } from 'lucide-react';
import TikTok from '../components/icons/TikTok';
import { toast } from 'react-hot-toast';
import api from '../api/axios';
import { useTranslation } from 'react-i18next';
import { getSocialMediaUrl } from '../config/socialLinks';
import { useAuth } from '../hooks/useAuth';

const Contact = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const config = {};
      if (user && user.token) {
        config.headers = {
          Authorization: `Bearer ${user.token}`,
        };
      }
      await api.post('/contact', formData, config);
      toast.success('Message sent successfully! We will get back to you soon.');
      setFormData({ name: '', email: '', subject: '', message: '' });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to send message. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSocialClick = (platform) => {
    toast.success(`Opening ${platform} in a new tab...`);
  };

  const contactInfo = [
    {
      icon: <Mail className="w-6 h-6 text-primary" />,
      label: t('contact.info.email_label'),
      value: "support@sariabeauty.com",
      subValue: t('contact.info.email_sub')
    },
    {
      icon: <Phone className="w-6 h-6 text-primary" />,
      label: t('contact.info.phone_label'),
      value: "+1 (555) 123-4567",
      subValue: t('contact.info.phone_sub')
    }
  ];

  const socialLinks = [
    { icon: <Instagram className="w-5 h-5" />, label: "Instagram" },
    { icon: <TikTok className="w-5 h-5" />, label: "TikTok" },
    { icon: <MessageCircle className="w-5 h-5" />, label: "WhatsApp" }
  ];

  return (
    <main className="bg-gray-50 dark:bg-gray-900 min-h-screen transition-colors duration-300">
      <div className="relative bg-rose-100/50 dark:bg-gray-800/50 pt-32 pb-20 lg:pt-48 lg:pb-28 transition-colors duration-300">
        <div className="absolute inset-0 z-0 opacity-10 dark:opacity-5">
          <div className="absolute inset-0 bg-repeat bg-center" style={{ backgroundImage: 'url(/images/patterns/subtle-dots.svg)' }}></div>
        </div>
        <div className="container mx-auto px-4 relative z-10">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center"
          >
            <h1 className="text-4xl md:text-6xl font-serif text-gray-900 dark:text-white mb-4 transition-colors duration-300">{t('contact.title')}</h1>
            <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto text-lg transition-colors duration-300">{t('contact.subtitle')}</p>
          </motion.div>
        </div>
      </div>
      <div className="container mx-auto px-4 py-16">

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 max-w-6xl mx-auto">
          {/* Contact Info Column */}
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="lg:col-span-5"
          >
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 transition-colors duration-300">
              <h2 className="text-3xl font-serif text-gray-900 dark:text-white mb-6 transition-colors duration-300">{t('contact.coordinates')}</h2>
              
              <div className="space-y-6">
                {contactInfo.map((item, index) => (
                  <div key={index} className="flex gap-5 items-start">
                    <div className="w-14 h-14 rounded-full bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center shrink-0 transition-colors duration-300">
                      {item.icon}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white transition-colors duration-300">{item.label}</h3>
                      <p className="text-gray-600 dark:text-gray-300 transition-colors duration-300">{item.value}</p>
                      <p className="text-sm text-gray-400 dark:text-gray-500 transition-colors duration-300">{item.subValue}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-8 mt-8 border-t border-gray-100 dark:border-gray-700 transition-colors duration-300">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 transition-colors duration-300">{t('contact.follow_us')}</h3>
                <div className="flex gap-4">
                  {socialLinks.map((link, index) => (
                    <a
                      key={index}
                      href={getSocialMediaUrl(link.label.toLowerCase())}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-primary hover:text-white dark:hover:bg-primary dark:hover:text-white transition-all duration-300"
                      aria-label={link.label}
                      onClick={() => handleSocialClick(link.label)}
                    >
                      {link.icon}
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Contact Form Column */}
          <motion.div 
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="lg:col-span-7"
          >
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 md:p-10 transition-colors duration-300">
              <h2 className="text-3xl font-serif text-gray-900 dark:text-white mb-8 transition-colors duration-300">{t('contact.form.title')}</h2>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('contact.form.name')}
                  </label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    placeholder={t('contact.form.name_placeholder')}
                    className="input w-full bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600 focus:bg-white dark:focus:bg-gray-700 text-gray-900 dark:text-white transition-colors"
                  />
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('contact.form.email')}
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    placeholder={t('contact.form.email_placeholder')}
                    className="input w-full bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600 focus:bg-white dark:focus:bg-gray-700 text-gray-900 dark:text-white transition-colors"
                  />
                </div>
                <div>
                  <label htmlFor="subject" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('contact.form.subject')}
                  </label>
                  <input
                    id="subject"
                    name="subject"
                    type="text"
                    required
                    value={formData.subject}
                    onChange={handleChange}
                    placeholder={t('contact.form.subject')}
                    className="input w-full bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600 focus:bg-white dark:focus:bg-gray-700 text-gray-900 dark:text-white transition-colors"
                  />
                </div>
                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('contact.form.message')}
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    required
                    rows="4"
                    value={formData.message}
                    onChange={handleChange}
                    placeholder={t('contact.form.message_placeholder')}
                    className="input w-full bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600 focus:bg-white dark:focus:bg-gray-700 text-gray-900 dark:text-white transition-colors resize-none"
                  ></textarea>
                </div>

                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="btn btn-primary w-full py-4 text-lg rounded-full font-semibold shadow-lg shadow-primary/30 disabled:opacity-70 flex items-center justify-center gap-3"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      {t('contact.form.sending')}
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      {t('contact.form.send_message')}
                    </>
                  )}
                </button>
              </form>
            </div>
          </motion.div>
        </div>
      </div>
    </main>
  );
};

export default Contact;
