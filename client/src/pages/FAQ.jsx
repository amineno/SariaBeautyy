import React from 'react';
import { useTranslation } from 'react-i18next';
import { HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';

const FAQ = () => {
  const { t } = useTranslation();
  const [openIndex, setOpenIndex] = useState(null);

  const faqs = [
    { question: t('faq.q1'), answer: t('faq.a1') },
    { question: t('faq.q2'), answer: t('faq.a2') },
    { question: t('faq.q3'), answer: t('faq.a3') },
    { question: t('faq.q4'), answer: t('faq.a4') },
    { question: t('faq.q5'), answer: t('faq.a5') },
  ];

  return (
    <main className="min-h-screen bg-gradient-to-b from-rose-50/70 via-white to-rose-100/70 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 pt-32 pb-16 transition-colors duration-300">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto">
          <header className="text-center mb-16">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-white dark:bg-gray-800 rounded-2xl shadow-sm mb-6">
              <HelpCircle className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-4xl md:text-5xl font-serif text-gray-900 dark:text-white mb-4">{t('faq.title')}</h1>
            <p className="text-gray-600 dark:text-gray-300 text-lg">{t('faq.subtitle')}</p>
          </header>

          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div 
                key={index} 
                className="card-strong bg-white/90 dark:bg-gray-800/90 overflow-hidden transition-all duration-300"
              >
                <button
                  onClick={() => setOpenIndex(openIndex === index ? null : index)}
                  className="w-full flex items-center justify-between p-6 text-left focus:outline-none"
                >
                  <span className="text-lg font-semibold text-gray-900 dark:text-white">{faq.question}</span>
                  {openIndex === index ? (
                    <ChevronUp className="w-5 h-5 text-primary" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  )}
                </button>
                <div 
                  className={`transition-all duration-300 ease-in-out ${
                    openIndex === index ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                  }`}
                >
                  <div className="p-6 pt-0 text-gray-600 dark:text-gray-300 leading-relaxed border-t border-rose-50 dark:border-gray-700 mt-2">
                    {faq.answer}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-16 text-center card-strong bg-primary/5 dark:bg-primary/10 p-8">
            <h3 className="text-xl font-serif text-gray-900 dark:text-white mb-2">{t('faq.more_questions')}</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6">{t('faq.contact_us_text')}</p>
            <a href="/contact" className="btn btn-primary rounded-full px-8 py-3 font-semibold">
              {t('faq.contact_us_btn')}
            </a>
          </div>
        </div>
      </div>
    </main>
  );
};

export default FAQ;
