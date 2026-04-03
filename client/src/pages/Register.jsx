import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useTranslation } from 'react-i18next';
import { GoogleLogin } from '@react-oauth/google';

const Register = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [appleReady, setAppleReady] = useState(false);
  const { register, googleLogin, appleLogin, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { t, i18n } = useTranslation();

  const searchParams = new URLSearchParams(location.search);
  const redirect = searchParams.get('redirect') || '/';

  React.useEffect(() => {
    if (user) {
      navigate(redirect);
    }
  }, [user, redirect, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const result = await register(name, email, password);
    if (result.success) {
      navigate(redirect);
    } else {
      setError(result.message);
    }
  };

  const handleGoogleSuccess = React.useCallback(
    async (credentialResponse) => {
      const result = await googleLogin(credentialResponse.credential);
      if (result.success) {
        navigate(redirect);
      }
    },
    [googleLogin, navigate, redirect]
  );

  const handleGoogleError = React.useCallback(() => {
    setError(t('auth.google_login_failed'));
  }, [t]);

  const googleButton = React.useMemo(
    () => (
      <GoogleLogin
        onSuccess={handleGoogleSuccess}
        onError={handleGoogleError}
        theme="filled_blue"
        text="signup_with"
        shape="pill"
        locale={i18n.language}
      />
    ),
    [handleGoogleSuccess, handleGoogleError, i18n.language]
  );

  const appleClientId = import.meta.env.VITE_APPLE_CLIENT_ID;
  const appleRedirectUri = import.meta.env.VITE_APPLE_REDIRECT_URI;

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!appleClientId) return;
    if (!window.AppleID?.auth?.init) return;
    try {
      window.AppleID.auth.init({
        clientId: appleClientId,
        scope: 'name email',
        redirectURI: appleRedirectUri || window.location.origin,
        usePopup: true,
      });
      setAppleReady(true);
    } catch {
      setAppleReady(false);
    }
  }, [appleClientId, appleRedirectUri]);

  const handleAppleSignUp = async () => {
    setError('');
    if (!appleReady || !window.AppleID?.auth?.signIn) {
      setError(t('auth.apple_login_failed'));
      return;
    }
    try {
      const response = await window.AppleID.auth.signIn();
      const identityToken = response?.authorization?.id_token;
      const fullName = response?.user?.name
        ? [response.user.name.firstName, response.user.name.lastName].filter(Boolean).join(' ')
        : '';

      if (!identityToken) {
        setError(t('auth.apple_login_failed'));
        return;
      }

      const result = await appleLogin(identityToken, fullName);
      if (result.success) {
        navigate(redirect);
      } else {
        setError(result.message);
      }
    } catch {
      setError(t('auth.apple_login_failed'));
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      <div className="max-w-md w-full space-y-8 card-strong p-8 bg-white dark:bg-gray-800 dark:border-gray-700">
        <div>
          <h2 className="mt-6 text-center text-3xl font-serif text-gray-900 dark:text-white">
            {t('auth.create_account')}
          </h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && <div className="text-red-500 dark:text-red-400 text-center text-sm">{error}</div>}
          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="sr-only">{t('auth.full_name')}</label>
              <input
                id="name"
                name="name"
                type="text"
                autoComplete="name"
                required
                className="input dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                placeholder={t('auth.full_name')}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="email-address" className="sr-only">{t('auth.email_address')}</label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="input dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                placeholder={t('auth.email_address')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">{t('auth.password')}</label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                className="input dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                placeholder={t('auth.password')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              className="btn btn-primary w-full"
            >
              {t('auth.register')}
            </button>
          </div>
          
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                {t('auth.or_continue_with')}
              </span>
            </div>
          </div>

          <div className="flex justify-center">
            {googleButton}
          </div>

          <div className="flex justify-center">
            <button
              type="button"
              onClick={handleAppleSignUp}
              disabled={!appleReady}
              className="btn w-full max-w-[300px] bg-black text-white hover:bg-black/90 disabled:opacity-60"
            >
              {t('auth.continue_with_apple')}
            </button>
          </div>

          <div className="text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t('auth.already_have_an_account')}{' '}
              <Link to={`/login${redirect && redirect !== '/' ? `?redirect=${encodeURIComponent(redirect)}` : ''}`} className="font-medium text-primary hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300">
                {t('auth.sign_in_here')}
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Register;
