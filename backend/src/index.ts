// Railway cache-busting: Explicit route ordering with comments (v1.0.5)
import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
// TEMP DISABLED: compression package not installed (Agent #4 added import but not package)
// import compression from 'compression';
import { rateLimit } from 'express-rate-limit';
import path from 'path';

// Import configuration and utilities
import { env } from './config/env';
import { logger } from './utils/logger';
import { closePool } from './config/database';
import { closeRedis } from './config/redis';
// TEMP DISABLED: Sentry v10 API changes need more work - will fix after tax issue resolved
// import { initSentry, sentryRequestHandler, sentryTracingHandler, sentryErrorHandler } from './config/sentry';

// Import routes
import authRoutes from './routes/auth';
import productRoutes from './routes/products';
import orderRoutes from './routes/orders';
import uploadRoutes from './routes/uploads';
import priceRoutes from './routes/pricing';
import webhookRoutes from './routes/webhooks';
import adminRoutes from './routes/admin';
import designRoutes from './routes/designs';
import jobRoutes from './routes/jobRoutes';
import healthRoutes from './routes/health';

// Import middleware
import { errorHandler } from './middleware/errorHandler';
import { notFound } from './middleware/notFound';

// Import storage initialization
import { initializeStorage } from './services/supabaseStorage';

const app: Application = express();

// TEMP DISABLED: Sentry v10 API changes need more work - will fix after tax issue resolved
// Initialize Sentry - must be done before other middleware
// initSentry(app);

// Trust proxy - Railway uses a reverse proxy (one hop)
app.set('trust proxy', 1);

// TEMP DISABLED: Sentry v10 API changes need more work - will fix after tax issue resolved
// Sentry request handler - must be the first middleware
// app.use(sentryRequestHandler());

// Sentry tracing handler - captures transactions
// app.use(sentryTracingHandler());

// Security middleware - Enhanced Helmet configuration with comprehensive security headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: [
        "'self'",
        "data:",
        "https://dntnjlodfcojzgovikic.supabase.co",
        ...(env.NODE_ENV === 'development' ? ["http://localhost:3001", "http://localhost:3002"] : [])
      ],
      connectSrc: [
        "'self'",
        "https://dntnjlodfcojzgovikic.supabase.co",
        ...(env.NODE_ENV === 'development' ? ["http://localhost:3001", "http://localhost:3002"] : [])
      ],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  // Additional security headers
  frameguard: { action: 'deny' },
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  },
  noSniff: true,
  referrerPolicy: { policy: 'no-referrer' },
}));

// Add custom Permissions-Policy header for feature control
app.use((_req: Request, res: Response, next) => {
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=(), payment=(self)');
  next();
});

// CORS configuration - allow both www and non-www versions
// Only include localhost in development to prevent security issues in production
const allowedOrigins = [
  env.FRONTEND_URL,
  'https://stolentee.com',
  'https://www.stolentee.com',
  ...(env.NODE_ENV === 'development' ? [
    'http://localhost:5173',
    'http://localhost:3003'
  ] : [])
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      logger.warn('CORS request blocked', { origin });
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// TEMP DISABLED: compression package not installed (Agent #4 added code but not package)
// Compression middleware - compress all responses
// app.use(compression({
//   // Compress all responses
//   filter: (req, res) => {
//     if (req.headers['x-no-compression']) {
//       // Don't compress responses if this request header is present
//       return false;
//     }
//     // Fallback to standard compression filter
//     return compression.filter(req, res);
//   },
//   // Compression level (0-9, 6 is default, 9 is best compression)
//   level: 6,
//   // Minimum response size to compress (bytes)
//   threshold: 1024,
// }));

// Rate limiting
const limiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX_REQUESTS,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);

// Strict rate limiter for expensive upload operations
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour window
  max: 10, // Max 10 uploads per hour per IP
  message: 'Too many uploads. Please wait before uploading again.',
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
});

// Strict rate limiter for authentication endpoints to prevent brute force attacks
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per 15 min
  message: 'Too many login attempts. Please try again later.',
  skipSuccessfulRequests: true, // Only count failed attempts
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply strict limiter to upload endpoint ONLY
app.use('/api/uploads/shirt-photo', uploadLimiter);

// Apply strict rate limiting to authentication endpoints
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/signup', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/forgot-password', authLimiter);

// Stripe webhook needs raw body for signature verification - must be before JSON parsing
app.use('/api/webhooks/stripe', express.raw({ type: 'application/json' }));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve uploaded files with CORS headers and CDN optimization
const uploadsPath = path.resolve(env.LOCAL_STORAGE_PATH || './uploads');
app.use('/uploads', (_req: Request, res: Response, next) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');

  // CDN caching (1 day for user uploads)
  res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
  res.setHeader('CDN-Cache-Control', 'public, max-age=86400');

  // Performance hints
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Vary', 'Accept-Encoding');

  next();
}, express.static(uploadsPath));

// Serve static product images with aggressive CDN caching
const assetsPath = path.resolve('./public/assets');
app.use('/assets', (_req: Request, res: Response, next) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');

  // Aggressive caching (1 week for product images - immutable)
  res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
  res.setHeader('CDN-Cache-Control', 'public, max-age=604800');

  // Performance hints
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Vary', 'Accept-Encoding');

  next();
}, express.static(assetsPath));

// Mount health check routes (must be before other routes for quick response)
app.use('/health', healthRoutes);

// Legacy health check for backward compatibility
app.get('/health/detailed', async (_req: Request, res: Response) => {
  try {
    const os = await import('os');
    const pool = (await import('./config/database')).default;

    // Check database connectivity
    const dbStart = Date.now();
    await pool.query('SELECT 1');
    const dbLatency = Date.now() - dbStart;

    // Gather system metrics
    const metrics = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: env.NODE_ENV,

      // Memory metrics
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        external: Math.round(process.memoryUsage().external / 1024 / 1024),
        rss: Math.round(process.memoryUsage().rss / 1024 / 1024),
        system: {
          total: Math.round(os.totalmem() / 1024 / 1024 / 1024),
          free: Math.round(os.freemem() / 1024 / 1024 / 1024),
          usedPercent: Math.round(((os.totalmem() - os.freemem()) / os.totalmem()) * 100)
        }
      },

      // CPU metrics
      cpu: {
        loadAverage: os.loadavg(),
        cores: os.cpus().length,
      },

      // Database metrics
      database: {
        latency: dbLatency,
        status: dbLatency < 100 ? 'healthy' : dbLatency < 500 ? 'degraded' : 'slow',
        pool: {
          total: pool.totalCount,
          idle: pool.idleCount,
          waiting: pool.waitingCount,
        }
      },

      // Process info
      process: {
        pid: process.pid,
        version: process.version,
        platform: process.platform,
        arch: process.arch,
      },

      // Infrastructure optimization status
      infrastructure: {
        rembgSelfHosted: Boolean(process.env.REMBG_ENDPOINT),
        r2Storage: Boolean(process.env.R2_ENDPOINT),
        costOptimized: Boolean(process.env.REMBG_ENDPOINT && process.env.R2_ENDPOINT),
        estimatedMonthlySavings: process.env.REMBG_ENDPOINT && process.env.R2_ENDPOINT
          ? '$2,000' : process.env.REMBG_ENDPOINT ? '$1,976' : process.env.R2_ENDPOINT ? '$24' : '$0'
      }
    };

    res.status(200).json(metrics);
  } catch (error: any) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Cache headers middleware for API responses
// Add caching for GET requests to read-heavy endpoints
app.use('/api/products', (req: Request, res: Response, next) => {
  if (req.method === 'GET') {
    // Cache product data for 1 hour (products rarely change)
    res.setHeader('Cache-Control', 'public, max-age=3600, stale-while-revalidate=7200');
  }
  next();
});

app.use('/api/price', (req: Request, res: Response, next) => {
  if (req.method === 'GET') {
    // Cache pricing calculations for 5 minutes
    res.setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=600');
  }
  next();
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/price', priceRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/designs', designRoutes);
app.use('/api/jobs', jobRoutes);

// TEMP DISABLED: Sentry v10 API changes need more work - will fix after tax issue resolved
// Error handling - Sentry error handler must come before custom error handlers
// app.use(sentryErrorHandler());
app.use(notFound);
app.use(errorHandler);

// Start server
const server = app.listen(env.PORT, async () => {
  logger.info('Stolen Tee API Server started', {
    port: env.PORT,
    environment: env.NODE_ENV,
    apiUrl: `http://localhost:${env.PORT}`,
  });

  // Initialize Supabase Storage bucket
  await initializeStorage();
});

// Graceful shutdown handler
const shutdown = async (signal: string) => {
  logger.info(`${signal} received, starting graceful shutdown`);

  server.close(async () => {
    logger.info('HTTP server closed');

    try {
      await closePool();
      await closeRedis();
      logger.info('All resources cleaned up, exiting');
      process.exit(0);
    } catch (error) {
      logger.error('Error during shutdown', {}, error as Error);
      process.exit(1);
    }
  });

  // Force shutdown after 10 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

// Handle shutdown signals
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Handle uncaught errors
process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught exception', {}, error);
  process.exit(1);
});

process.on('unhandledRejection', (reason: unknown) => {
  logger.error('Unhandled promise rejection', { reason: String(reason) });
  process.exit(1);
});

export default app;
