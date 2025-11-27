# Backup & Disaster Recovery Strategy

This document outlines the backup strategy, recovery procedures, and business continuity plan for Stolen Tee.

## Table of Contents

- [Overview](#overview)
- [What Gets Backed Up](#what-gets-backed-up)
- [Database Backups](#database-backups)
- [File Storage Backups](#file-storage-backups)
- [Code & Configuration](#code--configuration)
- [Restore Procedures](#restore-procedures)
- [Testing Schedule](#testing-schedule)
- [Disaster Recovery Plan](#disaster-recovery-plan)

---

## Overview

**Backup Strategy:** 3-2-1 Rule (where feasible)
- **3** copies of data (production + 2 backups)
- **2** different storage media (Supabase + local/S3)
- **1** copy offsite (separate from production)

**Recovery Point Objective (RPO):** 24 hours
- *Maximum acceptable data loss*

**Recovery Time Objective (RTO):** 4 hours
- *Maximum acceptable downtime*

**Backup Retention Policy:**
- **Database:** 7 daily (Supabase free tier), 30 daily (paid)
- **Files:** 30 days minimum
- **Code:** Indefinite (Git)

---

## What Gets Backed Up

| Data Type | Location | Backup Frequency | Retention | Critical? |
|-----------|----------|------------------|-----------|-----------|
| Database | Supabase PostgreSQL | Daily (automatic) | 7 days | YES |
| User Uploads | Supabase Storage | Weekly (manual) | 30 days | YES |
| Processed Images | Supabase Storage | Weekly (manual) | 30 days | YES |
| Code | GitHub | On push (automatic) | Indefinite | YES |
| Environment Variables | Railway / Manual docs | On change (manual) | Indefinite | YES |
| Redis Data | Upstash | None (ephemeral) | N/A | NO |
| Job Queue | BullMQ (Redis) | None (ephemeral) | N/A | NO |

**Critical Data** = Data that cannot be recreated if lost.

---

## Database Backups

### Supabase Automatic Backups

**What's Backed Up:**
- All tables (users, products, orders, designs, jobs, settings, etc.)
- Database schema
- Functions and triggers
- Row-level security policies

**Backup Schedule:**
- **Free Tier:** Daily backups, 7 day retention
- **Pro Tier:** Daily backups, 30 day retention + Point-in-Time Recovery (7 days)

**Access Backups:**
1. Go to Supabase Dashboard: https://supabase.com/dashboard/project/YOUR_PROJECT
2. Navigate to: Database → Backups
3. See list of available backups with timestamps

### Manual Database Backup

Use for:
- Before major migrations
- Before schema changes
- Monthly archival backups

**Procedure:**

```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref YOUR_PROJECT_REF

# Create a manual backup
pg_dump "postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres" > backup-$(date +%Y%m%d).sql

# Compress the backup
gzip backup-$(date +%Y%m%d).sql

# Upload to secure location (e.g., S3, Google Drive)
# Store with date in filename for easy identification
```

**Automated Script:**

Save as `/scripts/backup-database.sh`:

```bash
#!/bin/bash
# Database Backup Script

set -e  # Exit on error

# Configuration
BACKUP_DIR="$HOME/backups/stolentee"
DATE=$(date +%Y%m%d-%H%M%S)
BACKUP_FILE="$BACKUP_DIR/database-$DATE.sql.gz"
RETENTION_DAYS=30

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Perform backup
echo "Starting database backup at $(date)"
pg_dump "$DATABASE_URL" | gzip > "$BACKUP_FILE"

# Verify backup was created
if [ -f "$BACKUP_FILE" ]; then
  SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
  echo "Backup created: $BACKUP_FILE ($SIZE)"
else
  echo "ERROR: Backup failed to create"
  exit 1
fi

# Remove backups older than retention period
find "$BACKUP_DIR" -name "database-*.sql.gz" -mtime +$RETENTION_DAYS -delete
echo "Cleaned up old backups (>$RETENTION_DAYS days)"

# Optional: Upload to S3 or Google Drive
# aws s3 cp "$BACKUP_FILE" s3://stolentee-backups/database/

echo "Database backup completed successfully"
```

**Schedule with Cron (Linux/Mac):**

```bash
# Edit crontab
crontab -e

# Add weekly backup (every Sunday at 2 AM)
0 2 * * 0 /path/to/scripts/backup-database.sh >> /var/log/stolentee-backup.log 2>&1

# Add monthly backup (1st of month at 3 AM)
0 3 1 * * /path/to/scripts/backup-database.sh >> /var/log/stolentee-backup.log 2>&1
```

### What's NOT Backed Up

**Redis Data:**
- Job queue data (BullMQ)
- Session data
- Rate limiting counters

**Why:** Redis is ephemeral by design. Jobs have retry logic and can be re-queued. Sessions can be recreated.

**Mitigation:** Critical job data is persisted to database (job status, results).

---

## File Storage Backups

### Supabase Storage Backup

**What's Backed Up:**
- User uploaded shirt photos (bucket: `uploads`)
- Processed transparent PNGs (bucket: `uploads`)
- Extracted logo coordinates (stored in database)

**Backup Frequency:** Weekly (manual)

**Manual Backup Script:**

Save as `/scripts/backup-storage.sh`:

```bash
#!/bin/bash
# Supabase Storage Backup Script

set -e

# Configuration
BACKUP_DIR="$HOME/backups/stolentee/storage"
DATE=$(date +%Y%m%d)
TEMP_DIR="/tmp/stolentee-backup-$DATE"
ARCHIVE_FILE="$BACKUP_DIR/storage-$DATE.tar.gz"

# Supabase configuration
SUPABASE_URL="https://YOUR_PROJECT.supabase.co"
SUPABASE_KEY="YOUR_SERVICE_ROLE_KEY"
BUCKET_NAME="uploads"

echo "Starting storage backup at $(date)"

# Create directories
mkdir -p "$BACKUP_DIR"
mkdir -p "$TEMP_DIR"

# Download all files from bucket using Supabase CLI
# Note: You'll need to implement this using Supabase's API
# or use the Supabase CLI

# Alternative: Use rclone if configured
# rclone sync supabase:uploads "$TEMP_DIR"

# For now, document manual process:
echo "Manual backup process:"
echo "1. Go to Supabase Dashboard → Storage → uploads"
echo "2. Download all files"
echo "3. Save to $TEMP_DIR"
echo "4. Then run: tar -czf $ARCHIVE_FILE -C $TEMP_DIR ."

# Create archive (once files are downloaded)
if [ "$(ls -A $TEMP_DIR)" ]; then
  tar -czf "$ARCHIVE_FILE" -C "$TEMP_DIR" .
  SIZE=$(du -h "$ARCHIVE_FILE" | cut -f1)
  echo "Archive created: $ARCHIVE_FILE ($SIZE)"

  # Cleanup temp directory
  rm -rf "$TEMP_DIR"

  # Remove old backups (>30 days)
  find "$BACKUP_DIR" -name "storage-*.tar.gz" -mtime +30 -delete
  echo "Storage backup completed"
else
  echo "ERROR: No files found in temp directory"
  exit 1
fi
```

**Automated Storage Backup (Using Node.js):**

Save as `/scripts/backup-storage.js`:

```javascript
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const BACKUP_DIR = process.env.BACKUP_DIR || './backups/storage';
const BUCKET_NAME = 'uploads';

async function backupStorage() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  console.log('Starting storage backup...');

  // Create backup directory
  const date = new Date().toISOString().split('T')[0];
  const backupPath = path.join(BACKUP_DIR, date);
  fs.mkdirSync(backupPath, { recursive: true });

  // List all files in bucket
  const { data: files, error } = await supabase.storage
    .from(BUCKET_NAME)
    .list('', { limit: 1000, sortBy: { column: 'created_at', order: 'desc' } });

  if (error) throw error;

  console.log(`Found ${files.length} files to backup`);

  // Download each file
  for (const file of files) {
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .download(file.name);

    if (error) {
      console.error(`Failed to download ${file.name}:`, error);
      continue;
    }

    // Save file
    const filePath = path.join(backupPath, file.name);
    const buffer = Buffer.from(await data.arrayBuffer());
    fs.writeFileSync(filePath, buffer);
    console.log(`Downloaded: ${file.name}`);
  }

  // Create archive
  const output = fs.createWriteStream(
    path.join(BACKUP_DIR, `storage-${date}.tar.gz`)
  );
  const archive = archiver('tar', { gzip: true });

  output.on('close', () => {
    console.log(`Backup complete: ${archive.pointer()} bytes`);
    // Cleanup uncompressed files
    fs.rmSync(backupPath, { recursive: true });
  });

  archive.pipe(output);
  archive.directory(backupPath, false);
  await archive.finalize();
}

backupStorage().catch(console.error);
```

**Run Weekly:**

```bash
# Add to crontab (every Sunday at 3 AM)
0 3 * * 0 cd /path/to/project && node scripts/backup-storage.js >> /var/log/stolentee-storage-backup.log 2>&1
```

### Important Files Checklist

Before any backup, verify these critical files exist:
- [ ] User uploaded photos (all .jpg, .png in uploads bucket)
- [ ] Processed transparent images (all .png with `_processed` suffix)
- [ ] Product images (in `public/assets/` directory - version controlled)

---

## Code & Configuration

### Code Repository Backup

**Primary:** GitHub (https://github.com/yourusername/stolen-tee)
- Automatic backup on every push
- Infinite retention
- Branch protection enabled

**Secondary:** Local clones
- Every developer has a full copy
- Can restore from any team member's machine

**Offsite Archive (Recommended):**
```bash
# Monthly archive to separate location
git bundle create stolentee-$(date +%Y%m).bundle --all
# Upload to Google Drive, Dropbox, or S3
```

### Environment Variables Backup

**Critical:** Environment variables are NOT in Git (security).

**Backup Strategy:**

Create `/docs/ENVIRONMENT_VARIABLES.md` (DO NOT commit to public repo):

```bash
# Backend Environment Variables
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
SUPABASE_URL=https://...
SUPABASE_SERVICE_KEY=...
STRIPE_SECRET_KEY=sk_live_...
GEMINI_API_KEY=...
SENTRY_DSN=https://...
# ... etc

# Frontend Environment Variables
VITE_SUPABASE_URL=https://...
VITE_SUPABASE_ANON_KEY=...
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...
VITE_SENTRY_DSN=https://...
```

**Store securely:**
- Use a password manager (1Password, LastPass)
- Or encrypted file storage
- Update whenever variables change

**Access from Railway/Vercel:**
- Railway: Dashboard → Service → Variables → Copy all
- Vercel: Dashboard → Project → Settings → Environment Variables → Export

---

## Restore Procedures

### Database Restore (Full)

**When to use:** Database corruption, accidental deletion, disaster recovery

**Procedure:**

```bash
# 1. Download backup from Supabase Dashboard
# Database → Backups → Select backup → Download

# 2. Or restore to a point in time (Pro tier only)
# Database → Backups → Point-in-Time Recovery → Select timestamp

# 3. For manual backup restore:
# Uncompress backup
gunzip backup-20251127.sql.gz

# Restore to database
psql "postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres" < backup-20251127.sql

# 4. Verify restore
psql "postgresql://..." -c "SELECT count(*) FROM users;"
psql "postgresql://..." -c "SELECT count(*) FROM orders;"

# 5. Restart backend to reconnect
# Railway Dashboard → Backend → Settings → Restart
```

**Estimated Time:** 10-30 minutes (depending on database size)

### Database Restore (Single Table)

**When to use:** Accidentally deleted table data, but rest of DB is fine

```bash
# 1. Extract specific table from backup
pg_restore -t users backup-20251127.sql > users-table.sql

# 2. Drop and recreate table (CAREFUL!)
psql "postgresql://..." -c "DROP TABLE users CASCADE;"

# 3. Restore table
psql "postgresql://..." < users-table.sql

# 4. Verify
psql "postgresql://..." -c "SELECT count(*) FROM users;"
```

### File Storage Restore

**When to use:** Accidental deletion, storage corruption

```bash
# 1. Download backup archive
# From wherever you stored it (S3, Google Drive, etc.)

# 2. Extract archive
tar -xzf storage-20251127.tar.gz -C /tmp/restore

# 3. Upload to Supabase Storage
# Option A: Using Supabase Dashboard
# - Go to Storage → uploads bucket
# - Drag and drop files from /tmp/restore

# Option B: Using Supabase CLI
supabase storage upload uploads /tmp/restore/*

# Option C: Using script
node scripts/restore-storage.js /tmp/restore

# 4. Verify files are accessible
curl https://YOUR_PROJECT.supabase.co/storage/v1/object/public/uploads/test.jpg
```

### Full Disaster Recovery

**Scenario:** Complete data center failure, need to rebuild from scratch

**Procedure:**

1. **Set up new infrastructure (2-4 hours)**
   - Create new Supabase project
   - Create new Railway app
   - Create new Upstash Redis
   - Create new Vercel project

2. **Restore database (30 minutes)**
   - Use latest backup from Supabase
   - Or restore from manual backup
   - Verify all tables and data present

3. **Restore file storage (1-2 hours)**
   - Extract latest storage backup
   - Upload to new Supabase Storage bucket
   - Verify files are accessible

4. **Deploy code (30 minutes)**
   - Connect GitHub to new Railway/Vercel
   - Set environment variables
   - Deploy backend and frontend

5. **Update DNS (5 minutes + propagation time)**
   - Point domain to new Vercel deployment
   - Update backend URL in frontend config
   - Wait for DNS propagation (up to 48 hours)

6. **Verify and monitor (1 hour)**
   - Test critical user flows
   - Check health endpoints
   - Monitor error rates in Sentry
   - Test payment processing

**Total Estimated Time:** 4-8 hours

---

## Testing Schedule

**Regular testing prevents surprises during real disasters.**

### Monthly: Restore Test (First Sunday)

```bash
# 1. Download latest database backup
# 2. Restore to development environment
# 3. Verify data integrity
# 4. Time the process
# 5. Document any issues
```

**Checklist:**
- [ ] Can download backup successfully
- [ ] Can restore backup to dev environment
- [ ] All tables present
- [ ] Row counts match production
- [ ] No data corruption
- [ ] Process documented and timed

### Quarterly: Full DR Drill (Every 3 months)

Simulate complete disaster:
1. Create fresh Supabase project
2. Restore database from backup
3. Deploy application to new infrastructure
4. Verify functionality

**Checklist:**
- [ ] All services can be recreated
- [ ] Backups can be restored
- [ ] Application works on new infrastructure
- [ ] Team knows the process
- [ ] RTO (4 hours) is achievable
- [ ] Documentation is accurate

### Yearly: Disaster Recovery Plan Review

Review and update this document:
- Are backup scripts still working?
- Are retention policies appropriate?
- Are new data types being backed up?
- Is the team trained on procedures?
- Are backups being monitored?

---

## Disaster Recovery Plan

### Disaster Scenarios

#### Scenario 1: Database Corrupted

**Impact:** All data lost, site down
**Probability:** Low (Supabase has redundancy)
**RTO:** 4 hours
**RPO:** 24 hours (last backup)

**Response:**
1. Declare P0 incident
2. Restore from latest Supabase backup
3. Verify data integrity
4. Restart backend
5. Monitor for 1 hour

#### Scenario 2: Supabase Complete Outage

**Impact:** Database + storage unavailable, site down
**Probability:** Very Low (99.9% uptime SLA)
**RTO:** 8 hours (migration to new provider)
**RPO:** 24 hours

**Response:**
1. Check Supabase status page
2. If prolonged (>2 hours), begin migration
3. Spin up new PostgreSQL (Railway, Neon, or RDS)
4. Restore from backup
5. Update DATABASE_URL
6. Deploy and test

#### Scenario 3: Railway Outage

**Impact:** Backend API down, frontend works but can't load data
**Probability:** Low (99.9% uptime)
**RTO:** 2 hours (deploy elsewhere)
**RPO:** 0 (no data loss)

**Response:**
1. Check Railway status
2. If prolonged, deploy backend to Render/Heroku/DigitalOcean
3. Update API URL in frontend
4. Redeploy frontend

#### Scenario 4: Accidental Data Deletion

**Impact:** Lost customer orders, designs, or uploads
**Probability:** Medium (human error)
**RTO:** 1 hour
**RPO:** 24 hours

**Response:**
1. Identify what was deleted
2. Restore from latest backup
3. If <24 hours ago, use point-in-time recovery (Pro tier)
4. Communicate to affected users

#### Scenario 5: Security Breach

**Impact:** Unauthorized access to database or storage
**Probability:** Low (with proper security)
**RTO:** Immediate (lock down), 4 hours (recovery)
**RPO:** 0 (preserve evidence)

**Response:**
1. Immediately revoke all API keys
2. Rotate all secrets (database, Redis, Stripe, etc.)
3. Lock down database (read-only mode)
4. Investigate breach source
5. Restore from pre-breach backup if necessary
6. Notify affected users (GDPR compliance)

---

## Backup Monitoring

### Automated Backup Verification

Create `/scripts/verify-backups.sh`:

```bash
#!/bin/bash
# Verify backups exist and are recent

# Check database backup age
LAST_DB_BACKUP=$(ls -t $HOME/backups/stolentee/database-* | head -1)
BACKUP_AGE=$(( ($(date +%s) - $(date -r "$LAST_DB_BACKUP" +%s)) / 86400 ))

if [ $BACKUP_AGE -gt 7 ]; then
  echo "WARNING: Last database backup is $BACKUP_AGE days old"
  # Send alert
fi

# Check storage backup age
LAST_STORAGE_BACKUP=$(ls -t $HOME/backups/stolentee/storage/storage-* | head -1)
STORAGE_AGE=$(( ($(date +%s) - $(date -r "$LAST_STORAGE_BACKUP" +%s)) / 86400 ))

if [ $STORAGE_AGE -gt 7 ]; then
  echo "WARNING: Last storage backup is $STORAGE_AGE days old"
  # Send alert
fi

echo "Backup verification complete"
```

**Run daily:**
```bash
0 6 * * * /path/to/scripts/verify-backups.sh >> /var/log/backup-verification.log 2>&1
```

### Backup Alerts

**Set up alerts for:**
- Backup age >7 days (should be daily/weekly)
- Backup size drops >20% (potential issue)
- Backup script fails (exit code ≠ 0)
- Restore test fails (monthly test)

---

## Related Documentation

- [MONITORING.md](./MONITORING.md) - Health checks and monitoring
- [INCIDENT_RESPONSE.md](./INCIDENT_RESPONSE.md) - Incident procedures
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Deployment procedures
- [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) - Common issues and fixes
