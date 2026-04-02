import React from 'react';
import { useTranslation } from 'react-i18next';
import { FileText, Scale, Info, CheckCircle } from 'lucide-react';

const TermsAndConditions = () => {
  const { t } = useTranslation();

  return (
    <main className="min-h-screen bg-white dark:bg-gray-900 pt-32 pb-16 transition-colors duration-300">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <header className="text-center mb-16">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-rose-50 dark:bg-gray-700 rounded-2xl mb-6 shadow-sm">
              <Scale className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-4xl md:text-5xl font-serif text-gray-900 dark:text-white mb-4">{t('legal.terms_title')}</h1>
            <p className="text-gray-500 dark:text-gray-400 italic">{t('legal.last_updated')}: {new Date().toLocaleDateString()}</p>
          </header>

          <div className="card-strong bg-white/80 dark:bg-gray-800/80 p-8 md:p-12 space-y-12 border border-rose-50 dark:border-gray-700">
            <section className="space-y-4">
              <h2 className="text-2xl font-serif text-gray-900 dark:text-white flex items-center gap-3">
                <Info className="w-6 h-6 text-primary" /> {t('legal.terms.section1_title')}
              </h2>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed text-lg">
                {t('legal.terms.section1_content')}
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-serif text-gray-900 dark:text-white flex items-center gap-3">
                <FileText className="w-6 h-6 text-primary" /> {t('legal.terms.section2_title')}
              </h2>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed text-lg">
                {t('legal.terms.section2_content')}
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-serif text-gray-900 dark:text-white flex items-center gap-3">
                <CheckCircle className="w-6 h-6 text-primary" /> {t('legal.terms.section3_title')}
              </h2>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed text-lg">
                {t('legal.terms.section3_content')}
              </p>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
};

export default TermsAndConditions;
