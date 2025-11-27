import React from 'react';
import ReactDOM from 'react-dom/client';
import * as Sentry from '@sentry/react';
import { Toaster } from 'react-hot-toast';
import App from './App';
import './index.css';

// Initialize Sentry
if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE,

    // Performance Monitoring
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: false,
        blockAllMedia: false,
      }),
    ],

    // Performance Monitoring sample rate
    tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,

    // Session Replay sample rate
    replaysSessionSampleRate: 0.1, // Sample 10% of sessions
    replaysOnErrorSampleRate: 1.0, // Sample 100% of sessions with errors

    // Release tracking
    release: import.meta.env.VITE_APP_VERSION || 'development',

    // Filter out expected errors
    beforeSend(event) {
      // Don't send events in development unless explicitly enabled
      if (import.meta.env.DEV && !import.meta.env.VITE_SENTRY_DEBUG) {
        return null;
      }
      return event;
    },

    ignoreErrors: [
      // Network errors
      'NetworkError',
      'Network request failed',
      // Resize observer - not actionable
      'ResizeObserver loop limit exceeded',
      'ResizeObserver loop completed with undelivered notifications',
      // Browser extension errors
      'chrome-extension://',
      'moz-extension://',
    ],
  });

  console.log('[Sentry] Initialized for environment:', import.meta.env.MODE);
} else {
  console.warn('[Sentry] VITE_SENTRY_DSN not configured - error tracking disabled');
}

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element not found');
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 3000,
        style: {
          background: '#fff',
          color: '#000',
        },
        success: {
          duration: 2000,
          iconTheme: {
            primary: '#10b981',
            secondary: '#fff',
          },
        },
        error: {
          duration: 4000,
          iconTheme: {
            primary: '#ef4444',
            secondary: '#fff',
          },
        },
      }}
    />
  </React.StrictMode>,
);
