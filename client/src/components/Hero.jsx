import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Star, ArrowRight, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const Hero = () => {
  const { t } = useTranslation();
  const HERO_IMAGE = '/images/IMAGE HOME SARIA.png';

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: [0.22, 1, 0.36, 1]
      }
    }
  };

  const imageVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        duration: 0.6,
        ease: "easeOut",
        delay: 0.2
      }
    }
  };

  return (
    <section className="relative min-h-[90vh] flex items-center overflow-hidden bg-gradient-to-br from-rose-50 via-white to-rose-100 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 transition-colors duration-300">
      {/* Background Decor - Optimized for performance */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[40%] h-[40%] bg-rose-200/20 dark:bg-rose-900/10 rounded-full blur-2xl" />
        <div className="absolute top-[40%] -right-[10%] w-[30%] h-[30%] bg-rose-300/15 dark:bg-rose-900/10 rounded-full blur-2xl" />
      </div>

      <div className="container mx-auto px-4 py-20 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          
          {/* Text Content */}
          <div className="order-2 lg:order-1 max-w-2xl">
            <motion.div 
              variants={itemVariants}
              initial="hidden"
              animate="visible"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-rose-200 dark:border-rose-900/30 text-rose-900 dark:text-rose-300 mb-8 shadow-sm"
            >
              <Sparkles className="w-4 h-4 text-rose-500" />
              <span className="text-sm font-medium tracking-wide uppercase">{t('hero.premium_badge')}</span>
            </motion.div>

            <motion.h1 
              variants={itemVariants}
              initial="hidden"
              animate="visible"
              className="text-5xl lg:text-7xl font-serif text-gray-900 dark:text-white mb-6 leading-[1.1]"
            >
              {t('hero.title')}
            </motion.h1>

            <motion.p 
              variants={itemVariants}
              initial="hidden"
              animate="visible"
              className="text-lg lg:text-xl text-gray-600 dark:text-gray-300 mb-10 leading-relaxed max-w-lg"
            >
              {t('hero.subtitle')}
            </motion.p>

            <motion.div 
              variants={itemVariants}
              initial="hidden"
              animate="visible"
              className="flex flex-wrap gap-4"
            >
              <Link to="/shop" className="group relative px-8 py-4 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-full overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-300">
                <span className="relative z-10 flex items-center gap-2 font-medium">
                  {t('shop_now')}
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-rose-500 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </Link>
              
              <Link to="/about" className="px-8 py-4 bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 rounded-full font-medium hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-all duration-300 shadow-sm hover:shadow-md">
                {t('nav.about')}
              </Link>
            </motion.div>
            
            <div className="mt-12 flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                <div className="flex -space-x-3">
                    {[1,2,3,4].map((i) => (
                        <div key={i} className="w-10 h-10 rounded-full border-2 border-white dark:border-gray-800 bg-gray-200 overflow-hidden">
                             <img src={`/images/${i}.png`} alt="User" className="w-full h-full object-cover" 
                                onError={(e) => {e.target.src = `https://ui-avatars.com/api/?name=U+${i}&background=random`}}
                                loading="lazy"
                             />
                        </div>
                    ))}
                </div>
                <div className="flex flex-col">
                    <div className="flex text-yellow-400">
                        {[1,2,3,4,5].map(s => <Star key={s} className="w-4 h-4 fill-current" />)}
                    </div>
                </div>
            </div>
          </div>

          {/* Image Content */}
          <div className="order-1 lg:order-2 relative">
            <motion.div
                variants={imageVariants}
                initial="hidden"
                animate="visible"
                className="relative z-20"
            >
                <div className="relative rounded-[2.5rem] overflow-hidden shadow-2xl border-8 border-white dark:border-gray-800 transition-colors duration-300">
                    <img 
                        src={HERO_IMAGE} 
                        alt="Saria Beauty Collection" 
                        className="w-full h-[400px] lg:h-[500px] object-cover"
                        loading="lazy"
                        decoding="async"
                        fetchPriority="high"
                    />
                </div>
            </motion.div>

            {/* Decorative Elements - Simplified for performance */}
            <div className="absolute -top-10 -right-10 z-10 text-rose-200 opacity-50">
                <svg width="120" height="120" viewBox="0 0 200 200" fill="currentColor">
                    <path d="M100 0C100 0 100 100 200 100C100 100 100 200 100 200C100 200 100 100 0 100C0 100 100 100 100 0Z" />
                </svg>
            </div>
            
            <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-rose-300/20 rounded-full blur-2xl z-0" />
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;