import axios from 'axios';

const normalizeApiBaseUrl = (value) => {
  const raw = (value || '').trim();
  if (!raw) return 'http://localhost:5001/api';

  const noTrailingSlash = raw.endsWith('/') ? raw.slice(0, -1) : raw;
  if (noTrailingSlash.endsWith('/api')) return noTrailingSlash;
  return `${noTrailingSlash}/api`;
};

const API_ORIGIN = normalizeApiBaseUrl(import.meta.env.VITE_API_URL);

const api = axios.create({
  baseURL: API_ORIGIN,
});

api.interceptors.request.use(
  (config) => {
    const userInfo = localStorage.getItem('userInfo');
    if (userInfo) {
      const { token } = JSON.parse(userInfo);
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;
