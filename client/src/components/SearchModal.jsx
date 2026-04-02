import React, { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../api/axios';

const SearchModal = ({ onClose }) => {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (query.length > 2) {
      const fetchResults = async () => {
        setLoading(true);
        try {
          const { data } = await api.get(`/products?search=${query}`);
          setResults(data);
        } catch (error) {
          console.error('Error fetching search results:', error);
        } finally {
          setLoading(false);
        }
      };
      fetchResults();
    } else {
      setResults([]);
    }
  }, [query]);

  const resolveImage = (img) => {
    if (!img) return '';
    const lower = img.toLowerCase();
    if (lower.startsWith('http') || lower.startsWith('data:') || lower.startsWith('/')) return img;
    return `/images/${img}`;
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-start justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-2xl mt-16 relative transition-colors duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 relative">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 w-5 h-5" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('search.placeholder')}
            className="input w-full pl-12 text-lg bg-transparent focus:ring-0 border-0 dark:text-white"
            autoFocus
          />
          <button onClick={onClose} className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 dark:text-gray-500 dark:hover:text-gray-300 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {loading && <p className="text-center text-gray-500 dark:text-gray-400">{t('search.loading')}</p>}
          {!loading && results.length === 0 && query.length > 2 && (
            <p className="text-center text-gray-500 dark:text-gray-400">{t('search.no_results', { query })}</p>
          )}
          <div className="space-y-4">
            {results.map((product) => (
              <Link to={`/product/${product._id}`} onClick={onClose} key={product._id} className="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                <div className="w-16 h-16 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 rounded-md flex items-center justify-center shadow-inner">
                  <img src={resolveImage(product.image)} alt={product.name} className="w-14 h-14 object-contain transition-all duration-300 hover:scale-105" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-800 dark:text-white">{product.name}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">${product.price}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SearchModal;
