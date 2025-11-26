# CRITICAL RELIABILITY FIXES - QUICK START GUIDE

**Priority:** URGENT - Do these before scaling to production
**Estimated Time:** 4-6 hours total
**Cost:** $0 (all free tier services)

---

## 1. SET UP SENTRY ERROR TRACKING (30 minutes)

### Why
Currently you have NO WAY to know when errors occur in production except by manually checking Railway logs. Sentry will email/Slack you immediately when errors happen.

### How
```bash
# Install Sentry
cd backend
npm install @sentry/node
```

Add to `/backend/src/index.ts` (after imports, before app setup):
```typescript
import * as Sentry from "@sentry/node";

// Initialize Sentry
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: env.NODE_ENV,
  tracesSampleRate: 0.1, // 10% of transactions
});

// Add Sentry request handler (after app creation)
app.use(Sentry.Handlers.requestHandler());

// Add Sentry error handler (BEFORE your error handlers)
app.use(Sentry.Handlers.errorHandler());
```

Get your DSN from:
1. Sign up at https://sentry.io (free tier)
2. Create new project → Node.js
3. Copy DSN (looks like: https://abc123@o123.ingest.sentry.io/456)
4. Add to Railway env vars: `SENTRY_DSN=your-dsn-here`

### Test
```bash
# Add a test error endpoint
app.get('/api/test-error', () => {
  throw new Error('Test error for Sentry');
});

# Visit http://localhost:5000/api/test-error
# Check Sentry dashboard for the error
```

---

## 2. IMPLEMENT COMPREHENSIVE HEALTH CHECKS (2 hours)

### Why
Current `/health` endpoint just checks if server is running. Need to verify database, Redis, and worker are actually working.

### How
Create `/backend/src/routes/health.ts`:
```typescript
import { Router, Request, Response } from 'express';
import pool from '../config/database';
import IORedis from 'ioredis';

const router = Router();

// Redis client for health check
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const redisClient = new IORedis(redisUrl);

router.get('/', async (_req: Request, res: Response) => {
  const checks = {
    database: 'unknown',
    redis: 'unknown',
    worker: 'unknown',
  };

  let healthy = true;

  // Check database
  try {
    await pool.query('SELECT 1');
    checks.database = 'ok';
  } catch (error) {
    checks.database = 'error';
    healthy = false;
  }

  // Check Redis
  try {
    await redisClient.ping();
    checks.redis = 'ok';
  } catch (error) {
    checks.redis = 'error';
    healthy = false;
  }

  // Check worker (look for jobs processed in last 5 minutes OR queue is empty)
  try {
    const result = await pool.query(`
      SELECT COUNT(*) as recent_jobs
      FROM jobs
      WHERE completed_at > NOW() - INTERVAL '5 minutes'
      OR status = 'running'
    `);
    const recentJobs = parseInt(result.rows[0].recent_jobs);

    // Also check if any jobs are stuck in 'running' for >10 minutes
    const stuckResult = await pool.query(`
      SELECT COUNT(*) as stuck_jobs
      FROM jobs
      WHERE status = 'running'
      AND updated_at < NOW() - INTERVAL '10 minutes'
    `);
    const stuckJobs = parseInt(stuckResult.rows[0].stuck_jobs);

    if (stuckJobs > 0) {
      checks.worker = 'degraded';
      healthy = false;
    } else {
      checks.worker = 'ok';
    }
  } catch (error) {
    checks.worker = 'error';
    healthy = false;
  }

  const status = healthy ? 200 : 503;
  res.status(status).json({
    status: healthy ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    checks,
  });
});

export default router;
```

Update `/backend/src/index.ts`:
```typescript
import healthRoutes from './routes/health';

// Replace existing health check with:
app.use('/health', healthRoutes);
```

### Test
```bash
curl http://localhost:5000/health

# Should return:
# {
#   "status": "ok",
#   "timestamp": "2025-11-26T...",
#   "uptime": 123.45,
#   "checks": {
#     "database": "ok",
#     "redis": "ok",
#     "worker": "ok"
#   }
# }
```

---

## 3. SET UP UPTIMEROBOT MONITORING (15 minutes)

### Why
You need to know IMMEDIATELY when your site goes down. UptimeRobot will email/SMS you within 5 minutes.

### How
1. Go to https://uptimerobot.com
2. Sign up (free tier)
3. Add monitors:

**Monitor 1: Frontend**
- Type: HTTP(s)
- URL: https://stolentee.com
- Name: Stolen Tee Frontend
- Interval: 5 minutes
- Alert: Email when down

**Monitor 2: Backend Health**
- Type: HTTP(s)
- URL: https://your-railway-backend.up.railway.app/health
- Name: Stolen Tee Backend
- Interval: 5 minutes
- Alert: Email when down
- Keyword: "ok" (must appear in response)

**Monitor 3: Backend API**
- Type: HTTP(s)
- URL: https://your-railway-backend.up.railway.app/api/products
- Name: Stolen Tee API
- Interval: 5 minutes
- Alert: Email when down

### Test
1. Stop your Railway backend
2. Wait 5 minutes
3. Should receive email from UptimeRobot
4. Restart backend
5. Should receive "back up" email

---

## 4. REPLACE CONSOLE.LOG WITH STRUCTURED LOGGER (3 hours)

### Why
Currently 75% of your logging uses console.log. This makes logs hard to search, filter, and analyze. Structured logging is critical for production.

### How
Search and replace pattern:

**Before:**
```typescript
console.log('Job completed:', jobId);
console.error('Upload failed:', error);
console.warn('Redis down, using fallback');
```

**After:**
```typescript
import { logger } from '../utils/logger';

logger.info('Job completed', { jobId });
logger.error('Upload failed', { jobId, userId }, error);
logger.warn('Redis down, using fallback', { redisUrl });
```

### Files to Update (in order of importance)
1. `/backend/src/workers/extractionWorker.ts` (13 occurrences)
2. `/backend/src/middleware/errorHandler.ts` (5 occurrences)
3. `/backend/src/services/jobService.ts` (7 occurrences)
4. `/backend/src/services/geminiService.ts` (7 occurrences)
5. `/backend/src/services/backgroundRemovalService.ts` (9 occurrences)

### Pattern
```typescript
// BAD
console.log('Processing job:', jobId);

// GOOD
logger.info('Processing job', { jobId });

// BAD
console.error('Error:', error.message);

// GOOD
logger.error('Job processing failed', { jobId }, error);

// BAD
console.log('✅ Job completed');

// GOOD
logger.info('Job completed successfully', { jobId, duration });
```

---

## 5. CREATE INCIDENT RUNBOOKS (4 hours)

### Why
When things break at 2am, you need step-by-step instructions. Don't rely on memory.

### How
Create `/backend/docs/runbooks/` directory:

**1. database-down.md**
```markdown
# Database Down Runbook

## Symptoms
- Health check shows database: "error"
- All API requests failing with database errors
- Cannot connect to Supabase

## Diagnosis
1. Check Supabase status: https://status.supabase.com
2. Check Railway logs for connection errors
3. Try connecting manually: `psql $DATABASE_URL`

## Resolution
1. If Supabase is down: Wait for their team to resolve
2. If credentials wrong: Verify DATABASE_URL in Railway env vars
3. If connection pool exhausted: Restart Railway backend service

## Prevention
- Monitor Supabase status page
- Set up connection pool alerts
- Ensure max_connections is configured properly
```

**2. worker-stuck.md**
```markdown
# Worker Stuck Runbook

## Symptoms
- Health check shows worker: "degraded"
- Jobs stuck in "running" status for >10 minutes
- No jobs completing

## Diagnosis
1. Check Railway worker logs
2. Query stuck jobs: `SELECT * FROM jobs WHERE status='running' AND updated_at < NOW() - INTERVAL '10 minutes'`
3. Check Redis connection

## Resolution
1. Restart Railway worker service
2. Failed jobs will retry automatically
3. Check for jobs that need manual cleanup

## Prevention
- Monitor worker health endpoint
- Set up alerts for stuck jobs
- Review worker logs weekly
```

**3. high-traffic.md**
```markdown
# High Traffic Spike Runbook

## Symptoms
- Slow response times
- Railway CPU/memory at 80%+
- Rate limit errors increasing

## Diagnosis
1. Check Railway metrics dashboard
2. Check Uptime Robot response times
3. Review recent traffic patterns

## Resolution
**Immediate:**
1. Increase rate limits temporarily if legitimate traffic
2. Scale up Railway instance (upgrade plan)

**Long-term:**
1. Implement request queueing
2. Add CDN for static assets
3. Optimize slow database queries

## Prevention
- Set up alerts for CPU >70%
- Monitor traffic patterns
- Plan for Black Friday / viral events
```

**4. redis-down.md**
```markdown
# Redis Down Runbook

## Symptoms
- Health check shows redis: "error"
- Worker failing to start
- Cannot add jobs to queue

## Diagnosis
1. Check Upstash status dashboard
2. Verify REDIS_URL in Railway env vars
3. Try connecting: `redis-cli -u $REDIS_URL ping`

## Resolution
1. If Upstash down: Wait for recovery
2. If credentials wrong: Update REDIS_URL
3. If connection limit hit: Upgrade Upstash plan

## Prevention
- Monitor Upstash dashboard weekly
- Set up connection count alerts
- Document connection pool settings
```

**5. security-incident.md**
```markdown
# Security Incident Runbook

## If API Keys Compromised

### Immediate Actions (within 5 minutes)
1. Rotate JWT_SECRET in Railway
2. Revoke Stripe API keys, generate new ones
3. Rotate Gemini API key
4. Rotate Remove.bg API key
5. Force all users to re-login

### Investigation (within 1 hour)
1. Check Railway logs for suspicious activity
2. Review Stripe transactions for fraud
3. Check database for unauthorized access
4. Review all API calls in last 24 hours

### Communication (within 2 hours)
1. Email affected users
2. Post on status page
3. File incident report

## If Database Compromised
1. Immediately block public access via Supabase dashboard
2. Create backup of current state
3. Review logs for SQL injection attempts
4. Change all database credentials
5. Review and patch vulnerable endpoints

## Prevention
- Never commit .env files
- Rotate API keys quarterly
- Use environment variables for all secrets
- Enable 2FA on all service accounts
```

---

## QUICK TESTING CHECKLIST

After implementing all fixes, verify:

- [ ] Sentry receives test error
- [ ] Health check returns detailed status
- [ ] UptimeRobot monitors are active
- [ ] No console.log calls remain (search codebase)
- [ ] All 5 runbooks exist in `/docs/runbooks/`
- [ ] Railway deployment still works
- [ ] Worker still processes jobs
- [ ] Upload flow still works end-to-end

---

## NEXT STEPS AFTER CRITICAL FIXES

Once these are done, you have a production-ready monitoring foundation. Next priorities:

1. Set up automated Supabase Storage backups (weekly)
2. Implement circuit breakers for external APIs
3. Add application metrics endpoint (/api/metrics)
4. Create custom monitoring dashboard
5. Set up log aggregation service

---

**Need Help?**
- Sentry docs: https://docs.sentry.io/platforms/node/
- UptimeRobot docs: https://uptimerobot.com/help/
- Railway docs: https://docs.railway.app/

**Estimated Total Time:** 4-6 hours
**Estimated Total Cost:** $0 (all free tier)
**Impact:** Know about production issues within 5 minutes instead of hours/days
