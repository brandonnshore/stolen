import { Router, Request, Response } from 'express';
import { query } from '../config/database';
import { logger } from '../utils/logger';
import { env } from '../config/env';

const router = Router();

interface HealthCheckResult {
  status: 'ok' | 'degraded' | 'down';
  latency?: number;
  error?: string;
}

interface HealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  checks: {
    database: HealthCheckResult;
    redis: HealthCheckResult;
    storage: HealthCheckResult;
    memory: HealthCheckResult;
    disk: HealthCheckResult;
  };
}

/**
 * Check database connectivity and latency
 */
async function checkDatabase(): Promise<HealthCheckResult> {
  const start = Date.now();
  try {
    await query('SELECT 1 as health_check');
    const latency = Date.now() - start;

    if (latency > 1000) {
      return { status: 'degraded', latency };
    }
    return { status: 'ok', latency };
  } catch (error) {
    logger.error('Database health check failed', {}, error as Error);
    return { status: 'down', error: (error as Error).message };
  }
}

/**
 * Check Redis connectivity (via BullMQ connection)
 */
async function checkRedis(): Promise<HealthCheckResult> {
  const start = Date.now();
  try {
    // Import Redis client from config
    const { getRedisClient } = await import('../config/redis');
    const redis = getRedisClient();

    // Ping Redis
    await redis.ping();
    const latency = Date.now() - start;

    if (latency > 500) {
      return { status: 'degraded', latency };
    }
    return { status: 'ok', latency };
  } catch (error) {
    logger.error('Redis health check failed', {}, error as Error);
    return { status: 'down', error: (error as Error).message };
  }
}

/**
 * Check Supabase Storage connectivity
 */
async function checkStorage(): Promise<HealthCheckResult> {
  const start = Date.now();
  try {
    if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_KEY) {
      return { status: 'down', error: 'Supabase credentials not configured' };
    }

    // Import and test Supabase connection
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY);

    // Try to list buckets
    const { data, error } = await supabase.storage.listBuckets();

    if (error) throw error;

    const latency = Date.now() - start;

    if (latency > 1000) {
      return { status: 'degraded', latency };
    }

    return { status: 'ok', latency };
  } catch (error) {
    logger.error('Storage health check failed', {}, error as Error);
    return { status: 'down', error: (error as Error).message };
  }
}

/**
 * Check memory usage
 */
function checkMemory(): HealthCheckResult {
  const memUsage = process.memoryUsage();
  const heapUsedMB = memUsage.heapUsed / 1024 / 1024;
  const heapTotalMB = memUsage.heapTotal / 1024 / 1024;
  const usagePercent = (heapUsedMB / heapTotalMB) * 100;

  if (usagePercent > 90) {
    return { status: 'down', latency: usagePercent };
  } else if (usagePercent > 80) {
    return { status: 'degraded', latency: usagePercent };
  }
  return { status: 'ok', latency: usagePercent };
}

/**
 * Check disk space (placeholder - Railway manages this)
 */
function checkDisk(): HealthCheckResult {
  // Railway manages disk space, so we'll always return OK
  // In a self-hosted environment, you'd check actual disk usage
  return { status: 'ok', latency: 0 };
}

/**
 * Comprehensive health check endpoint
 * Returns 200 if all critical services are healthy
 * Returns 503 if any critical service is down
 */
router.get('/', async (_req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    const [database, redis, storage, memory, disk] = await Promise.all([
      checkDatabase(),
      checkRedis(),
      checkStorage(),
      checkMemory(),
      checkDisk(),
    ]);

    const checks = { database, redis, storage, memory, disk };

    // Determine overall status
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

    // If any critical service is down, mark as unhealthy
    if (database.status === 'down' || redis.status === 'down') {
      overallStatus = 'unhealthy';
    }
    // If any service is degraded, mark as degraded
    else if (
      database.status === 'degraded' ||
      redis.status === 'degraded' ||
      storage.status === 'degraded' ||
      memory.status === 'degraded'
    ) {
      overallStatus = 'degraded';
    }

    const response: HealthResponse = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      environment: env.NODE_ENV,
      checks,
    };

    const statusCode = overallStatus === 'unhealthy' ? 503 : 200;
    const duration = Date.now() - startTime;

    logger.info('Health check completed', {
      status: overallStatus,
      duration: `${duration}ms`,
      checks: Object.entries(checks).map(([name, check]) => ({
        name,
        status: check.status,
      })),
    });

    res.status(statusCode).json(response);
  } catch (error) {
    logger.error('Health check error', {}, error as Error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check failed',
      message: (error as Error).message,
    });
  }
});

/**
 * Liveness probe - just checks if the process is running
 * Used by Kubernetes/Railway to know if the process needs restarting
 */
router.get('/live', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
  });
});

/**
 * Readiness probe - checks if the service is ready to accept traffic
 * Used by load balancers to know if this instance should receive requests
 */
router.get('/ready', async (_req: Request, res: Response) => {
  try {
    // Check if database is accessible
    const dbCheck = await checkDatabase();

    if (dbCheck.status === 'down') {
      return res.status(503).json({
        status: 'not ready',
        timestamp: new Date().toISOString(),
        reason: 'Database unavailable',
      });
    }

    res.status(200).json({
      status: 'ready',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({
      status: 'not ready',
      timestamp: new Date().toISOString(),
      error: (error as Error).message,
    });
  }
});

export default router;
