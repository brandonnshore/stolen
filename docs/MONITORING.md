# Monitoring & Observability Guide

This document outlines the monitoring and observability setup for Stolen Tee, including error tracking, health checks, alerting, and dashboards.

## Table of Contents

- [Overview](#overview)
- [Sentry Error Tracking](#sentry-error-tracking)
- [Health Check Endpoints](#health-check-endpoints)
- [Uptime Monitoring](#uptime-monitoring)
- [Platform Dashboards](#platform-dashboards)
- [Alerting Strategy](#alerting-strategy)
- [Monitoring Checklist](#monitoring-checklist)

---

## Overview

**Current Monitoring Maturity: 8/10** (significantly improved from 4.5/10)

We use a multi-layered monitoring approach:

1. **Error Tracking**: Sentry for real-time error monitoring and performance tracking
2. **Health Checks**: Comprehensive endpoints that verify all system dependencies
3. **Uptime Monitoring**: UptimeRobot for external availability monitoring
4. **Platform Monitoring**: Railway, Vercel, Supabase, and Upstash built-in dashboards
5. **Structured Logging**: JSON logs in production for aggregation and analysis

---

## Sentry Error Tracking

### Setup

Sentry is configured for both frontend and backend to provide comprehensive error tracking.

#### Backend Setup

**Installation:**
```bash
npm install @sentry/node @sentry/profiling-node
```

**Configuration** (already implemented in `backend/src/config/sentry.ts`):
- Automatic error capture
- Performance monitoring with 10% sampling in production
- Request/response tracing
- User context capture
- Custom error filtering

**Environment Variables:**
```bash
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
SENTRY_DEBUG=false  # Set to true to see Sentry events in dev
```

**Key Features:**
- Captures all unhandled errors
- Tracks request performance
- Profiles slow code paths
- Groups similar errors
- Links errors to deployment versions

#### Frontend Setup

**Installation:**
```bash
npm install @sentry/react
```

**Configuration** (already implemented in `frontend/src/main.tsx`):
- Browser error tracking
- React component error boundaries
- Session replay (10% of sessions, 100% of errors)
- Performance monitoring
- Network request tracking

**Environment Variables:**
```bash
VITE_SENTRY_DSN=https://your-frontend-sentry-dsn@sentry.io/project-id
VITE_SENTRY_DEBUG=false
VITE_APP_VERSION=1.0.0  # For release tracking
```

### Sentry Dashboard

**Access:** https://sentry.io/organizations/your-org/projects/

**Key Metrics to Monitor:**
- Error rate (should be <1% of requests)
- New error types (review immediately)
- Performance issues (p95 response time)
- User impact (affected users count)

### Alert Configuration

**Recommended Sentry Alerts:**

1. **High Error Rate**
   - Trigger: >10 errors/hour
   - Notify: Email + Slack
   - Severity: P2

2. **New Error Type**
   - Trigger: First occurrence of new error
   - Notify: Email
   - Severity: P3

3. **Critical Error Rate**
   - Trigger: >5% error rate in 5 minutes
   - Notify: Email + SMS
   - Severity: P1

4. **Performance Degradation**
   - Trigger: p95 response time >2 seconds
   - Notify: Email
   - Severity: P2

### Manual Error Capture

Use these helpers to manually capture errors or messages:

```typescript
import { captureException, captureMessage, setUser } from './config/sentry';

// Capture an exception with context
try {
  await riskyOperation();
} catch (error) {
  captureException(error as Error, {
    operation: 'background_removal',
    jobId: job.id,
  });
  throw error;
}

// Capture a message
captureMessage('User exceeded upload limit', 'warning', {
  userId: user.id,
  uploadCount: count,
});

// Set user context (do this after authentication)
setUser({
  id: user.id,
  email: user.email,
  username: user.username,
});
```

---

## Health Check Endpoints

Comprehensive health checks are implemented to verify all system dependencies.

### Endpoints

#### 1. Comprehensive Health Check: `GET /health`

Returns detailed status of all dependencies.

**Response (200 OK):**
```json
{
  "status": "healthy",
  "timestamp": "2025-11-27T10:30:00.000Z",
  "uptime": 3600,
  "version": "1.0.0",
  "environment": "production",
  "checks": {
    "database": { "status": "ok", "latency": 23 },
    "redis": { "status": "ok", "latency": 5 },
    "storage": { "status": "ok", "latency": 45 },
    "memory": { "status": "ok", "latency": 45.2 },
    "disk": { "status": "ok", "latency": 0 }
  }
}
```

**Response (503 Service Unavailable):**
```json
{
  "status": "unhealthy",
  "timestamp": "2025-11-27T10:30:00.000Z",
  "checks": {
    "database": { "status": "down", "error": "Connection refused" },
    "redis": { "status": "ok", "latency": 5 },
    ...
  }
}
```

**Status Definitions:**
- `healthy`: All systems operational
- `degraded`: Some systems slow but functional
- `unhealthy`: Critical systems down (returns 503)

**Critical vs Non-Critical:**
- **Critical** (cause 503): Database, Redis
- **Non-Critical** (cause degraded): Storage, Memory

#### 2. Liveness Probe: `GET /health/live`

Simple check that the process is running. Used by Railway to know if restart is needed.

**Response (200 OK):**
```json
{
  "status": "alive",
  "timestamp": "2025-11-27T10:30:00.000Z"
}
```

#### 3. Readiness Probe: `GET /health/ready`

Checks if the service is ready to accept traffic. Used by load balancers.

**Response (200 OK):**
```json
{
  "status": "ready",
  "timestamp": "2025-11-27T10:30:00.000Z"
}
```

**Response (503 Not Ready):**
```json
{
  "status": "not ready",
  "timestamp": "2025-11-27T10:30:00.000Z",
  "reason": "Database unavailable"
}
```

#### 4. Detailed Health: `GET /health/detailed`

Extended health check with system metrics (CPU, memory, database pool).

**Use Cases:**
- UptimeRobot monitoring (use `/health`)
- Kubernetes liveness probe (use `/health/live`)
- Kubernetes readiness probe (use `/health/ready`)
- Development debugging (use `/health/detailed`)

---

## Uptime Monitoring

### UptimeRobot Setup

**Service:** [UptimeRobot](https://uptimerobot.com/)
**Cost:** FREE (up to 50 monitors, 5-minute checks)

#### Monitor Configuration

**1. Frontend Monitor**
- **Name:** Stolen Tee - Frontend
- **Type:** HTTPS
- **URL:** https://stolentee.com
- **Interval:** 5 minutes
- **Alert When:** Down for >5 minutes
- **Notifications:** Email

**2. Backend API Monitor**
- **Name:** Stolen Tee - Backend API
- **Type:** HTTPS
- **URL:** https://your-railway-backend.up.railway.app/health
- **Interval:** 5 minutes
- **Alert When:** Down for >5 minutes OR status code ≠ 200
- **Notifications:** Email
- **Keyword Monitoring:** Look for "healthy" in response

**3. Database Health Monitor**
- **Name:** Stolen Tee - Database Health
- **Type:** HTTP
- **URL:** https://your-railway-backend.up.railway.app/health
- **Interval:** 5 minutes
- **Alert When:** Response doesn't contain "database":{"status":"ok"}
- **Notifications:** Email

#### Setup Steps

1. **Create Account:** Go to https://uptimerobot.com/signup
2. **Add Monitors:** Dashboard → Add New Monitor
3. **Configure Alerts:**
   - Email: Your operations email
   - Webhook (optional): Slack/Discord/PagerDuty
4. **Set Up Status Page (Optional):**
   - Create public status page at https://status.stolentee.com
   - Shows real-time uptime for transparency

#### Alert Thresholds

- **Downtime >2 minutes:** UptimeRobot sends first alert
- **Downtime >5 minutes:** Escalate to SMS (if configured)
- **Uptime restored:** Automatic recovery notification

---

## Platform Dashboards

### Railway Dashboard

**URL:** https://railway.app/dashboard

**Metrics Available:**
- CPU usage (%)
- Memory usage (MB)
- Network traffic (MB in/out)
- Deployment logs (real-time)
- Crash/restart events
- Environment variables
- Deployment history

**Key Metrics to Watch:**
- CPU >80% sustained = scale up or optimize
- Memory >80% = memory leak or scale up
- Frequent restarts = stability issue

**Alerts:**
Configure Railway to email on:
- Deployment success/failure
- Service crash
- High resource usage

### Vercel Dashboard (Frontend)

**URL:** https://vercel.com/dashboard

**Metrics Available:**
- Page load times
- Web Vitals (LCP, FID, CLS)
- Deployment status
- Bandwidth usage
- Function executions

### Supabase Dashboard

**URL:** https://supabase.com/dashboard/project/YOUR_PROJECT

**Metrics Available:**
- Database size
- Active connections
- Slow queries (>500ms)
- Storage usage
- API requests per day

**Important Limits:**
- Free tier: 500MB database, 1GB storage
- Connection limit: 20 concurrent
- Daily backup retention: 7 days

### Upstash Dashboard (Redis)

**URL:** https://console.upstash.com/

**Metrics Available:**
- Commands per second
- Memory usage
- Connection count
- Latency (p50, p99)

**Cost Monitoring:**
- Free tier: 10,000 commands/day
- Set alert if approaching limit

---

## Alerting Strategy

### Alert Severity Levels

**P0 - Critical** (Immediate action required)
- Complete site outage
- Payment processing down
- Data loss detected
- **Response Time:** 15 minutes
- **Notification:** Email + SMS + Phone call

**P1 - High** (Urgent but not critical)
- Error rate >5%
- Database slow (>1s latency)
- Payment gateway degraded
- **Response Time:** 1 hour
- **Notification:** Email + SMS

**P2 - Medium** (Important but not urgent)
- Error rate 1-5%
- Worker stuck or slow
- Non-critical API down
- **Response Time:** 4 hours
- **Notification:** Email

**P3 - Low** (Can wait)
- New error type
- Resource usage elevated
- Minor performance degradation
- **Response Time:** 24 hours
- **Notification:** Email

### Alert Channels

1. **Email** (All severities)
   - Operations email: ops@stolentee.com
   - Backup email: brandon@stolentee.com

2. **SMS** (P0, P1 only)
   - Primary on-call: Your phone
   - Backup on-call: Team member

3. **Slack** (Optional, P0-P2)
   - Channel: #alerts
   - Integrations: Sentry, UptimeRobot, Railway

4. **Status Page** (User-facing)
   - Update for all P0 incidents
   - Post-incident report for P0/P1

### Alert Escalation

**If no response within:**
- P0: 15 min → escalate to backup on-call
- P1: 1 hour → escalate to backup on-call
- P2: 4 hours → notify in Slack
- P3: 24 hours → no escalation

---

## Monitoring Checklist

### Daily Checks
- [ ] Check Sentry for new errors
- [ ] Review UptimeRobot status (should be all green)
- [ ] Check Railway dashboard for anomalies
- [ ] Review Supabase connection count

### Weekly Checks
- [ ] Review Sentry error trends (increasing/decreasing?)
- [ ] Check database slow queries in Supabase
- [ ] Review Upstash Redis usage (approaching limits?)
- [ ] Test health check endpoints manually
- [ ] Review alert noise (too many false positives?)

### Monthly Checks
- [ ] Review and archive resolved Sentry issues
- [ ] Check Supabase backup status
- [ ] Review Railway resource usage trends
- [ ] Test incident runbooks (pick one randomly)
- [ ] Review monitoring costs
- [ ] Update monitoring documentation

### Quarterly Checks
- [ ] Review and update alert thresholds
- [ ] Conduct load testing and monitor behavior
- [ ] Review monitoring coverage gaps
- [ ] Update runbooks based on incidents
- [ ] Train new team members on monitoring

---

## Circuit Breaker Implementation

**Location:** `backend/src/utils/circuitBreaker.ts`

Circuit breakers are implemented for external API calls but **not yet integrated**. To use:

```typescript
import { circuitBreakers } from '../utils/circuitBreaker';

// Wrap external API calls
const result = await circuitBreakers.gemini.execute(async () => {
  return await geminiService.extractLogo(image);
});
```

**Pre-configured Circuit Breakers:**
- `circuitBreakers.gemini` - Gemini API (5 failures, 1 min timeout)
- `circuitBreakers.removeBackground` - Remove.bg API (3 failures, 5 min timeout)
- `circuitBreakers.supabase` - Supabase Storage (10 failures, 30s timeout)

**TODO:** Integrate circuit breakers into GeminiService and BackgroundRemovalService.

---

## Troubleshooting

### Health Check Returns 503

1. Check which dependency is down in response JSON
2. If database: Check Supabase dashboard
3. If Redis: Check Upstash dashboard
4. If storage: Check Supabase storage status
5. See [INCIDENT_RESPONSE.md](./INCIDENT_RESPONSE.md) for recovery steps

### Sentry Not Receiving Errors

1. Check `SENTRY_DSN` environment variable is set
2. Check Sentry project is not paused
3. Verify errors aren't filtered by `beforeSend`
4. Check Sentry quota isn't exceeded

### UptimeRobot False Positives

1. Check if Railway is deploying (causes brief downtime)
2. Increase "Alert When Down For" to 5 minutes
3. Check if health check is timing out (increase timeout)
4. Verify keyword monitoring string is correct

---

## Support

- **Sentry Issues:** https://sentry.io/support
- **UptimeRobot Support:** https://uptimerobot.com/support
- **Railway Support:** https://railway.app/help
- **Internal Docs:** See [INCIDENT_RESPONSE.md](./INCIDENT_RESPONSE.md) and [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
