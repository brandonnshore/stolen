# Worker Stuck Runbook

## Symptoms

- Jobs stuck in "processing" status for >10 minutes
- Queue length increasing (check database: `SELECT count(*) FROM jobs WHERE status = 'queued'`)
- Users report uploads not completing
- Worker logs show no activity

## Quick Diagnosis

**Check worker status:**

```bash
# 1. Check Railway worker service
# Railway Dashboard → Worker → Metrics
# CPU/Memory should be >0% if processing

# 2. Check worker logs
# Railway Dashboard → Worker → Logs
# Should see job processing messages

# 3. Check job queue length
psql "$DATABASE_URL" -c "
SELECT status, count(*)
FROM jobs
GROUP BY status;
"

# 4. Check for stuck jobs
psql "$DATABASE_URL" -c "
SELECT id, status, created_at, updated_at
FROM jobs
WHERE status = 'processing'
  AND updated_at < NOW() - INTERVAL '10 minutes'
ORDER BY updated_at;
"
```

**Common causes:**
- Worker crashed
- Worker stuck on a job
- Rate limited by external API
- Redis connection lost
- Memory/CPU maxed out

## Resolution Steps

### If worker crashed

**Check crash logs:**
```bash
# Railway Dashboard → Worker → Logs
# Look for: Error, crash, exit code

# Common crash reasons:
# - Out of memory (OOM)
# - Unhandled exception
# - Process killed by Railway
```

**Resolution:**
```bash
# 1. Restart worker
# Railway Dashboard → Worker → Settings → Restart

# 2. Monitor logs after restart
# Should see: "Worker started" and "Processing jobs"

# 3. If crashes again immediately:
# Check for bad job in queue
psql "$DATABASE_URL" -c "
SELECT id, type, data
FROM jobs
WHERE status = 'queued'
ORDER BY created_at
LIMIT 1;
"

# 4. If job is corrupted, mark as failed
psql "$DATABASE_URL" -c "
UPDATE jobs
SET status = 'failed',
    error = 'Corrupted job data - manual intervention',
    completed_at = NOW()
WHERE id = 'PROBLEM_JOB_ID';
"

# 5. Restart worker again
```

**Estimated Recovery Time:** 5-10 minutes

### If worker stuck on a job

**Identify stuck job:**
```bash
# Find job being processed for >10 min
psql "$DATABASE_URL" -c "
SELECT id, type, data, created_at, updated_at,
  NOW() - updated_at as stuck_duration
FROM jobs
WHERE status = 'processing'
ORDER BY updated_at
LIMIT 5;
"
```

**Resolution:**
```bash
# 1. Check worker logs for this job ID
# Railway Dashboard → Worker → Logs → Search for job ID

# 2. If Gemini API timeout:
# Job will auto-fail after 60 seconds
# BullMQ will retry (up to 3 times)

# 3. If infinite loop or real stuck:
# Manually fail the job
psql "$DATABASE_URL" -c "
UPDATE jobs
SET status = 'failed',
    error = 'Manual intervention - job stuck',
    completed_at = NOW()
WHERE id = 'STUCK_JOB_ID';
"

# 4. Restart worker to clear state
# Railway Dashboard → Worker → Settings → Restart

# 5. Check if job was retried
psql "$DATABASE_URL" -c "
SELECT * FROM jobs WHERE id = 'STUCK_JOB_ID';
"
```

**Estimated Recovery Time:** 10-15 minutes

### If rate limited by external API

**Check for rate limit errors:**
```bash
# Worker logs should show:
# "Rate limit exceeded" or "429 Too Many Requests"

# Check job failure reasons
psql "$DATABASE_URL" -c "
SELECT error, count(*)
FROM jobs
WHERE status = 'failed'
  AND created_at > NOW() - INTERVAL '1 hour'
GROUP BY error;
"
```

**Resolution:**
```bash
# 1. Identify which API is rate limiting
# Gemini: 60 requests/minute
# Remove.bg: Depends on plan (check dashboard)

# 2. Check current usage
# Gemini: Check Google Cloud Console
# Remove.bg: https://www.remove.bg/dashboard

# 3. If Gemini rate limited:
# Wait 1 minute, jobs will retry
# Or implement rate limiting in code

# 4. If Remove.bg credits exhausted:
# Purchase more credits
# Or wait for monthly reset
# Jobs will retry automatically

# 5. Monitor queue processing rate
# Should resume after rate limit window expires
```

**Estimated Recovery Time:** 1-60 minutes (depending on rate limit window)

### If Redis connection lost

**Check Redis status:**
```bash
# 1. Check Upstash console
open https://console.upstash.com

# 2. Check health endpoint
curl https://your-backend.up.railway.app/health
# Look for: "redis": { "status": "down" }

# 3. Check worker logs for Redis errors
# Railway Dashboard → Worker → Logs
# Look for: "Redis connection", "ECONNREFUSED"
```

**Resolution:**
```bash
# 1. If Upstash is down:
# Check status (no status page, but console shows health)
# Contact support if needed: support@upstash.com

# 2. If connection issue:
# Verify REDIS_URL is correct
# Railway Dashboard → Worker → Variables → REDIS_URL

# 3. Restart worker to reconnect
# Railway Dashboard → Worker → Settings → Restart

# 4. If Redis rate limit hit (free tier: 10k commands/day):
# Upgrade Upstash plan
# Or reduce polling frequency in worker
```

**Estimated Recovery Time:** 5-30 minutes

### If memory/CPU maxed out

**Check resource usage:**
```bash
# Railway Dashboard → Worker → Metrics
# Look for: Memory/CPU at 100%
```

**Resolution:**
```bash
# 1. If memory leak (memory slowly increasing):
# Restart worker (temporary fix)
# Railway Dashboard → Worker → Settings → Restart

# Investigate memory leak in code
# Check worker logs for large payloads
# Check for unclosed file handles

# 2. If legitimate high usage:
# Increase worker memory
# Railway Dashboard → Worker → Settings → Memory → Increase

# 3. If processing large images:
# Reduce max image size in upload validation
# Currently: 10MB limit

# 4. Implement concurrency limit
# In extractionWorker.ts, reduce concurrent jobs from 3 to 1
const worker = new Worker('extraction', processJob, {
  connection,
  concurrency: 1, // Process one job at a time
});
```

**Estimated Recovery Time:** 5 minutes (restart) or 1 hour (code fix)

## Verification

After implementing fix:

```bash
# 1. Check worker is processing jobs
# Railway Dashboard → Worker → Logs
# Should see: "Processing job: [id]"

# 2. Check queue is draining
psql "$DATABASE_URL" -c "
SELECT status, count(*)
FROM jobs
GROUP BY status;
"
# Queued count should be decreasing

# 3. Test new upload
# Frontend → Upload a shirt photo
# Check job completes within 2 minutes

# 4. Monitor for 15 minutes
# Ensure no new stuck jobs

# 5. Check error rate in Sentry
# Should show no worker errors
```

## Prevention

To prevent worker issues:

1. **Implement job timeouts:**
   ```typescript
   // In extractionWorker.ts
   const worker = new Worker('extraction', processJob, {
     connection,
     concurrency: 3,
     limiter: {
       max: 10,        // Max 10 jobs per minute
       duration: 60000 // Per minute
     }
   });
   ```

2. **Add health check for worker:**
   ```typescript
   // In backend health endpoint
   const queuedJobs = await queue.getWaitingCount();
   const processingJobs = await queue.getActiveCount();

   if (processingJobs === 0 && queuedJobs > 10) {
     // Worker likely stuck
     return { status: 'degraded', worker: 'stuck' };
   }
   ```

3. **Monitor queue metrics:**
   - Alert if queue length >20
   - Alert if oldest queued job >30 min
   - Alert if worker CPU/memory >80%

4. **Implement circuit breakers:**
   ```typescript
   // Wrap external API calls
   import { circuitBreakers } from '../utils/circuitBreaker';

   const result = await circuitBreakers.gemini.execute(async () => {
     return await geminiService.extractLogo(image);
   });
   ```

5. **Set up job cleanup:**
   ```typescript
   // Clean up old jobs weekly
   await queue.clean(24 * 60 * 60 * 1000, 100, 'completed'); // 24h
   await queue.clean(7 * 24 * 60 * 60 * 1000, 100, 'failed'); // 7 days
   ```

## Troubleshooting Specific Errors

### "CREDITS_EXHAUSTED" (Remove.bg)

```bash
# Check Remove.bg dashboard
open https://www.remove.bg/dashboard

# Purchase more credits or upgrade plan
# Jobs will auto-retry when credits available
```

### "Gemini API call timed out"

```bash
# Normal for very complex images
# Job will retry (up to 3 times)
# If persistent, increase timeout in geminiService.ts
```

### "Could not download image"

```bash
# Supabase Storage issue
# Check health endpoint: storage status
# Verify image exists in Supabase Storage dashboard
```

## Escalation

**Escalate if:**
- Worker stuck for >1 hour
- Queue backing up despite restart
- Memory leak confirmed but source unknown
- External API consistently failing

**Escalation Path:**
1. Check service status pages
2. Contact service support (Upstash, Google, Remove.bg)
3. Post in #engineering for help
4. Consider disabling worker temporarily (prevent further failures)

## Related Documentation

- [MONITORING.md](../MONITORING.md) - Worker health monitoring
- [INCIDENT_RESPONSE.md](../INCIDENT_RESPONSE.md) - General incident procedures
- [redis-down.md](./redis-down.md) - Redis connectivity issues
