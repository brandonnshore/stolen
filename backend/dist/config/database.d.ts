import { Pool, QueryResult, PoolClient } from 'pg';
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
declare const pool: Pool;
/**
 * Execute a parameterized query
 * @param text - SQL query text with placeholders ($1, $2, etc.)
 * @param params - Query parameters (prevents SQL injection)
 * @returns Query result
 */
export declare const query: (text: string, params?: unknown[]) => Promise<QueryResult>;
/**
 * Get a database client from the pool for transactions
 * Remember to call client.release() when done
 * @returns Database client
 */
export declare const getClient: () => Promise<PoolClient>;
/**
 * Gracefully close all database connections
 * Call this during application shutdown
 */
export declare const closePool: () => Promise<void>;
export default pool;
//# sourceMappingURL=database.d.ts.map