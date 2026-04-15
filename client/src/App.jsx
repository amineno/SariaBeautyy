import React, { useEffect, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import Header from './components/Header';
import { useTranslation } from 'react-i18next';
import { Toaster } from 'react-hot-toast';

// Lazy loading for pages
const Home = lazy(() => import('./pages/Home'));
const ProductDetails = lazy(() => import('./pages/ProductDetails'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const Cart = lazy(() => import('./pages/Cart'));
const Checkout = lazy(() => import('./pages/Checkout'));
const ProfileScreen = lazy(() => import('./pages/ProfileScreen'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const About = lazy(() => import('./pages/About'));
const Contact = lazy(() => import('./pages/Contact'));
const Shop = lazy(() => import('./pages/Shop'));
const Reviews = lazy(() => import('./pages/Reviews'));
const Wishlist = lazy(() => import('./pages/Wishlist'));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'));
const TermsAndConditions = lazy(() => import('./pages/TermsAndConditions'));
const FAQ = lazy(() => import('./pages/FAQ'));

// Non-lazy components that are small or needed immediately
import ChatAssistant from './components/ChatAssistant';
import Footer from './components/Footer';
import RequireAdmin from './components/RequireAdmin';
import ErrorBoundary from './components/ErrorBoundary';

const NotFound = ({ t }) => (
  <main className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
    <div className="container mx-auto px-4 py-24 text-center">
      <h2 className="text-4xl font-serif text-gray-900 dark:text-white mb-4">{t('not_found.title')}</h2>
      <p className="text-gray-600 dark:text-gray-300 mb-8">{t('not_found.message')}</p>
      <Link to="/" className="btn btn-primary inline-flex">{t('not_found.back_home')}</Link>
    </div>
  </main>
);

const ConditionalFooter = () => {
  const location = useLocation();
  if (location.pathname.startsWith('/admin')) return null;
  return <Footer />;
};

function App() {
  const { i18n, t } = useTranslation();

  useEffect(() => {
    document.dir = i18n.language === 'ar' ? 'rtl' : 'ltr';
  }, [i18n.language]);

  return (
    <Router>
      <Toaster 
        position="top-right" 
        reverseOrder={false}
        toastOptions={{
          className: 'glass-toast',
          success: {
            iconTheme: {
              primary: '#B76E79',
              secondary: '#fff',
            },
            style: {
              borderLeft: '4px solid #B76E79',
            }
          },
          error: {
            iconTheme: {
              primary: '#e11d48',
              secondary: '#fff',
            },
            style: {
              borderLeft: '4px solid #e11d48',
            }
          },
        }}
      />
      <div className="min-h-screen font-sans bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors duration-300">
        <Header />
        <ChatAssistant />
        <Suspense fallback={
          <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        }>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/product/:id" element={<ProductDetails />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/profile" element={<ProfileScreen />} />
            <Route path="/shop" element={<Shop />} />
            <Route path="/wishlist" element={<Wishlist />} />
            <Route path="/reviews" element={<Reviews />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/terms-conditions" element={<TermsAndConditions />} />
            <Route path="/faq" element={<FAQ />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/admin" element={
              <RequireAdmin>
                <ErrorBoundary>
                  <AdminDashboard />
                </ErrorBoundary>
              </RequireAdmin>
            } />
            <Route path="*" element={<NotFound t={t} />} />
            {/* Add more routes here */}
          </Routes>
        </Suspense>
        <ConditionalFooter />
      </div>
    </Router>
  );
}

export default App;
