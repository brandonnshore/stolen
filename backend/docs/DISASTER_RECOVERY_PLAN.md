# Disaster Recovery & Business Continuity Plan

## Overview

This document outlines procedures for disaster recovery, business continuity, and incident response for the Stolen Tee application infrastructure.

**Recovery Time Objective (RTO):** < 1 hour
**Recovery Point Objective (RPO):** < 24 hours

---

## 1. Backup Strategy

### 1.1 Database Backups

**Supabase Automatic Backups:**
- **Frequency:** Daily automatic backups
- **Retention:** 7 days on free tier, 30 days on Pro
- **Point-in-time recovery:** Available for 7 days
- **Location:** Supabase managed storage

**Manual Backup Procedure:**
```bash
# Export entire database
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d-%H%M%S).sql

# Compressed backup
pg_dump $DATABASE_URL | gzip > backup-$(date +%Y%m%d-%H%M%S).sql.gz

# Specific tables only
pg_dump $DATABASE_URL -t orders -t order_items -t customers > critical-backup.sql

# Store in secure location (S3, R2, or local encrypted drive)
```

**Backup Schedule:**
- **Critical data (orders, customers):** Before every deploy
- **Full database:** Weekly on Sunday 2 AM UTC
- **Before major migrations:** Manual backup
- **Before R2 migration:** Full backup including assets table

**Backup Verification:**
```bash
# Test restore to local database
createdb test_restore
pg_restore -d test_restore backup.sql

# Verify record counts
psql test_restore -c "SELECT COUNT(*) FROM orders;"
psql test_restore -c "SELECT COUNT(*) FROM customers;"
```

### 1.2 Storage Backups

**Cloudflare R2 (after migration):**
- **Versioning:** Enable object versioning in R2
- **Lifecycle:** Retain deleted objects for 30 days
- **Cross-region replication:** Optional (for critical assets)

**Supabase Storage (current):**
- **Manual backup before migration:** Download all assets
- **Retention after R2 migration:** Keep for 1 week as fallback
- **Archive critical assets:** Monthly backup to external storage

**Asset Backup Procedure:**
```bash
# Export all asset URLs from database
psql $DATABASE_URL -c "COPY (SELECT id, file_url, original_name FROM assets) TO STDOUT WITH CSV HEADER;" > assets-inventory.csv

# Download all assets (run before R2 migration)
node scripts/backup-assets.js

# Verify backup integrity
md5sum uploads/* > checksum.md5
```

### 1.3 Configuration Backups

**Environment Variables:**
- Stored in Railway dashboard (encrypted)
- Documented in 1Password or equivalent secret manager
- Backup `.env.example` in Git (without secrets)

**Code & Configuration:**
- All code in Git (GitHub)
- Railway configuration: `railway.toml` in Git
- Database schema: `migrations/` directory in Git

**Backup Checklist:**
```
[ ] Environment variables documented in 1Password
[ ] Railway.toml in Git
[ ] Database migrations in Git
[ ] API keys backed up securely
[ ] Stripe webhook secrets documented
[ ] Supabase credentials backed up
```

### 1.4 Backup Automation

**Automated Weekly Backup Script:**
```bash
#!/bin/bash
# File: scripts/weekly-backup.sh

DATE=$(date +%Y%m%d-%H%M%S)
BACKUP_DIR="/backups/$DATE"

mkdir -p $BACKUP_DIR

# Database backup
echo "Backing up database..."
pg_dump $DATABASE_URL | gzip > $BACKUP_DIR/database.sql.gz

# Asset inventory
echo "Exporting asset inventory..."
psql $DATABASE_URL -c "COPY (SELECT * FROM assets) TO STDOUT WITH CSV HEADER;" > $BACKUP_DIR/assets.csv

# Configuration backup
echo "Backing up configuration..."
cp railway.toml $BACKUP_DIR/
cp .env.example $BACKUP_DIR/

# Upload to secure storage (R2, S3, or encrypted drive)
echo "Uploading to backup storage..."
aws s3 cp $BACKUP_DIR s3://stolentee-backups/$DATE/ --recursive

echo "Backup completed: $BACKUP_DIR"
```

**Cron Schedule:**
```cron
# Run every Sunday at 2 AM UTC
0 2 * * 0 /app/scripts/weekly-backup.sh >> /var/log/backup.log 2>&1
```

---

## 2. Disaster Scenarios & Recovery Procedures

### 2.1 Database Failure

**Scenario:** Supabase database is unavailable or corrupted

**Detection:**
- Health check fails: `/health/detailed` returns 503
- Database query latency > 10s
- Connection pool errors in logs

**Recovery Steps:**

1. **Assess Damage:**
   ```bash
   # Check Supabase status
   curl https://status.supabase.com/

   # Test connection
   psql $DATABASE_URL -c "SELECT version();"

   # Check logs
   railway logs | grep "database"
   ```

2. **Point-in-Time Recovery (Supabase):**
   ```
   1. Go to Supabase Dashboard
   2. Navigate to Settings → Database → Backups
   3. Select restore point (within 7 days)
   4. Confirm restoration
   5. Wait 5-10 minutes for completion
   6. Verify data integrity
   ```

3. **Manual Restoration from Backup:**
   ```bash
   # Download latest backup
   aws s3 cp s3://stolentee-backups/latest/database.sql.gz .

   # Decompress
   gunzip database.sql.gz

   # Restore to Supabase
   psql $DATABASE_URL < database.sql

   # Verify restoration
   psql $DATABASE_URL -c "SELECT COUNT(*) FROM orders;"
   ```

4. **Verify Application:**
   ```bash
   # Test health endpoint
   curl https://api.stolentee.com/health/detailed

   # Test critical endpoints
   curl https://api.stolentee.com/api/products
   curl https://api.stolentee.com/api/auth/health
   ```

**RTO:** < 30 minutes (using point-in-time recovery)
**RPO:** < 24 hours (daily backups)

### 2.2 Railway Service Down

**Scenario:** Railway platform outage or deployment failure

**Detection:**
- Health check fails (Railway monitors automatically)
- 502/503 errors from frontend
- Alert from Railway dashboard

**Recovery Steps:**

1. **Check Railway Status:**
   ```bash
   # Railway status page
   https://status.railway.app/

   # Check service logs
   railway logs --service backend
   ```

2. **Automatic Restart (Railway handles this):**
   - Railway automatically restarts failed services
   - Health check path: `/health`
   - Max retries: 10 (configured in railway.toml)

3. **Manual Restart:**
   ```bash
   # Restart via CLI
   railway restart --service backend

   # Or via dashboard
   # Railway Dashboard → Service → Restart
   ```

4. **Rollback to Previous Deployment:**
   ```bash
   # List recent deployments
   railway deployments list

   # Rollback to previous working version
   railway rollback <deployment-id>
   ```

5. **Emergency Rollback from Git:**
   ```bash
   # Revert to last working commit
   git log --oneline -10  # Find last working commit
   git revert <commit-hash>
   git push origin main

   # Railway auto-deploys from main branch
   ```

**RTO:** < 5 minutes (automatic restart)
**RPO:** 0 (no data loss)

### 2.3 Storage Failure (R2 or Supabase)

**Scenario:** Cloudflare R2 unavailable or assets corrupted

**Detection:**
- Images fail to load on frontend
- 404 errors for asset URLs
- R2 API errors in logs

**Recovery Steps:**

1. **Verify R2 Status:**
   ```bash
   # Check Cloudflare status
   https://www.cloudflarestatus.com/

   # Test R2 API
   curl -I https://assets.stolentee.com/uploads/test-image.jpg
   ```

2. **Fallback to Supabase (if within 1 week of migration):**
   ```sql
   -- Restore old Supabase URLs
   UPDATE assets
   SET file_url = old_file_url
   WHERE file_url LIKE '%assets.stolentee.com%';
   ```

3. **Restore from Backup:**
   ```bash
   # Download backup assets
   aws s3 sync s3://stolentee-backups/latest/uploads/ ./restore/

   # Re-upload to R2
   node scripts/bulk-upload-to-r2.js ./restore/

   # Update database URLs
   node scripts/update-asset-urls.js
   ```

4. **Temporary Workaround:**
   ```typescript
   // Update code to fallback to local storage
   if (!isR2Available() && !isSupabaseStorageAvailable()) {
     // Use local Railway storage temporarily
     return uploadToLocal(file);
   }
   ```

**RTO:** < 1 hour (restore from backup)
**RPO:** < 24 hours (daily asset backups)

### 2.4 Complete Infrastructure Failure

**Scenario:** All services down (Railway, Supabase, R2)

**Detection:**
- Multiple health checks fail
- Complete application unavailability
- Customer support tickets flooding in

**Recovery Steps:**

1. **Assess Situation:**
   ```bash
   # Check all service statuses
   - Railway: https://status.railway.app/
   - Supabase: https://status.supabase.com/
   - Cloudflare: https://www.cloudflarestatus.com/
   - Vercel: https://www.vercel-status.com/
   ```

2. **Deploy to Alternative Infrastructure:**

   **Option A: Deploy to Heroku (Backup Platform)**
   ```bash
   # Create Heroku app
   heroku create stolentee-backup

   # Set environment variables
   heroku config:set DATABASE_URL=$BACKUP_DB_URL
   heroku config:set REDIS_URL=$BACKUP_REDIS_URL

   # Deploy
   git push heroku main

   # Update DNS
   # Point api.stolentee.com to Heroku app
   ```

   **Option B: Deploy to AWS (Nuclear Option)**
   ```bash
   # Deploy backend to AWS Lambda
   # Use RDS for database
   # Use S3 for storage
   # Estimated setup time: 4-6 hours
   ```

3. **Restore Database:**
   ```bash
   # Create new PostgreSQL instance
   # Restore from latest backup
   psql $NEW_DATABASE_URL < latest-backup.sql
   ```

4. **Update Frontend:**
   ```bash
   # Update API endpoint in frontend
   VITE_API_URL=https://stolentee-backup.herokuapp.com

   # Deploy to Vercel
   npm run build
   vercel --prod
   ```

5. **Customer Communication:**
   ```
   1. Update status page
   2. Send email to customers
   3. Post on social media
   4. Provide ETA for full recovery
   ```

**RTO:** < 4 hours (full infrastructure rebuild)
**RPO:** < 24 hours (latest backup)

---

## 3. Incident Response Procedures

### 3.1 Severity Levels

**SEV 1 - Critical (Immediate Response Required)**
- Complete service outage
- Database corruption
- Security breach
- Payment processing failure

**SEV 2 - High (Response within 1 hour)**
- Partial service degradation
- Performance issues affecting >50% users
- Background job processing stopped
- Storage service unavailable

**SEV 3 - Medium (Response within 4 hours)**
- Minor performance degradation
- Non-critical feature unavailable
- Elevated error rate (1-5%)

**SEV 4 - Low (Response within 24 hours)**
- Cosmetic issues
- Low error rate (<1%)
- Feature request
- Documentation updates

### 3.2 Incident Response Process

**1. Detection & Alerting:**
```
- Automated monitoring detects issue
- Alert sent via PagerDuty/Email/Slack
- On-call engineer paged
```

**2. Initial Assessment (5 minutes):**
```
- Check health endpoint: /health/detailed
- Review Railway logs
- Determine severity level
- Page additional team members if SEV 1/2
```

**3. Investigation (10 minutes):**
```
- Identify root cause
- Check recent deployments
- Review error logs
- Check third-party service status
```

**4. Mitigation (varies):**
```
- Apply immediate fix OR
- Rollback deployment OR
- Scale resources OR
- Implement workaround
```

**5. Resolution:**
```
- Verify fix deployed
- Monitor for 30 minutes
- Confirm all metrics normal
- Close incident ticket
```

**6. Post-Mortem (within 48 hours):**
```
- Document timeline
- Root cause analysis
- Action items to prevent recurrence
- Update runbooks
```

### 3.3 Incident Communication

**Internal Communication:**
- Slack channel: #incidents
- Status updates every 30 minutes for SEV 1/2
- Post-mortem document in Notion/Confluence

**External Communication:**
- Status page: status.stolentee.com (if available)
- Email to affected customers
- Social media updates
- Support ticket responses

**Communication Templates:**

**Initial Update:**
```
Subject: Service Disruption - [Brief Description]

We're currently experiencing [issue description].

Impact: [affected features]
Status: Investigating
ETA: [estimated resolution time]

We'll provide updates every 30 minutes.
```

**Resolution Update:**
```
Subject: Service Restored - [Brief Description]

The issue has been resolved.

Cause: [brief explanation]
Resolution: [what was done]
Downtime: [total duration]

We apologize for any inconvenience.
```

---

## 4. Monitoring & Alerting

### 4.1 Alert Configuration

**Critical Alerts (Immediate - PagerDuty):**
```yaml
- name: service_down
  condition: health_check_failed
  threshold: 2 consecutive failures
  action: page_on_call

- name: database_down
  condition: db_latency > 10s OR connection_failed
  threshold: 3 failures in 5 minutes
  action: page_on_call

- name: high_error_rate
  condition: error_rate > 5%
  threshold: 5 minutes
  action: page_on_call

- name: memory_critical
  condition: memory_usage > 95%
  threshold: 2 minutes
  action: page_on_call + auto_restart
```

**Warning Alerts (Email/Slack):**
```yaml
- name: high_cpu
  condition: cpu_usage > 70%
  threshold: 15 minutes
  action: slack_alert

- name: slow_database
  condition: db_latency > 500ms
  threshold: 10 minutes
  action: slack_alert

- name: queue_buildup
  condition: queue_depth > 20
  threshold: 5 minutes
  action: slack_alert

- name: low_memory
  condition: memory_usage > 80%
  threshold: 10 minutes
  action: slack_alert
```

### 4.2 Health Check Monitoring

**Automated Health Checks:**
```bash
# External monitoring (UptimeRobot, Pingdom, etc.)
- Endpoint: https://api.stolentee.com/health
- Frequency: Every 5 minutes
- Timeout: 30 seconds
- Alert after: 2 consecutive failures

# Internal monitoring (Railway)
- Health check path: /health
- Interval: 30 seconds
- Timeout: 10 seconds
- Auto-restart after: 3 failures
```

---

## 5. Testing & Drills

### 5.1 Disaster Recovery Testing

**Quarterly DR Drill:**
```
1. Schedule maintenance window (low traffic period)
2. Simulate database failure (point-in-time recovery test)
3. Simulate storage failure (restore from backup)
4. Test Railway rollback procedure
5. Verify all recovery procedures documented
6. Time each recovery step
7. Update RTO/RPO estimates
8. Document lessons learned
```

### 5.2 Backup Verification

**Monthly Backup Test:**
```bash
# Test database restore
1. Create test database
2. Restore from latest backup
3. Verify record counts
4. Test critical queries
5. Delete test database

# Test asset backup
1. Select random sample of assets
2. Download from backup
3. Verify file integrity (checksums)
4. Confirm URLs still accessible
```

### 5.3 Chaos Engineering

**Quarterly Chaos Tests:**
```
- Kill random Railway instance (test auto-restart)
- Simulate database connection limit (test pool handling)
- Introduce network latency (test timeouts)
- Corrupt Redis cache (test cache miss handling)
- Simulate R2 API errors (test fallback to Supabase)
```

---

## 6. Runbooks

### 6.1 Database Recovery Runbook

**Symptom:** Database unavailable or slow

**Steps:**
1. Check Supabase status: https://status.supabase.com/
2. Test connection: `psql $DATABASE_URL -c "SELECT 1;"`
3. Check connection pool: `curl /health/detailed | jq .database`
4. If connection limit reached:
   - Restart Railway service: `railway restart`
   - Review connection pool settings
5. If database corrupted:
   - Follow point-in-time recovery procedure
   - Or restore from backup
6. Verify recovery: Test critical endpoints

**Escalation:** If recovery fails after 30 minutes, page database admin

### 6.2 Storage Recovery Runbook

**Symptom:** Images not loading (404 errors)

**Steps:**
1. Check R2 status: https://www.cloudflarestatus.com/
2. Test R2 endpoint: `curl -I https://assets.stolentee.com/test.jpg`
3. Check recent deployments (may have wrong URLs)
4. If R2 unavailable:
   - Check if Supabase fallback available
   - Restore database URLs if needed
5. If assets missing:
   - Check backup inventory
   - Restore from latest backup
6. Verify recovery: Load frontend and test image display

**Escalation:** If recovery fails after 1 hour, page infrastructure lead

### 6.3 High CPU/Memory Runbook

**Symptom:** CPU > 80% or Memory > 90%

**Steps:**
1. Check `/health/detailed` for metrics
2. Review Railway logs for errors
3. Check for infinite loops or memory leaks
4. If memory leak suspected:
   - Restart Railway service immediately
   - Review recent code changes
   - Add memory profiling
5. If legitimate high load:
   - Enable auto-scaling (if not already)
   - Add additional Railway instance manually
   - Consider upgrading instance size
6. Monitor for 30 minutes after mitigation

**Escalation:** If issue persists, page backend team lead

---

## 7. Contact Information

### On-Call Rotation
- **Primary:** [Engineer Name] - [Phone] - [Slack]
- **Secondary:** [Engineer Name] - [Phone] - [Slack]
- **Escalation:** [Tech Lead] - [Phone] - [Slack]

### Service Providers
- **Railway Support:** support@railway.app
- **Supabase Support:** support@supabase.com
- **Cloudflare Support:** https://dash.cloudflare.com/support
- **Stripe Support:** https://support.stripe.com/

### Internal Resources
- **Incident Slack:** #incidents
- **Documentation:** Notion/Confluence
- **Status Page:** status.stolentee.com
- **Runbooks:** /docs/runbooks/

---

## 8. Continuous Improvement

### Post-Incident Actions
1. Create post-mortem document within 48 hours
2. Identify root cause and contributing factors
3. Create action items to prevent recurrence
4. Update runbooks and documentation
5. Share learnings with team
6. Track metrics: MTTR, MTBF, incident count

### Quarterly Review
1. Review all incidents from past quarter
2. Identify trends and patterns
3. Update RTO/RPO targets
4. Test disaster recovery procedures
5. Update contact information
6. Review and improve monitoring/alerting

---

**Document Version:** 1.0
**Last Updated:** 2025-11-26
**Next Review:** 2025-12-26
**Owner:** Infrastructure Team
