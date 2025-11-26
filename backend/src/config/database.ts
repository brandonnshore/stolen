import { Pool, QueryResult, PoolClient } from 'pg';
import { env, isProduction } from './env';
import { logger } from '../utils/logger';

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
const pool = new Pool({
  connectionString: env.DATABASE_URL,
  ssl: isProduction ? { rejectUnauthorized: false } : false,

  // Connection pool limits (optimized for Supabase)
  max: isProduction ? 15 : 5,  // Lower max for Supabase shared DB
  min: 2,                       // Keep minimum warm connections

  // Aggressive timeout for faster connection recycling
  idleTimeoutMillis: 10000,     // 10s (was 30s) - return to pool faster
  connectionTimeoutMillis: 5000, // 5s (was 2s) - fail faster

  // Query timeouts (prevent runaway queries)
  statement_timeout: 30000,     // 30s max per query
  query_timeout: 10000,         // 10s application timeout (most queries < 100ms)

  // Graceful shutdown
  allowExitOnIdle: false,
});

// Connection pool event monitoring (for infrastructure optimization)
pool.on('connect', (client) => {
  logger.debug('Database connection established', {
    totalCount: pool.totalCount,
    idleCount: pool.idleCount,
    waitingCount: pool.waitingCount,
  });
});

pool.on('acquire', (client) => {
  logger.debug('Connection acquired from pool', {
    totalCount: pool.totalCount,
    idleCount: pool.idleCount,
    waitingCount: pool.waitingCount,
  });
});

pool.on('error', (err: Error) => {
  logger.error('Unexpected database connection error', {
    totalCount: pool.totalCount,
    idleCount: pool.idleCount,
  }, err);

  // In production, we should not exit immediately
  // Instead, let the process manager handle restarts
  if (isProduction) {
    logger.error('Database connection lost - monitoring for recovery');
  } else {
    process.exit(-1);
  }
});

pool.on('remove', (client) => {
  logger.warn('Connection removed from pool', {
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
export const query = async (
  text: string,
  params?: unknown[]
): Promise<QueryResult> => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    logger.query(text, duration, res.rowCount);
    return res;
  } catch (error) {
    const duration = Date.now() - start;
    logger.error('Database query failed', {
      query: text.substring(0, 100),
      duration: `${duration}ms`,
    }, error as Error);
    throw error;
  }
};

/**
 * Get a database client from the pool for transactions
 * Remember to call client.release() when done
 * @returns Database client
 */
export const getClient = async (): Promise<PoolClient> => {
  return pool.connect();
};

/**
 * Gracefully close all database connections
 * Call this during application shutdown
 */
export const closePool = async (): Promise<void> => {
  logger.info('Closing database connection pool');
  await pool.end();
  logger.info('Database connection pool closed');
};

export default pool;
