# Disaster Recovery Plan
## Stolen Tee - Business Continuity & Data Protection

Last Updated: 2025-11-27

---

## Table of Contents
1. [Overview](#overview)
2. [Backup Procedures](#backup-procedures)
3. [Restore Procedures](#restore-procedures)
4. [Incident Response](#incident-response)
5. [Data Loss Prevention](#data-loss-prevention)
6. [Failover Strategies](#failover-strategies)
7. [Contact Information](#contact-information)

---

## Overview

### Recovery Objectives

**RTO (Recovery Time Objective):** < 1 hour
- Maximum acceptable downtime before business impact

**RPO (Recovery Point Objective):** < 24 hours
- Maximum acceptable data loss

### Critical Systems

| System | Priority | RTO | RPO | Backup Frequency |
|--------|----------|-----|-----|------------------|
| Database (PostgreSQL) | CRITICAL | 30 min | 24 hours | Daily automated |
| Storage (Supabase) | HIGH | 1 hour | 24 hours | Manual weekly |
| Application Code | HIGH | 15 min | Real-time | Git (continuous) |
| Environment Config | MEDIUM | 30 min | 24 hours | Manual backup |
| Redis Cache | LOW | 5 min | N/A | Not backed up (ephemeral) |

---

## Backup Procedures

### Database Backups

#### Automated Daily Backups (Supabase)

Supabase Free tier includes:
- Automatic daily backups (retained for 7 days)
- Point-in-time recovery unavailable on free tier

**Verify Backup Status:**
```bash
# Check Supabase dashboard
# Settings → Database → Backups
# https://app.supabase.com/project/_/settings/database
```

#### Manual Database Backup

**When to perform:**
- Before major deployments
- Before schema migrations
- Weekly full backup (Sunday 2 AM UTC)
- Before any destructive operations

**Backup Script:**
```bash
#!/bin/bash
# backup-database.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="./backups/database"
BACKUP_FILE="stolen_tee_db_${DATE}.sql"

# Create backup directory
mkdir -p $BACKUP_DIR

# Get database URL from environment
source .env
DB_URL=$DATABASE_URL

# Perform backup using pg_dump
pg_dump "$DB_URL" \
  --format=custom \
  --no-owner \
  --no-privileges \
  --file="$BACKUP_DIR/$BACKUP_FILE"

# Compress backup
gzip "$BACKUP_DIR/$BACKUP_FILE"

# Upload to secure storage (S3 or equivalent)
# aws s3 cp "$BACKUP_DIR/$BACKUP_FILE.gz" s3://stolen-tee-backups/database/

# Keep only last 30 days of backups locally
find $BACKUP_DIR -name "*.sql.gz" -mtime +30 -delete

echo "✅ Database backup completed: $BACKUP_FILE.gz"
```

**Run backup:**
```bash
chmod +x backup-database.sh
./backup-database.sh
```

#### Schema-Only Backup

For version control and migration tracking:

```bash
# Export schema only (no data)
pg_dump "$DATABASE_URL" \
  --schema-only \
  --no-owner \
  --no-privileges \
  --file="schema_$(date +%Y%m%d).sql"

# Commit to git for version tracking
git add schema_*.sql
git commit -m "Database schema snapshot $(date +%Y-%m-%d)"
```

### Storage Backups

#### User Uploads (Supabase Storage)

**Current Status:**
- 62MB of user uploads
- No automated backup on free tier
- Manual backup recommended weekly

**Manual Backup Script:**
```bash
#!/bin/bash
# backup-storage.sh

DATE=$(date +%Y%m%d)
BACKUP_DIR="./backups/storage"

mkdir -p $BACKUP_DIR

# Download all files from Supabase Storage
# Note: Requires Supabase CLI
supabase storage download --project $SUPABASE_PROJECT_ID \
  --bucket shirt-photos \
  --local-path "$BACKUP_DIR/shirt-photos-$DATE"

# Create archive
tar -czf "$BACKUP_DIR/shirt-photos-$DATE.tar.gz" \
  "$BACKUP_DIR/shirt-photos-$DATE"

# Remove temporary directory
rm -rf "$BACKUP_DIR/shirt-photos-$DATE"

# Upload to backup storage
# aws s3 cp "$BACKUP_DIR/shirt-photos-$DATE.tar.gz" \
#   s3://stolen-tee-backups/storage/

echo "✅ Storage backup completed: $BACKUP_DIR/shirt-photos-$DATE.tar.gz"
```

**Automated Backup (Future):**
```yaml
# GitHub Actions workflow (.github/workflows/backup.yml)
name: Weekly Backup
on:
  schedule:
    - cron: '0 2 * * 0'  # Every Sunday at 2 AM UTC

jobs:
  backup:
    runs-on: ubuntu-latest
    steps:
      - name: Backup Database
        run: ./scripts/backup-database.sh
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}

      - name: Backup Storage
        run: ./scripts/backup-storage.sh
        env:
          SUPABASE_PROJECT_ID: ${{ secrets.SUPABASE_PROJECT_ID }}

      - name: Upload to S3
        run: |
          aws s3 sync ./backups s3://stolen-tee-backups/
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
```

### Configuration Backups

**Environment Variables:**
```bash
# Backup all environment variables (sanitized)
# backend/.env.backup

# Copy to secure location
cp backend/.env backend/.env.backup.$(date +%Y%m%d)

# Store in secure password manager or vault
# HashiCorp Vault, AWS Secrets Manager, or 1Password
```

**Important: NEVER commit `.env` files to git!**

---

## Restore Procedures

### Database Restore

#### Restore from Supabase Backup

**Via Dashboard:**
1. Go to Supabase dashboard
2. Settings → Database → Backups
3. Select backup to restore
4. Click "Restore" and confirm
5. Wait 5-10 minutes for restoration

**Note:** This will OVERWRITE current database!

#### Restore from Manual Backup

```bash
#!/bin/bash
# restore-database.sh

BACKUP_FILE=$1

if [ -z "$BACKUP_FILE" ]; then
  echo "Usage: ./restore-database.sh <backup-file.sql.gz>"
  exit 1
fi

# Decompress backup
gunzip -c "$BACKUP_FILE" > temp_restore.sql

# Restore to database
# WARNING: This will OVERWRITE existing data!
read -p "⚠️  This will OVERWRITE the database. Continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
  echo "Restore cancelled"
  exit 0
fi

# Drop and recreate database (if custom format)
pg_restore \
  --clean \
  --if-exists \
  --no-owner \
  --no-privileges \
  --dbname="$DATABASE_URL" \
  temp_restore.sql

# Or use psql for plain SQL dumps
# psql "$DATABASE_URL" < temp_restore.sql

# Clean up
rm temp_restore.sql

echo "✅ Database restored from $BACKUP_FILE"
echo "⚠️  Remember to run migrations if schema changed!"
```

**Verify Restoration:**
```sql
-- Check row counts
SELECT 'users' as table_name, COUNT(*) FROM users
UNION ALL
SELECT 'orders', COUNT(*) FROM orders
UNION ALL
SELECT 'designs', COUNT(*) FROM designs;

-- Check latest records
SELECT * FROM orders ORDER BY created_at DESC LIMIT 5;
```

### Storage Restore

```bash
#!/bin/bash
# restore-storage.sh

BACKUP_FILE=$1

if [ -z "$BACKUP_FILE" ]; then
  echo "Usage: ./restore-storage.sh <backup-file.tar.gz>"
  exit 1
fi

# Extract backup
tar -xzf "$BACKUP_FILE" -C /tmp/

# Upload to Supabase Storage
# Note: Requires Supabase CLI
supabase storage upload \
  --project $SUPABASE_PROJECT_ID \
  --bucket shirt-photos \
  --local-path /tmp/shirt-photos-*

echo "✅ Storage restored from $BACKUP_FILE"
```

### Application Restore

**Rollback Deployment:**

```bash
# Railway automatic rollback
railway rollback

# Or via Railway dashboard:
# 1. Go to Deployments tab
# 2. Find previous stable deployment
# 3. Click "Redeploy"
```

**Restore from Git:**
```bash
# Find last known good commit
git log --oneline

# Rollback to specific commit
git checkout <commit-hash>

# Force push to trigger redeployment
git push origin main --force

# Or revert commit (safer)
git revert <bad-commit-hash>
git push origin main
```

---

## Incident Response

### Incident Severity Levels

| Level | Description | Response Time | Example |
|-------|-------------|---------------|---------|
| **P0 - Critical** | Complete service outage | < 15 minutes | Database down, API unreachable |
| **P1 - High** | Major feature broken | < 1 hour | Payment processing failing |
| **P2 - Medium** | Minor feature impacted | < 4 hours | Image upload slow |
| **P3 - Low** | Cosmetic issue | < 24 hours | UI glitch on specific page |

### Incident Response Procedure

#### 1. Detection & Alerting

**Automated Alerts:**
- Sentry: Uncaught exceptions
- UptimeRobot: Service downtime (> 5 minutes)
- Railway: Service crashes or restarts

**Manual Detection:**
- User reports via support
- Social media mentions
- Manual testing

#### 2. Initial Response (< 5 minutes)

```markdown
# Incident Response Checklist

## Phase 1: Assess (< 5 min)
- [ ] Confirm incident (reproduce or verify)
- [ ] Determine severity level (P0-P3)
- [ ] Check health endpoints: /health, /health/detailed
- [ ] Check Sentry for errors
- [ ] Check Railway logs for crashes
- [ ] Notify team in Slack #incidents channel

## Phase 2: Triage (< 15 min)
- [ ] Identify root cause
  - Database issue? Check connection pool
  - API issue? Check Railway status
  - Frontend issue? Check Vercel deployment
  - Third-party? Check Remove.bg, Stripe status
- [ ] Document findings in incident log
- [ ] Estimate time to resolution

## Phase 3: Mitigation (< 30 min)
- [ ] Apply immediate fix if available
- [ ] Rollback deployment if needed
- [ ] Enable maintenance mode if necessary
- [ ] Communicate status to users (if P0/P1)

## Phase 4: Resolution
- [ ] Deploy permanent fix
- [ ] Verify fix in production
- [ ] Monitor for 30 minutes
- [ ] Update incident status

## Phase 5: Post-Mortem (< 24 hours)
- [ ] Write incident report
- [ ] Identify prevention measures
- [ ] Update runbooks
- [ ] Schedule follow-up tasks
```

#### 3. Common Incidents & Solutions

**Database Connection Errors**
```bash
# Symptoms: "too many clients", "connection timeout"
# Cause: Connection pool exhausted

# Quick fix: Restart Railway service
railway restart

# Long-term: Optimize connection pool
# Check backend/src/config/database.ts
```

**Service Unavailable (503)**
```bash
# Symptoms: All endpoints returning 503
# Cause: Database down or service crashed

# Check health endpoint
curl https://api.stolentee.com/health/detailed

# Check Railway logs
railway logs

# Restart if needed
railway restart

# Verify database
psql $DATABASE_URL -c "SELECT 1"
```

**Slow Response Times**
```bash
# Symptoms: Requests taking > 5 seconds
# Cause: Database queries slow or worker backlog

# Check database performance
SELECT query, calls, mean_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;

# Check Redis queue depth
railway logs worker | grep "queue depth"

# Consider scaling up
railway scale --replicas 2
```

**Payment Processing Failures**
```bash
# Symptoms: Stripe webhooks failing
# Cause: Webhook secret mismatch or network issue

# Verify webhook endpoint
curl -X POST https://api.stolentee.com/api/webhooks/stripe \
  -H "Content-Type: application/json" \
  -d '{"test": true}'

# Check Stripe dashboard for webhook failures
# https://dashboard.stripe.com/webhooks

# Resend failed events from Stripe dashboard
```

#### 4. Communication Template

**Internal (Slack #incidents):**
```
🚨 INCIDENT: [P0/P1/P2/P3] - [Brief Description]

STATUS: Investigating / Mitigating / Resolved
STARTED: 2025-11-27 10:30 UTC
IMPACT: [What's broken, who's affected]
NEXT UPDATE: In 15 minutes

UPDATES:
10:30 - Incident detected, investigating
10:35 - Root cause identified: [cause]
10:45 - Fix deployed, monitoring
11:00 - Incident resolved ✅
```

**External (Status Page / Twitter):**
```
⚠️ We're currently experiencing issues with [feature].
Our team is investigating and working on a fix.

Status updates: https://status.stolentee.com
ETA: [timeframe]

We apologize for the inconvenience.
```

---

## Data Loss Prevention

### Strategies

1. **Database Backups**
   - Daily automated backups (Supabase)
   - Weekly manual backups (offsite)
   - Pre-deployment backups
   - Retention: 30 days

2. **Immutable Storage**
   - Use append-only logs for critical data
   - Never DELETE, always soft delete
   - Audit trail for all modifications

3. **Replication**
   - Future: Database read replicas
   - Future: Multi-region storage

4. **Version Control**
   - All code in Git
   - Database schema versioned
   - Configuration as code

5. **Monitoring & Alerts**
   - Unexpected data drops
   - Mass deletions (> 100 rows)
   - Unauthorized access attempts

### Soft Delete Pattern

```typescript
// Instead of hard delete
await db.query('DELETE FROM orders WHERE id = $1', [orderId]);

// Use soft delete
await db.query(
  'UPDATE orders SET deleted_at = NOW() WHERE id = $1',
  [orderId]
);

// Query only active records
await db.query(
  'SELECT * FROM orders WHERE deleted_at IS NULL'
);
```

### Audit Logging

```typescript
// Track all critical operations
interface AuditLog {
  id: string;
  user_id: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  table_name: string;
  record_id: string;
  old_values?: object;
  new_values?: object;
  timestamp: Date;
  ip_address: string;
}

// Log before modifications
await logAudit({
  user_id: req.user.id,
  action: 'DELETE',
  table_name: 'orders',
  record_id: orderId,
  old_values: existingOrder,
  ip_address: req.ip,
});
```

---

## Failover Strategies

### Database Failover

**Current Setup:**
- Single Supabase instance (free tier)
- No automatic failover

**Future Upgrade (Supabase Pro):**
- Point-in-time recovery
- Faster backup restoration
- Better support SLA

**Manual Failover Procedure:**
1. Detect database failure (health check fails)
2. Restore from latest backup (see restore procedures)
3. Update DATABASE_URL environment variable
4. Restart Railway services
5. Verify connectivity

### API Failover

**Current Setup:**
- Single Railway region
- No multi-region deployment

**Degraded Mode:**
```typescript
// If database is down, serve cached data
app.use((req, res, next) => {
  if (!dbHealthy && req.method === 'GET') {
    const cached = cache.get(req.url);
    if (cached) {
      return res.json(cached);
    }
  }
  next();
});
```

**Maintenance Mode:**
```typescript
// Enable maintenance mode during recovery
if (process.env.MAINTENANCE_MODE === 'true') {
  app.use((req, res) => {
    res.status(503).json({
      error: 'Service temporarily unavailable',
      message: 'We are performing maintenance. Please try again shortly.',
      eta: '15 minutes',
    });
  });
}
```

### Third-Party Service Failures

**Remove.bg Failover:**
```typescript
// Fallback to self-hosted rembg
try {
  result = await removeBgAPI(image);
} catch (error) {
  logger.error('Remove.bg failed, using self-hosted fallback');
  result = await selfHostedRembg(image);
}
```

**Stripe Failover:**
```typescript
// Queue payment for retry if Stripe is down
try {
  await stripe.charges.create(chargeData);
} catch (error) {
  if (isNetworkError(error)) {
    await paymentQueue.add('retry-charge', chargeData, {
      attempts: 5,
      backoff: { type: 'exponential', delay: 60000 }
    });
  }
}
```

---

## Contact Information

### On-Call Rotation

| Role | Primary | Secondary |
|------|---------|-----------|
| **Infrastructure** | [Name/Email] | [Name/Email] |
| **Backend** | [Name/Email] | [Name/Email] |
| **Frontend** | [Name/Email] | [Name/Email] |

### Escalation Path

1. **First Responder** (5 min)
   - Assess severity
   - Begin mitigation

2. **Team Lead** (15 min for P0/P1)
   - Coordinate response
   - Make rollback decisions

3. **CTO/Engineering Manager** (30 min for P0)
   - Customer communication
   - Strategic decisions

### External Contacts

| Service | Support | Status Page |
|---------|---------|-------------|
| **Railway** | support@railway.app | https://status.railway.app |
| **Supabase** | support@supabase.com | https://status.supabase.com |
| **Vercel** | support@vercel.com | https://vercel-status.com |
| **Stripe** | support@stripe.com | https://status.stripe.com |
| **Remove.bg** | support@remove.bg | N/A |

---

## Testing & Drills

### Quarterly DR Drill

**Schedule:** First Monday of each quarter

**Procedure:**
1. **Week -1:** Schedule drill, notify team
2. **Day 0:** Execute drill (off-peak hours)
   - Simulate database failure
   - Restore from backup
   - Measure time to recovery
   - Document issues
3. **Week +1:** Post-drill review
   - Review findings
   - Update procedures
   - Train new team members

**Drill Scenarios:**
- Database corruption
- Accidental data deletion
- Service crash during peak hours
- Third-party API outage
- Multi-component failure

---

## Maintenance Windows

### Scheduled Maintenance

**Preferred Window:** Sunday 2-4 AM UTC
- Lowest traffic period
- Team availability

**Communication:**
- 72 hours advance notice
- Email to all users
- Status page update
- Twitter/social media

**Maintenance Checklist:**
```markdown
## Pre-Maintenance (1 day before)
- [ ] Create database backup
- [ ] Create storage backup
- [ ] Test backup restoration
- [ ] Prepare rollback plan
- [ ] Notify users

## During Maintenance
- [ ] Enable maintenance mode
- [ ] Perform updates/migrations
- [ ] Run smoke tests
- [ ] Verify functionality
- [ ] Disable maintenance mode

## Post-Maintenance
- [ ] Monitor for 1 hour
- [ ] Check error rates
- [ ] Confirm user reports normal
- [ ] Update status page
- [ ] Send completion notice
```

---

## Appendix: Useful Commands

### Health Checks
```bash
# Check API health
curl https://api.stolentee.com/health/detailed | jq

# Check database connectivity
psql $DATABASE_URL -c "SELECT 1"

# Check Redis connectivity
redis-cli -u $REDIS_URL PING
```

### Emergency Access
```bash
# SSH into Railway service (if available)
railway shell

# View live logs
railway logs --tail

# Restart service
railway restart

# Rollback deployment
railway rollback
```

### Database Maintenance
```bash
# Check database size
psql $DATABASE_URL -c "
  SELECT pg_size_pretty(pg_database_size(current_database()))
"

# Check table sizes
psql $DATABASE_URL -c "
  SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename))
  FROM pg_tables
  ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
  LIMIT 10
"

# Vacuum database (reclaim space)
psql $DATABASE_URL -c "VACUUM ANALYZE"
```

---

**Last Updated:** 2025-11-27 by Agent #8 - Infrastructure Optimization

**Next Review:** 2026-02-27 (Quarterly)
