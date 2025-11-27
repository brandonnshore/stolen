# Incident Response Guide

This document provides procedures for responding to production incidents, communicating with stakeholders, and conducting post-mortems.

## Table of Contents

- [Quick Reference](#quick-reference)
- [Incident Response Process](#incident-response-process)
- [Incident Severity Levels](#incident-severity-levels)
- [On-Call Rotation](#on-call-rotation)
- [Communication Templates](#communication-templates)
- [Runbooks](#runbooks)
- [Post-Mortem Process](#post-mortem-process)

---

## Quick Reference

### Emergency Contacts

| Role | Name | Email | Phone |
|------|------|-------|-------|
| Primary On-Call | Brandon Shore | brandon@stolentee.com | (To be filled) |
| Secondary On-Call | (Backup) | (To be filled) | (To be filled) |
| Database Admin | Supabase Support | support@supabase.io | - |
| Hosting Support | Railway Support | team@railway.app | - |

### Critical System Access

| Service | Dashboard URL | Admin Access |
|---------|--------------|--------------|
| Railway (Backend) | https://railway.app/dashboard | brandon@stolentee.com |
| Vercel (Frontend) | https://vercel.com/dashboard | brandon@stolentee.com |
| Supabase (Database) | https://supabase.com/dashboard | brandon@stolentee.com |
| Upstash (Redis) | https://console.upstash.com | brandon@stolentee.com |
| Sentry (Errors) | https://sentry.io | brandon@stolentee.com |
| Stripe (Payments) | https://dashboard.stripe.com | brandon@stolentee.com |

### First Response Actions by Incident Type

| Incident | First Action | Runbook |
|----------|--------------|---------|
| Site Down | Check UptimeRobot, Railway logs | [Site Outage](#site-outage-runbook) |
| Database Down | Check Supabase status page | [Database Down](#database-down-runbook) |
| Redis Down | Check Upstash console | [Redis Down](#redis-down-runbook) |
| High Error Rate | Check Sentry dashboard | [High Error Rate](#high-error-rate-runbook) |
| Worker Stuck | Check Railway worker logs | [Worker Issues](#worker-stuck-runbook) |
| Payment Failure | Check Stripe dashboard | [Payment Issues](#payment-issues-runbook) |

---

## Incident Response Process

### Phase 1: Detection (0-5 minutes)

**How incidents are detected:**
1. **Automated Alerts:** UptimeRobot, Sentry, Railway
2. **User Reports:** Support email, social media
3. **Manual Discovery:** Team member notices issue
4. **Monitoring Dashboard:** Abnormal metrics

**Immediate Actions:**
1. Acknowledge the alert (prevents duplicate responses)
2. Open incident tracking document (template below)
3. Begin investigation (see runbooks)
4. Notify team in #incidents Slack channel (if exists)

### Phase 2: Triage (5-15 minutes)

**Determine:**
1. **Severity:** P0 (critical) to P3 (low) - see [Incident Severity Levels](#incident-severity-levels)
2. **Impact:** How many users affected? What functionality broken?
3. **Estimated Time to Resolution (ETTR):** Based on similar past incidents
4. **Need for Escalation:** Do we need external support (Supabase, Railway)?

**Update stakeholders:**
- Post in #incidents with severity and initial assessment
- For P0/P1: Post on status page (if exists)
- For P0: Send customer email if >10% users affected

### Phase 3: Investigation (Ongoing)

**Use the following process:**

1. **Check Health Endpoints:**
   ```bash
   curl https://your-backend.up.railway.app/health
   curl https://your-backend.up.railway.app/health/detailed
   ```

2. **Check Recent Deployments:**
   - Railway dashboard → Deployments
   - Vercel dashboard → Deployments
   - Did we deploy in last hour? Consider rollback

3. **Check Error Logs:**
   - Sentry dashboard for error spikes
   - Railway logs for backend errors
   - Vercel logs for frontend errors

4. **Check External Dependencies:**
   - Supabase status: https://status.supabase.com
   - Upstash status: Check console
   - Stripe status: https://status.stripe.com
   - Gemini API status: Check Google Cloud status

5. **Check Resource Usage:**
   - Railway: CPU, Memory, Disk
   - Supabase: Connection count, query performance
   - Upstash: Command rate, memory

**Document everything:**
- Commands run and their output
- Hypotheses tested
- Timeline of events
- Root cause (once identified)

### Phase 4: Resolution (Ongoing)

**Possible Actions:**

1. **Rollback Deployment:**
   ```bash
   # Railway
   Railway Dashboard → Deployments → Click previous deployment → Redeploy

   # Vercel
   Vercel Dashboard → Deployments → Previous deployment → Promote to Production
   ```

2. **Restart Services:**
   ```bash
   # Railway
   Railway Dashboard → Your Service → Settings → Restart
   ```

3. **Increase Resources:**
   ```bash
   # Railway - if CPU/memory maxed
   Railway Dashboard → Your Service → Settings → Increase memory/CPU
   ```

4. **Apply Hotfix:**
   - Create hotfix branch from production
   - Make minimal change to fix issue
   - Deploy to production immediately
   - Create incident report issue

5. **Enable Maintenance Mode (last resort):**
   ```bash
   # Set environment variable
   MAINTENANCE_MODE=true

   # Backend returns 503 with message
   # Frontend shows maintenance page
   ```

### Phase 5: Recovery Verification (5-30 minutes)

**Verify resolution:**
1. Check health endpoints return 200 OK
2. Check UptimeRobot shows green
3. Check Sentry error rate back to normal
4. Manually test affected functionality
5. Monitor for 15 minutes to ensure stability

**Communication:**
- Update #incidents: "Resolved - monitoring"
- Update status page: "All systems operational"
- Send recovery email to affected users (for P0/P1)

### Phase 6: Post-Incident Review (Within 48 hours)

**Required for P0 and P1 incidents:**
1. Schedule post-mortem meeting (30-60 min)
2. Fill out post-mortem template (see below)
3. Create action items to prevent recurrence
4. Share post-mortem with team
5. Update runbooks based on learnings

---

## Incident Severity Levels

### P0 - Critical (Production Down)

**Definition:**
- Complete site outage (frontend or backend completely down)
- Payment processing completely broken
- Data loss or corruption detected
- Security breach detected

**Impact:**
- >50% of users cannot use core functionality
- Revenue impact: >$100/hour
- Brand reputation at risk

**Response:**
- **Response Time:** 15 minutes
- **Escalation:** Immediate
- **Notifications:** Email + SMS + Phone + Status page
- **Communication:** Update every 30 minutes until resolved
- **Post-Mortem:** Required within 24 hours

**Example Incidents:**
- Backend returns 500 for all requests
- Database completely unreachable
- Frontend won't load at all
- Stripe webhook processing failed, orders not fulfilling

### P1 - High (Degraded Service)

**Definition:**
- Partial functionality broken (e.g., uploads not working)
- Error rate >5% but site mostly functional
- Payment processing degraded (slow but working)
- Database very slow (>2s queries)

**Impact:**
- 10-50% of users affected
- Core functionality degraded but alternative exists
- Revenue impact: $10-100/hour

**Response:**
- **Response Time:** 1 hour
- **Escalation:** After 2 hours if not resolved
- **Notifications:** Email + SMS + Status page
- **Communication:** Update every hour until resolved
- **Post-Mortem:** Required within 48 hours

**Example Incidents:**
- Worker stopped processing jobs (queue backing up)
- Image uploads failing 50% of the time
- Checkout slow but functional
- Redis down (degrades to no caching)

### P2 - Medium (Non-Critical Issue)

**Definition:**
- Error rate 1-5%
- Non-core functionality broken (e.g., design save feature)
- Performance degraded but acceptable
- External API intermittently failing

**Impact:**
- <10% of users affected
- Workaround available
- Minimal revenue impact

**Response:**
- **Response Time:** 4 hours (during business hours)
- **Escalation:** Not required
- **Notifications:** Email
- **Communication:** Update when resolved
- **Post-Mortem:** Optional

**Example Incidents:**
- Background removal service intermittently failing (fallback to original)
- Design sharing not working
- Email notifications delayed
- Admin dashboard slow

### P3 - Low (Minor Issue)

**Definition:**
- New error type detected (low volume)
- Minor UI bug
- Performance slightly degraded
- Non-production environment issue

**Impact:**
- <1% of users affected
- No revenue impact
- Can be fixed during normal work hours

**Response:**
- **Response Time:** 24 hours
- **Escalation:** Not required
- **Notifications:** Email (log in ticket system)
- **Communication:** None required
- **Post-Mortem:** Not required

**Example Incidents:**
- Logging error in Sentry (not affecting users)
- Typo on About page
- Development environment database slow
- New browser console warning

---

## On-Call Rotation

### Current Rotation

**Primary On-Call:** Brandon Shore
- **Responsibilities:**
  - Respond to P0/P1 alerts within SLA
  - Triage and resolve incidents
  - Escalate if needed
  - Document incident in tracking system

**Secondary On-Call:** (To be assigned)
- **Responsibilities:**
  - Backup for Primary if no response
  - Help with complex incidents
  - Cover during Primary's time off

### On-Call Schedule

**Rotation:** Weekly (Monday 9am - Monday 9am)
**Handoff:** Monday morning Slack message

**Handoff Message Template:**
```
:rotating_light: On-Call Handoff - Week of [Date]

Primary: @[Name]
Secondary: @[Name]

Last Week Summary:
- Incidents: [count] (P0: X, P1: Y, P2: Z)
- Notable: [any ongoing issues or watch items]
- Action Items: [pending tasks from last week]

This Week Watch Items:
- [Anything to monitor this week]
- [Planned deployments]

Good luck! :muscle:
```

### On-Call Expectations

**During On-Call:**
- Respond to P0 within 15 minutes
- Respond to P1 within 1 hour
- Have laptop and phone nearby
- Have access to all systems
- Be prepared to join video call if needed

**Not Required:**
- Be at computer 24/7
- Work overnight unless P0
- Skip personal time for P2/P3

---

## Communication Templates

### Internal Team Alert (Slack)

```
:rotating_light: INCIDENT - [P0/P1/P2] - [Brief Description]

Status: Investigating / Identified / Monitoring / Resolved
Severity: P[0-3]
Impact: [% of users affected, which features]
Started: [timestamp]
ETA: [if known]

Current Actions:
- [What we're doing right now]

Updates:
- [timestamp] - [status update]
- [timestamp] - [status update]

Incident Doc: [link to tracking doc]
```

### Customer Communication (Status Page / Email)

**Incident Detected:**
```
Subject: [Action Required] Service Disruption Detected

We're currently experiencing issues with [affected functionality].
Our team is investigating and working on a resolution.

Affected: [What's broken]
Workaround: [If available]
Status: [Link to status page]

We'll provide updates every [30 min for P0, 1 hour for P1].

We apologize for the inconvenience.
```

**Incident Resolved:**
```
Subject: [Resolved] Service Restored

The issue affecting [functionality] has been resolved.

Root Cause: [Brief explanation]
Resolution: [What we did]
Prevention: [What we're doing to prevent recurrence]

Affected Time: [duration]
Affected Users: [approximate count]

If you continue to experience issues, please contact support@stolentee.com.

Thank you for your patience.
```

---

## Runbooks

Quick procedures for common incidents. See `/docs/runbooks/` for detailed runbooks.

### Site Outage Runbook

**Symptoms:** UptimeRobot alerts, users can't access site

**Investigation:**
1. Check if DNS is working: `dig stolentee.com`
2. Check Railway status: Dashboard → Deployments
3. Check Vercel status: Dashboard → Deployments
4. Check health endpoint: `curl https://backend.railway.app/health`

**Common Causes & Fixes:**

**If Railway deployment failed:**
```bash
# Rollback to previous deployment
Railway Dashboard → Deployments → Previous → Redeploy
```

**If Railway crashed (OOM):**
```bash
# Increase memory
Railway Dashboard → Service → Settings → Memory → Increase
# Restart service
Settings → Restart
```

**If database down:**
See [Database Down Runbook](#database-down-runbook)

### Database Down Runbook

**Symptoms:** Health check shows database down, Sentry full of DB errors

**Investigation:**
1. Check Supabase status: https://status.supabase.com
2. Check Supabase dashboard: Project → Database → Connections
3. Check for connection leak: Connections > 15 = leak

**Common Causes & Fixes:**

**If Supabase outage:**
```bash
# Wait for Supabase to recover
# Post on status page
# Monitor https://status.supabase.com
```

**If connection pool exhausted:**
```bash
# Check current connections
SELECT count(*) FROM pg_stat_activity;

# Kill idle connections (if needed)
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE state = 'idle' AND state_change < now() - interval '5 minutes';

# Restart backend to reset connection pool
Railway Dashboard → Backend → Settings → Restart
```

**If database disk full:**
```bash
# Check database size
Supabase Dashboard → Database → Usage

# Delete old data or upgrade plan
# Cleanup: Delete old jobs, designs, uploads
```

### Redis Down Runbook

**Symptoms:** Health check shows Redis down, worker not processing jobs

**Investigation:**
1. Check Upstash console: https://console.upstash.com
2. Check command rate: Approaching free tier limit?
3. Check backend logs for connection errors

**Common Causes & Fixes:**

**If Upstash outage:**
```bash
# Wait for recovery
# Worker will fail gracefully (jobs stay queued)
# Backend will work but degraded (no rate limiting)
```

**If rate limit exceeded:**
```bash
# Upgrade Upstash plan
# Or optimize: reduce job polling frequency
```

**If connection issue:**
```bash
# Restart backend
Railway Dashboard → Backend → Settings → Restart
```

### High Error Rate Runbook

**Symptoms:** Sentry alert, error rate >5%

**Investigation:**
1. Check Sentry: Which errors? Which endpoints?
2. Check if recent deployment: Railway → Deployments
3. Check if external API down: Gemini, Remove.bg, Stripe

**Common Causes & Fixes:**

**If caused by recent deployment:**
```bash
# Rollback immediately
Railway Dashboard → Previous Deployment → Redeploy
```

**If external API down:**
```bash
# Check circuit breaker stats
curl https://backend.railway.app/health/detailed

# If Gemini down: Jobs will fail (queue retry later)
# If Remove.bg down: Fallback to original image
# If Stripe down: Contact Stripe support
```

### Worker Stuck Runbook

**Symptoms:** Jobs stuck in "processing" state, queue backing up

**Investigation:**
1. Check worker logs: Railway → Worker service → Logs
2. Check job queue length: Query database `jobs` table
3. Check if worker is running: Railway → Worker → Metrics

**Common Causes & Fixes:**

**If worker crashed:**
```bash
# Restart worker
Railway Dashboard → Worker → Settings → Restart
```

**If worker stuck on a job:**
```bash
# BullMQ will auto-recover after stalled timeout (2 retries)
# If not, manually fail the job
UPDATE jobs SET status = 'failed', error = 'Manual intervention - stalled job'
WHERE id = 'stuck_job_id';

# Restart worker
Railway Dashboard → Worker → Settings → Restart
```

**If rate limited by external API:**
```bash
# Wait for rate limit to reset
# Gemini: 60 requests/minute
# Remove.bg: Depends on plan
```

### Payment Issues Runbook

**Symptoms:** Stripe webhooks failing, orders not created

**Investigation:**
1. Check Stripe dashboard: Payments → Events
2. Check webhook endpoint: Railway logs for `/webhooks/stripe`
3. Check webhook signature verification

**Common Causes & Fixes:**

**If webhook endpoint down:**
```bash
# Fix backend and restart
# Re-send failed webhooks from Stripe dashboard
Stripe Dashboard → Developers → Webhooks → [Endpoint] → Failed events → Resend
```

**If signature verification failing:**
```bash
# Check STRIPE_WEBHOOK_SECRET is correct
# Regenerate secret if needed (Stripe Dashboard → Webhooks)
# Update environment variable
Railway Dashboard → Backend → Variables → STRIPE_WEBHOOK_SECRET
```

---

## Post-Mortem Process

### When to Write a Post-Mortem

**Required:**
- All P0 incidents
- All P1 incidents
- Any incident that affects payments
- Any incident with customer complaints

**Optional but Recommended:**
- P2 incidents with interesting learnings
- Near-misses (almost became P0)
- Repeated P3 incidents

### Post-Mortem Template

Save as `/docs/post-mortems/YYYY-MM-DD-incident-name.md`

```markdown
# Post-Mortem: [Incident Title]

**Date:** [YYYY-MM-DD]
**Severity:** P[0-3]
**Duration:** [X hours Y minutes]
**Affected Users:** [count or percentage]
**Author:** [Name]

## Summary

[2-3 sentence summary of what happened and impact]

## Timeline (All times in UTC)

- **14:23** - First alert received (UptimeRobot)
- **14:25** - Incident confirmed, investigation started
- **14:30** - Root cause identified (database connection pool exhausted)
- **14:35** - Fix applied (restarted backend, killed idle connections)
- **14:40** - Recovery verified, monitoring
- **14:55** - Incident closed, all systems normal

## Root Cause

[Detailed explanation of what went wrong]

**Contributing Factors:**
1. [Factor 1]
2. [Factor 2]

## Impact

**User Impact:**
- [What users experienced]
- [How many users affected]

**Business Impact:**
- [Revenue lost]
- [Orders lost]
- [Support tickets]

## Resolution

**What We Did:**
1. [Step 1]
2. [Step 2]

**Why It Worked:**
[Explanation]

## Lessons Learned

**What Went Well:**
- Alert detection was immediate
- Rollback process was smooth
- Communication was clear

**What Went Poorly:**
- Took too long to identify root cause
- Didn't have runbook for this scenario
- Monitoring didn't catch early warning signs

## Action Items

1. **[Action]** - Assigned: [Name] - Due: [Date] - Priority: High
2. **[Action]** - Assigned: [Name] - Due: [Date] - Priority: Medium

## Prevention

To prevent this from happening again:
- [Specific change 1]
- [Specific change 2]
- [Monitoring improvement]
```

### Post-Mortem Best Practices

1. **Blameless:** Focus on systems, not people
2. **Timely:** Write within 48 hours of incident
3. **Actionable:** Every post-mortem should have action items
4. **Shared:** Post in team channel for review
5. **Referenced:** Link from runbooks if relevant

---

## Incident Tracking

### Incident Log

Maintain a log of all incidents: `/docs/incident-log.md`

```markdown
# Incident Log

| Date | Severity | Description | Duration | Root Cause | Post-Mortem |
|------|----------|-------------|----------|------------|-------------|
| 2025-11-27 | P1 | Worker stuck | 2h | Rate limit | [Link](#) |
| 2025-11-20 | P0 | Site down | 30m | Deployment | [Link](#) |
```

### Incident Metrics

Track monthly:
- Total incidents by severity
- Mean Time to Detect (MTTD)
- Mean Time to Resolve (MTTR)
- Repeat incidents (same root cause)

**Goals:**
- MTTD: <5 minutes (detection)
- MTTR (P0): <1 hour (resolution)
- MTTR (P1): <4 hours
- Repeat incidents: 0 (learn from mistakes)

---

## Related Documentation

- [MONITORING.md](./MONITORING.md) - Monitoring and alerting setup
- [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) - Common problems and solutions
- [BACKUPS.md](./BACKUPS.md) - Backup and restore procedures
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Deployment procedures
