import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';
import { env } from './env';

/**
 * Initialize Sentry error tracking and performance monitoring
 */
export function initSentry(app: any) {
  // Only initialize if DSN is configured
  if (!env.SENTRY_DSN) {
    console.warn('[Sentry] SENTRY_DSN not configured - error tracking disabled');
    return;
  }

  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.NODE_ENV,

    // Set tracesSampleRate to 1.0 to capture 100% of transactions for performance monitoring.
    // We recommend adjusting this value in production, or using tracesSampler
    // for finer control
    tracesSampleRate: env.NODE_ENV === 'production' ? 0.1 : 1.0,

    // Set sampling rate for profiling - this is relative to tracesSampleRate
    profilesSampleRate: env.NODE_ENV === 'production' ? 0.1 : 1.0,

    // Performance Monitoring
    integrations: [
      // Enable HTTP calls tracing
      Sentry.httpIntegration({ tracing: true }),
      // Enable Express.js middleware tracing
      Sentry.expressIntegration({ app }),
      // Enable Profiling
      nodeProfilingIntegration(),
    ],

    // Release tracking
    release: process.env.RAILWAY_DEPLOYMENT_ID || 'development',

    // Configure what to send
    beforeSend(event, hint) {
      // Don't send events in development unless explicitly enabled
      if (env.NODE_ENV === 'development' && !env.SENTRY_DEBUG) {
        return null;
      }
      return event;
    },

    // Ignore certain errors
    ignoreErrors: [
      // Browser errors that shouldn't be on backend
      'ResizeObserver loop limit exceeded',
      'Non-Error promise rejection captured',
      // Network errors that are expected
      'Network Error',
      'NetworkError',
      'ECONNREFUSED',
      // Rate limiting is expected behavior
      'Too Many Requests',
    ],
  });

  console.log(`[Sentry] Initialized for environment: ${env.NODE_ENV}`);
}

/**
 * Request handler middleware - must be the first middleware
 */
export const sentryRequestHandler = () => Sentry.requestDataIntegration();

/**
 * Tracing middleware - should be after request handler
 */
export const sentryTracingHandler = () => Sentry.tracingMiddleware();

/**
 * Error handler middleware - must be before other error middleware
 */
export const sentryErrorHandler = () => Sentry.errorHandler({
  shouldHandleError(_error: Error) {
    // Capture all errors with status code 500 or greater
    return true;
  },
});

/**
 * Manually capture an exception
 */
export function captureException(error: Error, context?: Record<string, any>) {
  Sentry.captureException(error, {
    extra: context,
  });
}

/**
 * Manually capture a message
 */
export function captureMessage(message: string, level: Sentry.SeverityLevel = 'info', context?: Record<string, any>) {
  Sentry.captureMessage(message, {
    level,
    extra: context,
  });
}

/**
 * Add user context to Sentry
 */
export function setUser(user: { id: string; email?: string; username?: string }) {
  Sentry.setUser(user);
}

/**
 * Add custom context
 */
export function setContext(name: string, context: Record<string, any>) {
  Sentry.setContext(name, context);
}

/**
 * Add breadcrumb for debugging
 */
export function addBreadcrumb(message: string, data?: Record<string, any>) {
  Sentry.addBreadcrumb({
    message,
    data,
    timestamp: Date.now() / 1000,
  });
}
