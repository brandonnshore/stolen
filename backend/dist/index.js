"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// Railway cache-busting: Explicit route ordering with comments (v1.0.5)
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
// TEMP DISABLED: compression package not installed (Agent #4 added import but not package)
// import compression from 'compression';
const express_rate_limit_1 = require("express-rate-limit");
const path_1 = __importDefault(require("path"));
// Import configuration and utilities
const env_1 = require("./config/env");
const logger_1 = require("./utils/logger");
const database_1 = require("./config/database");
const redis_1 = require("./config/redis");
// Import routes
const auth_1 = __importDefault(require("./routes/auth"));
const products_1 = __importDefault(require("./routes/products"));
const orders_1 = __importDefault(require("./routes/orders"));
const uploads_1 = __importDefault(require("./routes/uploads"));
const pricing_1 = __importDefault(require("./routes/pricing"));
const webhooks_1 = __importDefault(require("./routes/webhooks"));
const admin_1 = __importDefault(require("./routes/admin"));
const designs_1 = __importDefault(require("./routes/designs"));
const jobRoutes_1 = __importDefault(require("./routes/jobRoutes"));
const health_1 = __importDefault(require("./routes/health"));
// Import middleware
const errorHandler_1 = require("./middleware/errorHandler");
const notFound_1 = require("./middleware/notFound");
// Import storage initialization
const supabaseStorage_1 = require("./services/supabaseStorage");
const app = (0, express_1.default)();
// Trust proxy - Railway uses a reverse proxy (one hop)
app.set('trust proxy', 1);
// Security middleware - Enhanced Helmet configuration with comprehensive security headers
app.use((0, helmet_1.default)({
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
                ...(env_1.env.NODE_ENV === 'development' ? ["http://localhost:3001", "http://localhost:3002"] : [])
            ],
            connectSrc: [
                "'self'",
                "https://dntnjlodfcojzgovikic.supabase.co",
                ...(env_1.env.NODE_ENV === 'development' ? ["http://localhost:3001", "http://localhost:3002"] : [])
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
app.use((_req, res, next) => {
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=(), payment=(self)');
    next();
});
// CORS configuration - allow both www and non-www versions
// Only include localhost in development to prevent security issues in production
const allowedOrigins = [
    env_1.env.FRONTEND_URL,
    'https://stolentee.com',
    'https://www.stolentee.com',
    ...(env_1.env.NODE_ENV === 'development' ? [
        'http://localhost:5173',
        'http://localhost:3003'
    ] : [])
];
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin)
            return callback(null, true);
        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        }
        else {
            logger_1.logger.warn('CORS request blocked', { origin });
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
const limiter = (0, express_rate_limit_1.rateLimit)({
    windowMs: env_1.env.RATE_LIMIT_WINDOW_MS,
    max: env_1.env.RATE_LIMIT_MAX_REQUESTS,
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api/', limiter);
// Strict rate limiter for expensive upload operations
const uploadLimiter = (0, express_rate_limit_1.rateLimit)({
    windowMs: 60 * 60 * 1000, // 1 hour window
    max: 10, // Max 10 uploads per hour per IP
    message: 'Too many uploads. Please wait before uploading again.',
    standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
    legacyHeaders: false, // Disable `X-RateLimit-*` headers
});
// Strict rate limiter for authentication endpoints to prevent brute force attacks
const authLimiter = (0, express_rate_limit_1.rateLimit)({
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
app.use('/api/webhooks/stripe', express_1.default.raw({ type: 'application/json' }));
// Body parsing middleware
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
// Serve uploaded files with CORS headers and CDN optimization
const uploadsPath = path_1.default.resolve(env_1.env.LOCAL_STORAGE_PATH || './uploads');
app.use('/uploads', (_req, res, next) => {
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
}, express_1.default.static(uploadsPath));
// Serve static product images with aggressive CDN caching
const assetsPath = path_1.default.resolve('./public/assets');
app.use('/assets', (_req, res, next) => {
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
}, express_1.default.static(assetsPath));
// Mount health check routes (must be before other routes for quick response)
app.use('/health', health_1.default);
// Legacy health check for backward compatibility
app.get('/health/detailed', async (_req, res) => {
    try {
        const os = await Promise.resolve().then(() => __importStar(require('os')));
        const pool = (await Promise.resolve().then(() => __importStar(require('./config/database')))).default;
        // Check database connectivity
        const dbStart = Date.now();
        await pool.query('SELECT 1');
        const dbLatency = Date.now() - dbStart;
        // Gather system metrics
        const metrics = {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            environment: env_1.env.NODE_ENV,
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
    }
    catch (error) {
        res.status(503).json({
            status: 'unhealthy',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});
// Cache headers middleware for API responses
// Add caching for GET requests to read-heavy endpoints
app.use('/api/products', (req, res, next) => {
    if (req.method === 'GET') {
        // Cache product data for 1 hour (products rarely change)
        res.setHeader('Cache-Control', 'public, max-age=3600, stale-while-revalidate=7200');
    }
    next();
});
app.use('/api/price', (req, res, next) => {
    if (req.method === 'GET') {
        // Cache pricing calculations for 5 minutes
        res.setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=600');
    }
    next();
});
// API Routes
app.use('/api/auth', auth_1.default);
app.use('/api/products', products_1.default);
app.use('/api/orders', orders_1.default);
app.use('/api/uploads', uploads_1.default);
app.use('/api/price', pricing_1.default);
app.use('/api/webhooks', webhooks_1.default);
app.use('/api/admin', admin_1.default);
app.use('/api/designs', designs_1.default);
app.use('/api/jobs', jobRoutes_1.default);
// Error handling
app.use(notFound_1.notFound);
app.use(errorHandler_1.errorHandler);
// Start server
const server = app.listen(env_1.env.PORT, async () => {
    logger_1.logger.info('Stolen Tee API Server started', {
        port: env_1.env.PORT,
        environment: env_1.env.NODE_ENV,
        apiUrl: `http://localhost:${env_1.env.PORT}`,
    });
    // Initialize Supabase Storage bucket
    await (0, supabaseStorage_1.initializeStorage)();
});
// Graceful shutdown handler
const shutdown = async (signal) => {
    logger_1.logger.info(`${signal} received, starting graceful shutdown`);
    server.close(async () => {
        logger_1.logger.info('HTTP server closed');
        try {
            await (0, database_1.closePool)();
            await (0, redis_1.closeRedis)();
            logger_1.logger.info('All resources cleaned up, exiting');
            process.exit(0);
        }
        catch (error) {
            logger_1.logger.error('Error during shutdown', {}, error);
            process.exit(1);
        }
    });
    // Force shutdown after 10 seconds
    setTimeout(() => {
        logger_1.logger.error('Forced shutdown after timeout');
        process.exit(1);
    }, 10000);
};
// Handle shutdown signals
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
// Handle uncaught errors
process.on('uncaughtException', (error) => {
    logger_1.logger.error('Uncaught exception', {}, error);
    process.exit(1);
});
process.on('unhandledRejection', (reason) => {
    logger_1.logger.error('Unhandled promise rejection', { reason: String(reason) });
    process.exit(1);
});
exports.default = app;
//# sourceMappingURL=index.js.map