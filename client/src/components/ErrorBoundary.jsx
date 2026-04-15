import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // You can also log the error to an error reporting service
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return (
        <div className="min-h-[400px] flex flex-col items-center justify-center p-8 text-center bg-white dark:bg-gray-800 rounded-3xl border border-rose-100 dark:border-gray-700 shadow-sm m-6">
          <div className="w-16 h-16 bg-rose-100 dark:bg-rose-900/30 rounded-full flex items-center justify-center mb-6">
            <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-2xl font-serif font-bold text-gray-900 dark:text-white mb-2">
            Oups ! Quelque chose s'est mal passé.
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md">
            Une erreur est survenue lors de l'affichage de cette section. Veuillez rafraîchir la page ou réessayer plus tard.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="btn btn-primary px-8 py-3 rounded-full font-bold shadow-lg shadow-rose-200 dark:shadow-none transition-all active:scale-95"
          >
            Rafraîchir la page
          </button>
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-8 p-4 bg-gray-50 dark:bg-gray-900 rounded-xl text-left overflow-auto max-w-full">
              <p className="text-xs font-mono text-red-500">{this.state.error?.toString()}</p>
            </div>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
