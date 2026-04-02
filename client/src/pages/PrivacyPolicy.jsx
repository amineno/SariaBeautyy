import React from 'react';
import { useTranslation } from 'react-i18next';
import { ShieldCheck, Lock, Eye, FileText } from 'lucide-react';

const PrivacyPolicy = () => {
  const { t } = useTranslation();

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-32 pb-16 transition-colors duration-300">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto card-strong bg-white dark:bg-gray-800 p-8 md:p-12">
          <header className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-rose-50 dark:bg-gray-700 rounded-2xl mb-6">
              <ShieldCheck className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-4xl font-serif text-gray-900 dark:text-white mb-4">{t('legal.privacy_title')}</h1>
            <p className="text-gray-500 dark:text-gray-400 italic">{t('legal.last_updated')}: {new Date().toLocaleDateString()}</p>
          </header>

          <div className="prose prose-rose dark:prose-invert max-w-none space-y-8">
            <section>
              <h2 className="text-2xl font-serif text-gray-900 dark:text-white flex items-center gap-3">
                <Eye className="w-6 h-6 text-primary" /> {t('legal.privacy.section1_title')}
              </h2>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                {t('legal.privacy.section1_content')}
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-serif text-gray-900 dark:text-white flex items-center gap-3">
                <Lock className="w-6 h-6 text-primary" /> {t('legal.privacy.section2_title')}
              </h2>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                {t('legal.privacy.section2_content')}
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-serif text-gray-900 dark:text-white flex items-center gap-3">
                <FileText className="w-6 h-6 text-primary" /> {t('legal.privacy.section3_title')}
              </h2>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                {t('legal.privacy.section3_content')}
              </p>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
};

export default PrivacyPolicy;
