# Database Down Runbook

## Symptoms

- Health check endpoint returns 503 with database error
- Sentry shows many database connection errors
- Backend logs show "Connection refused" or "Connection timeout"
- Users cannot log in, place orders, or access any data

## Quick Diagnosis

**Check if database is actually down:**

```bash
# 1. Check health endpoint
curl https://your-backend.up.railway.app/health

# Look for:
# "database": { "status": "down", "error": "..." }

# 2. Try connecting directly
psql "$DATABASE_URL"

# 3. Check Supabase status page
open https://status.supabase.com
```

**Common causes:**
- Supabase outage (rare)
- Connection pool exhausted
- Database disk full
- Invalid credentials
- Network issue

## Resolution Steps

### If Supabase is down (Supabase status page shows incident)

```bash
# 1. Post on status page
"We're experiencing database connectivity issues due to our database
provider experiencing an outage. We're monitoring the situation and
will update you as soon as service is restored."

# 2. Monitor Supabase status
# Check every 5 minutes: https://status.supabase.com

# 3. Once Supabase is back up:
# Restart backend to reset connection pool
# Railway Dashboard → Backend → Settings → Restart

# 4. Verify recovery
curl https://your-backend.up.railway.app/health
```

**Estimated Recovery Time:** Depends on Supabase (usually <30 min)

### If connection pool exhausted

**Check connections:**
```bash
# Connect to database
psql "$DATABASE_URL"

# Check current connections
SELECT count(*) as connections, state
FROM pg_stat_activity
GROUP BY state;

# If connections > 15 (pool limit), we have a leak
```

**Resolution:**
```bash
# 1. Kill idle connections (older than 5 minutes)
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE state = 'idle'
  AND state_change < now() - interval '5 minutes'
  AND pid != pg_backend_pid();

# 2. Restart backend to reset pool
# Railway Dashboard → Backend → Settings → Restart

# 3. Monitor for leak
# If it happens again within 24 hours, we have a connection leak in code
# Check for:
# - Database queries without pool.end()
# - Long-running transactions
# - Unclosed connections in error handlers
```

**Estimated Recovery Time:** 5-10 minutes

### If database disk full

**Check disk usage:**
```bash
# Supabase Dashboard → Database → Usage
# Look for: Disk space >90%
```

**Resolution:**
```bash
# 1. Identify large tables
psql "$DATABASE_URL" -c "
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
LIMIT 10;
"

# 2. Clean up old data (example: old failed jobs)
psql "$DATABASE_URL" -c "
DELETE FROM jobs
WHERE status = 'failed'
  AND created_at < NOW() - INTERVAL '30 days';
"

# 3. Clean up old job results
psql "$DATABASE_URL" -c "
DELETE FROM jobs
WHERE status = 'completed'
  AND created_at < NOW() - INTERVAL '7 days';
"

# 4. Vacuum to reclaim space
psql "$DATABASE_URL" -c "VACUUM FULL;"

# 5. If still full, upgrade Supabase plan
# Supabase Dashboard → Settings → Billing → Upgrade
```

**Estimated Recovery Time:** 30 minutes to 2 hours

### If invalid credentials

**Check credentials:**
```bash
# 1. Verify DATABASE_URL is correct
# Railway Dashboard → Backend → Variables → DATABASE_URL

# 2. Test connection with current credentials
psql "$DATABASE_URL"

# 3. If connection fails, regenerate password
# Supabase Dashboard → Settings → Database → Reset database password

# 4. Update DATABASE_URL in Railway
# Railway Dashboard → Backend → Variables → DATABASE_URL → Update

# 5. Restart backend
# Railway Dashboard → Backend → Settings → Restart
```

**Estimated Recovery Time:** 10-15 minutes

### If network issue

```bash
# 1. Check if Railway can reach Supabase
# Railway Dashboard → Backend → Logs
# Look for network errors

# 2. Try from different network
# If works locally but not from Railway = Railway network issue
# Contact Railway support: team@railway.app

# 3. Check Supabase IP allowlist
# Supabase Dashboard → Settings → Database → Network restrictions
# Ensure Railway IPs are allowed (or no restrictions)
```

**Estimated Recovery Time:** 15 minutes (if config issue) or 1+ hour (if Railway issue)

## Verification

After implementing fix, verify:

```bash
# 1. Health check returns 200 OK
curl https://your-backend.up.railway.app/health
# Should show: "database": { "status": "ok", "latency": <50ms }

# 2. Backend logs show no errors
# Railway Dashboard → Backend → Logs

# 3. Test database operations
# Try logging in as a user
# Try placing a test order

# 4. Check Sentry for errors
# Should show no database errors in last 5 minutes

# 5. Monitor for 15 minutes
# Ensure issue doesn't recur
```

## Prevention

To prevent database downtime:

1. **Monitor connection count:**
   - Set up alert if connections >12 (80% of pool)
   - Add to health check: connections count

2. **Implement connection pooling best practices:**
   ```typescript
   // Always use pool, never create new clients
   const result = await pool.query('SELECT ...');

   // Don't do this:
   // const client = new Client();
   // await client.connect();
   // ... forget to disconnect
   ```

3. **Regular cleanup:**
   - Schedule weekly job cleanup (delete old completed/failed jobs)
   - Monitor database size weekly
   - Set up alert if disk >80%

4. **Database backups:**
   - Verify daily backups are working
   - Test restore monthly
   - Keep 30 days of backups

5. **Upgrade plan proactively:**
   - Before hitting disk/connection limits
   - Supabase free tier: 500MB database, 20 connections
   - Monitor usage weekly

## Escalation

**Escalate to Supabase support if:**
- Outage lasts >30 minutes
- Disk full and cleanup doesn't help
- Connection issues persist after restart
- Corruption detected

**Supabase Support:**
- Email: support@supabase.io
- Dashboard: Click "Help" → "Support"
- Include: Project ID, timestamp, error messages

## Related Documentation

- [BACKUPS.md](../BACKUPS.md) - How to restore from backup
- [MONITORING.md](../MONITORING.md) - Health check details
- [INCIDENT_RESPONSE.md](../INCIDENT_RESPONSE.md) - General incident procedures
