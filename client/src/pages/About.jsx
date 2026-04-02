import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Heart, Sparkles, ShieldCheck, Leaf, Users, Star, ArrowRight } from 'lucide-react';
import api from '../api/axios';
import { useTranslation } from 'react-i18next';

const About = () => {
  const [pageData, setPageData] = useState(null);
  const [loading, setLoading] = useState(true);
  const { t, i18n } = useTranslation();

  useEffect(() => {
    const fetchAboutData = async () => {
      try {
        const { data } = await api.get('/pages/about');
        setPageData(data);
      } catch (error) {
        console.error('Error fetching about data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchAboutData();

    // SSE for real-time updates
    const eventSource = new EventSource(`${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api/pages/events`);
    
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.channel === 'page' && data.type === 'page_content_updated' && data.page === 'about') {
          setPageData(data.content);
        }
      } catch (err) {
        console.error('SSE Error:', err);
      }
    };

    eventSource.onerror = (err) => {
      console.warn('SSE About connection error', err);
    };

    return () => {
      eventSource.close();
    };
  }, []);

  const getIcon = (iconName) => {
    const icons = {
      Heart: <Heart className="w-6 h-6 text-primary" />,
      Sparkles: <Sparkles className="w-6 h-6 text-primary" />,
      ShieldCheck: <ShieldCheck className="w-6 h-6 text-primary" />,
      Leaf: <Leaf className="w-6 h-6 text-primary" />,
      Users: <Users className="w-6 h-6 text-primary" />,
      Star: <Star className="w-6 h-6 text-primary" />
    };
    return icons[iconName] || <Star className="w-6 h-6 text-primary" />;
  };

  if (loading) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Use pageData from API, fallback to translations if pageData is not available
  // This ensures the About page updates when content is changed via admin panel
  // We only use pageData if the language is English (default), as the DB doesn't support multiple languages yet
  const isDefaultLang = i18n.language === 'en';

  const displayData = {
    title: (isDefaultLang && pageData?.title) || t('about.title'),
    subtitle: (isDefaultLang && pageData?.subtitle) || t('about.subtitle'),
    mission: {
      title: (isDefaultLang && pageData?.mission?.title) || t('about.mission_title'),
      content: (isDefaultLang && pageData?.mission?.content) || t('about.mission_content'),
      imageUrl: "/images/IMAGE HOME SARIA.png"
    },
    sections: (isDefaultLang && pageData?.sections?.length > 0) ? pageData.sections : [
      { icon: "Heart", title: t('about.section_passion_title'), content: t('about.section_passion_content') },
      { icon: "Sparkles", title: t('about.section_quality_title'), content: t('about.section_quality_content') },
      { icon: "ShieldCheck", title: t('about.section_trust_title'), content: t('about.section_trust_content') }
    ]
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: "easeOut" }
    }
  };



  return (
    <main className="bg-gray-50 dark:bg-gray-900 min-h-screen transition-colors duration-300">
      <div className="relative bg-rose-100/50 dark:bg-gray-800/50 pt-32 pb-20 lg:pt-48 lg:pb-28 transition-colors duration-300">
        <div className="absolute inset-0 z-0 opacity-10">
          <div className="absolute inset-0 bg-repeat bg-center" style={{ backgroundImage: 'url(/images/patterns/subtle-dots.svg)' }}></div>
        </div>
        <div className="container mx-auto px-4 relative z-10">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center"
          >
            <h1 className="text-4xl md:text-6xl font-serif text-gray-900 dark:text-white mb-4">{displayData.title}</h1>
            <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto text-lg">{displayData.subtitle}</p>
          </motion.div>
        </div>
      </div>
      <div className="container mx-auto px-4 py-16">

        {/* Story Section */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-12 mb-24 transition-colors duration-300">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="relative"
            >
              <div className="aspect-w-1 aspect-h-1 rounded-2xl overflow-hidden">
                <img 
                  src={displayData.mission?.imageUrl || "/images/IMAGE HOME SARIA.png"} 
                  alt="Our Story" 
                  className="w-full h-full object-cover"
                />
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="space-y-6"
            >
              <h2 className="text-4xl font-serif text-gray-900 dark:text-white">{displayData.mission?.title}</h2>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed text-lg">
                {displayData.mission?.content}
              </p>
              <div className="pt-4 space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white">{(isDefaultLang && pageData?.badge1_title) || t('about.badge1_title')}</h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{(isDefaultLang && pageData?.badge1_desc) || t('about.badge1_desc')}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                    <Heart className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white">{(isDefaultLang && pageData?.badge2_title) || t('about.badge2_title')}</h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{(isDefaultLang && pageData?.badge2_desc) || t('about.badge2_desc')}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Values Section */}
        <div className="mb-24">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-serif text-gray-900 dark:text-white mb-4">{(isDefaultLang && pageData?.values_title) || t('about.values_title')}</h2>
            <p className="text-gray-600 dark:text-gray-300 text-lg">{(isDefaultLang && pageData?.values_subtitle) || t('about.values_subtitle')}</p>
          </div>
          
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
          >
            {displayData.sections?.map((value, index) => (
              <motion.div 
                key={index}
                variants={itemVariants}
                className="bg-white dark:bg-gray-800 rounded-2xl p-8 text-center transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
              >
                <div className="w-20 h-20 rounded-full bg-rose-100 dark:bg-gray-700 flex items-center justify-center mb-6 mx-auto">
                  {getIcon(value.icon)}
                </div>
                <h3 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white">{value.title}</h3>
                <p className="text-gray-600 dark:text-gray-300 leading-relaxed">{value.content || value.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>

        {/* CTA Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-12 text-center transition-colors duration-300"
        >
          <h2 className="text-4xl font-serif text-gray-900 dark:text-white mb-4">{(isDefaultLang && pageData?.cta_title) || t('about.cta_title')}</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto text-lg">
            {(isDefaultLang && pageData?.cta_desc) || t('about.cta_desc')}
          </p>
          <Link to="/shop" className="group relative px-8 py-4 bg-gray-900 dark:bg-gray-700 text-white rounded-full overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-300">
            <span className="relative z-10 flex items-center gap-2 font-medium">
              {t('about.cta_button')}
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </span>
            <div className="absolute inset-0 bg-gradient-to-r from-rose-500 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </Link>
        </motion.div>
      </div>
    </main>
  );
};

export default About;
