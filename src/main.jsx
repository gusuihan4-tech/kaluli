import React from 'react';
import ReactDOM from 'react-dom/client';
import * as Sentry from '@sentry/react';
import App from './App';

// Initialize Sentry for error tracking
if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE,
    tracesSampleRate: 0.1,
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Sentry.ErrorBoundary fallback={<p>An error has occurred while rendering. Our team has been notified.</p>}>
      <App />
    </Sentry.ErrorBoundary>
  </React.StrictMode>
);

// 注册 service worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(e => {
    console.log('SW register failed:', e);
    if (import.meta.env.VITE_SENTRY_DSN) {
      Sentry.captureException(new Error(`Service Worker registration failed: ${e.message}`));
    }
  });
}
