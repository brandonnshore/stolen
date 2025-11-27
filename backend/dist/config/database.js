"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.closePool = exports.getClient = exports.query = void 0;
const pg_1 = require("pg");
const env_1 = require("./env");
const logger_1 = require("../utils/logger");
/**
 * PostgreSQL connection pool configuration
 * Optimized for Supabase and 1,000 concurrent users
 *
 * Performance optimizations:
 * - Reduced max connections (15 vs 20) for Supabase shared limits
 * - Faster idle timeout (10s vs 30s) for connection recycling
 * - Statement timeout to prevent long-running queries
 * - Query timeout for application-level control
 */
const pool = new pg_1.Pool({
    connectionString: env_1.env.DATABASE_URL,
    ssl: env_1.isProduction ? { rejectUnauthorized: false } : false,
    // Connection pool limits (optimized for Supabase)
    max: env_1.isProduction ? 15 : 5, // Lower max for Supabase shared DB
    min: 2, // Keep minimum warm connections
    // Aggressive timeout for faster connection recycling
    idleTimeoutMillis: 10000, // 10s (was 30s) - return to pool faster
    connectionTimeoutMillis: 5000, // 5s (was 2s) - fail faster
    // Query timeouts (prevent runaway queries)
    statement_timeout: 30000, // 30s max per query
    query_timeout: 10000, // 10s application timeout (most queries < 100ms)
    // Graceful shutdown
    allowExitOnIdle: false,
});
// Connection pool event monitoring (for infrastructure optimization)
pool.on('connect', (client) => {
    logger_1.logger.debug('Database connection established', {
        totalCount: pool.totalCount,
        idleCount: pool.idleCount,
        waitingCount: pool.waitingCount,
    });
});
pool.on('acquire', (client) => {
    logger_1.logger.debug('Connection acquired from pool', {
        totalCount: pool.totalCount,
        idleCount: pool.idleCount,
        waitingCount: pool.waitingCount,
    });
});
pool.on('error', (err) => {
    logger_1.logger.error('Unexpected database connection error', {
        totalCount: pool.totalCount,
        idleCount: pool.idleCount,
    }, err);
    // In production, we should not exit immediately
    // Instead, let the process manager handle restarts
    if (env_1.isProduction) {
        logger_1.logger.error('Database connection lost - monitoring for recovery');
    }
    else {
        process.exit(-1);
    }
});
pool.on('remove', (client) => {
    logger_1.logger.warn('Connection removed from pool', {
        totalCount: pool.totalCount,
        idleCount: pool.idleCount,
    });
});
/**
 * Execute a parameterized query
 * @param text - SQL query text with placeholders ($1, $2, etc.)
 * @param params - Query parameters (prevents SQL injection)
 * @returns Query result
 */
const query = async (text, params) => {
    const start = Date.now();
    try {
        const res = await pool.query(text, params);
        const duration = Date.now() - start;
        logger_1.logger.query(text, duration, res.rowCount);
        return res;
    }
    catch (error) {
        const duration = Date.now() - start;
        logger_1.logger.error('Database query failed', {
            query: text.substring(0, 100),
            duration: `${duration}ms`,
        }, error);
        throw error;
    }
};
exports.query = query;
/**
 * Get a database client from the pool for transactions
 * Remember to call client.release() when done
 * @returns Database client
 */
const getClient = async () => {
    return pool.connect();
};
exports.getClient = getClient;
/**
 * Gracefully close all database connections
 * Call this during application shutdown
 */
const closePool = async () => {
    logger_1.logger.info('Closing database connection pool');
    await pool.end();
    logger_1.logger.info('Database connection pool closed');
};
exports.closePool = closePool;
exports.default = pool;
//# sourceMappingURL=database.js.map