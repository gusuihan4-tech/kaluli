import React from 'react';
import ReactDOM from 'react-dom/client';
import * as Sentry from '@sentry/react';
import { BrowserTracing } from '@sentry/tracing';
import App from './App';

// Initialize Sentry for error tracking and performance monitoring
Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN || '',
  environment: import.meta.env.MODE,
  integrations: [
    new BrowserTracing(),
    new Sentry.Replay({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],
  // Set sample rates (0.1 = 10% of transactions)
  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0.05,
  replaysOnErrorSampleRate: 1.0,
});

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
    Sentry.captureException(new Error(`Service Worker registration failed: ${e.message}`));
  });
}
