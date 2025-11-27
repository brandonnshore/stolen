# Infrastructure Monitoring Dashboard Setup

**Purpose:** Real-time monitoring and alerting for Stolen Tee infrastructure
**Target Scale:** 1,000 concurrent users
**Tools:** Railway Dashboard + Optional Datadog/New Relic

---

## 1. Railway Built-in Monitoring (FREE)

### Dashboard Access
- **URL:** https://railway.app/project/[project-id]
- **Metrics Available:** CPU, Memory, Network, Deployment logs

### Metrics to Monitor

#### Backend API Service
```
CPU Usage:
- Normal: 10-30%
- Alert at: > 70% for 5 minutes
- Critical: > 90% for 2 minutes

Memory Usage:
- Normal: 150-300MB
- Alert at: > 400MB
- Critical: > 450MB (approaching 512MB limit)

Network:
- Normal: 10-50 MB/hour
- Spike: 100-200 MB/hour (traffic spike)
```

#### Worker Service
```
CPU Usage:
- Idle: < 5%
- Processing: 40-60% (2 concurrent jobs)
- Alert at: > 80% sustained

Memory Usage:
- Normal: 200-400MB
- Processing: 400-600MB (image processing)
- Alert at: > 1.5GB (approaching 2GB limit)
```

#### Rembg Service
```
CPU Usage:
- Idle: < 5%
- Processing: 70-90% (ML model inference)
- Normal: Spiky usage pattern

Memory Usage:
- Normal: 1.2-1.5GB (ML model loaded)
- Alert at: > 1.8GB
- Model size: ~170MB (loaded once)
```

---

## 2. Application-Level Metrics

### Health Check Endpoints

#### Basic Health (`/health`)
```bash
# Check if service is up
curl https://api.stolentee.com/health

# Expected response (200 OK)
{
  "status": "ok",
  "timestamp": "2025-11-26T12:00:00.000Z"
}
```

#### Detailed Health (`/health/detailed`)
```bash
# Get comprehensive metrics
curl https://api.stolentee.com/health/detailed

# Response includes:
{
  "memory": {
    "used": 150,       // MB
    "total": 512,      // MB
    "usedPercent": 29
  },
  "database": {
    "latency": 12,     // ms
    "status": "healthy",
    "pool": {
      "total": 15,
      "idle": 10,
      "waiting": 0
    }
  },
  "infrastructure": {
    "rembgSelfHosted": true,
    "r2Storage": true,
    "estimatedMonthlySavings": "$2,000"
  }
}
```

#### Liveness Probe (`/health/live`)
```bash
# Used by Railway for auto-restart
curl https://api.stolentee.com/health/live

# Returns 200 if process is running
# Railway restarts if returns 503 or no response
```

#### Readiness Probe (`/health/ready`)
```bash
# Used by load balancer
curl https://api.stolentee.com/health/ready

# Returns 200 if ready to accept traffic
# Returns 503 if database unavailable
```

### Monitoring Script (Cron Job)
```bash
#!/bin/bash
# /scripts/monitor-health.sh

API_URL="https://api.stolentee.com"
SLACK_WEBHOOK="https://hooks.slack.com/services/YOUR/WEBHOOK"

# Check health endpoint
HEALTH_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" $API_URL/health)

if [ $HEALTH_RESPONSE -ne 200 ]; then
  curl -X POST $SLACK_WEBHOOK \
    -H 'Content-Type: application/json' \
    -d "{\"text\": \"🚨 API health check failed: HTTP $HEALTH_RESPONSE\"}"
fi

# Check detailed metrics
DETAILED=$(curl -s $API_URL/health/detailed)
MEMORY_PERCENT=$(echo $DETAILED | jq -r '.memory.usedPercent')
DB_LATENCY=$(echo $DETAILED | jq -r '.database.latency')

# Alert if memory > 80%
if [ $MEMORY_PERCENT -gt 80 ]; then
  curl -X POST $SLACK_WEBHOOK \
    -H 'Content-Type: application/json' \
    -d "{\"text\": \"⚠️ High memory usage: ${MEMORY_PERCENT}%\"}"
fi

# Alert if database latency > 100ms
if [ $DB_LATENCY -gt 100 ]; then
  curl -X POST $SLACK_WEBHOOK \
    -H 'Content-Type: application/json' \
    -d "{\"text\": \"⚠️ Slow database: ${DB_LATENCY}ms\"}"
fi
```

### Cron Configuration
```bash
# Run health check every 5 minutes
*/5 * * * * /path/to/monitor-health.sh
```

---

## 3. Database Monitoring

### Connection Pool Metrics
The application logs real-time connection pool metrics:

```typescript
// database.ts - Lines 36-72
pool.on('connect', (client) => {
  logger.debug('Database connection established', {
    totalCount: pool.totalCount,    // Total connections
    idleCount: pool.idleCount,      // Available connections
    waitingCount: pool.waitingCount, // Requests waiting for connection
  });
});
```

### Query Performance
All queries are logged with duration:

```typescript
// database.ts - Lines 84-89
logger.query(text, duration, res.rowCount);
// Logs: [QUERY] SELECT * FROM products (12ms, 10 rows)
```

### Slow Query Alerts
```bash
# Filter Railway logs for slow queries
railway logs | grep "QUERY" | grep -E "[0-9]{3,}ms"

# Example output:
# [QUERY] SELECT * FROM orders WHERE customer_id = $1 (234ms, 50 rows)
```

### Connection Pool Health
```bash
# Check pool status via detailed health endpoint
curl -s https://api.stolentee.com/health/detailed | jq '.database.pool'

# Expected output:
{
  "total": 15,    // Total connections created
  "idle": 10,     // Available for use
  "waiting": 0    // Requests waiting (should be 0)
}

# If waiting > 0: Connection pool exhausted, need to scale
```

---

## 4. Queue Monitoring (BullMQ)

### Queue Depth
Monitor job queue depth to detect backlog:

```bash
# Connect to Redis and check queue length
redis-cli -u $REDIS_URL LLEN bull:logo-extraction:wait

# Normal: 0-5 jobs
# Busy: 5-10 jobs
# Backlog: > 20 jobs (alert)
```

### Job Processing Metrics

```typescript
// extractionWorker.ts logs all job events
worker.on('completed', (job) => {
  console.log(`✅ Job ${job.id} completed`);
});

worker.on('failed', (job, err) => {
  console.error(`❌ Job ${job.id} failed: ${err.message}`);
});
```

### Queue Statistics
```bash
# Get queue stats via Redis
redis-cli -u $REDIS_URL HGETALL bull:logo-extraction:counts

# Returns:
# completed: 1234
# failed: 12
# delayed: 0
# active: 2
# waiting: 3
```

---

## 5. Cost Monitoring

### Railway Usage API
```bash
# Get current month usage
curl -H "Authorization: Bearer $RAILWAY_API_TOKEN" \
  https://backboard.railway.app/graphql \
  -d '{"query": "{ usage { estimatedCost } }"}'
```

### Upstash Redis Usage
```bash
# Check Upstash dashboard
# URL: https://console.upstash.com

# Metrics:
# - Commands per day
# - Memory usage
# - Cost estimation
```

### Cost Alert Script
```bash
#!/bin/bash
# /scripts/check-costs.sh

# Check Railway estimated cost
RAILWAY_COST=$(curl -s -H "Authorization: Bearer $RAILWAY_API_TOKEN" \
  https://backboard.railway.app/graphql \
  -d '{"query": "{ usage { estimatedCost } }"}' | jq -r '.data.usage.estimatedCost')

THRESHOLD=100 # Alert if > $100/month

if [ $(echo "$RAILWAY_COST > $THRESHOLD" | bc) -eq 1 ]; then
  echo "⚠️ Railway cost exceeds threshold: \$$RAILWAY_COST"
  # Send Slack alert
fi
```

---

## 6. Optional: Datadog Integration

### Installation
```bash
# Install Datadog tracer
npm install dd-trace

# Set environment variables in Railway
DD_API_KEY=your_datadog_api_key
DD_SITE=datadoghq.com
DD_ENV=production
DD_SERVICE=stolentee-api
DD_VERSION=1.0.0
```

### Integration Code
```typescript
// src/index.ts - Add at very top
import 'dd-trace/init'; // Must be first import

// Rest of your application code
```

### Custom Metrics
```typescript
import { StatsD } from 'hot-shots';

const statsd = new StatsD({
  host: 'localhost',
  port: 8125,
  prefix: 'stolentee.'
});

// Track custom metrics
statsd.increment('uploads.count');
statsd.timing('job.processing_time', 2500); // 2.5 seconds
statsd.gauge('queue.depth', 5);
```

### Datadog Dashboard
- **APM (Application Performance Monitoring):** Request traces, latency, errors
- **Infrastructure:** CPU, memory, network
- **Logs:** Centralized log aggregation
- **Custom Dashboards:** Business metrics

**Cost:** $15/host/month (1 host = $15, 3 hosts = $45)

---

## 7. Alert Configuration

### Critical Alerts (PagerDuty/Slack)

```yaml
alerts:
  critical:
    - name: "API Down"
      condition: "health_check != 200"
      duration: "2 minutes"
      channel: "#critical-alerts"

    - name: "Database Down"
      condition: "database.status == 'down'"
      duration: "1 minute"
      channel: "#critical-alerts"

    - name: "High Error Rate"
      condition: "error_rate > 5%"
      duration: "5 minutes"
      channel: "#critical-alerts"

    - name: "Memory Critical"
      condition: "memory_usage > 90%"
      duration: "2 minutes"
      channel: "#critical-alerts"
```

### Warning Alerts (Email/Slack)

```yaml
  warnings:
    - name: "Slow Response Time"
      condition: "response_time_p95 > 1000ms"
      duration: "10 minutes"
      channel: "#warnings"

    - name: "High Memory"
      condition: "memory_usage > 80%"
      duration: "10 minutes"
      channel: "#warnings"

    - name: "Queue Backlog"
      condition: "queue_depth > 20"
      duration: "5 minutes"
      channel: "#warnings"

    - name: "Database Slow"
      condition: "database_latency > 100ms"
      duration: "10 minutes"
      channel: "#warnings"
```

### Informational (Dashboard Only)

```yaml
  info:
    - name: "Deployment"
      trigger: "deployment_event"
      channel: "#deployments"

    - name: "Scaling Event"
      trigger: "instance_scaled"
      channel: "#infrastructure"

    - name: "Cost Threshold"
      condition: "monthly_cost > $80"
      channel: "#finance"
```

---

## 8. Monitoring Dashboard (Grafana/Railway)

### Key Metrics to Display

**Row 1: Service Health**
- API Status (green/red indicator)
- Database Status
- Redis Status
- Rembg Service Status
- Overall Uptime (%)

**Row 2: Performance**
- API Response Time (p50, p95, p99)
- Database Query Time (p50, p95, p99)
- Queue Depth
- Job Processing Time

**Row 3: Infrastructure**
- CPU Usage (%) - all services
- Memory Usage (MB) - all services
- Network I/O (MB/s)
- Database Connections

**Row 4: Business Metrics**
- Uploads per hour
- Jobs completed per hour
- Orders per day
- Revenue per day
- Cost per job

**Row 5: Cost Optimization**
- Monthly infrastructure cost (projected)
- Cost per user
- Savings vs unoptimized
- Self-hosted rembg savings

---

## 9. Log Aggregation

### Railway Logs
```bash
# Stream live logs
railway logs

# Filter by service
railway logs --service backend

# Filter by level
railway logs | grep ERROR

# Export logs
railway logs > logs_$(date +%Y%m%d).txt
```

### Structured Logging
The application uses Winston logger with structured JSON logs:

```typescript
// utils/logger.ts
logger.info('Order created', {
  orderId: '123',
  customerId: '456',
  total: 59.99
});

// Output:
{
  "level": "info",
  "message": "Order created",
  "orderId": "123",
  "customerId": "456",
  "total": 59.99,
  "timestamp": "2025-11-26T12:00:00.000Z"
}
```

### Log Retention
- **Railway:** 7 days free tier, 30 days Pro
- **Datadog:** Configurable (15 days default)
- **Local Backup:** Export critical logs weekly

---

## 10. Uptime Monitoring

### UptimeRobot (Free)
```
Service: UptimeRobot
Plan: Free (50 monitors, 5-minute checks)
URL: https://uptimerobot.com

Monitors to create:
1. API Health Check (https://api.stolentee.com/health)
2. Frontend (https://stolentee.com)
3. Rembg Service (https://rembg-service.up.railway.app/health)

Alerts:
- Email (immediate)
- Slack webhook (optional)
- SMS (Pro tier)
```

### Status Page (Optional)
```
Service: Statuspage.io or Atlassian Status Page
Purpose: Public-facing uptime dashboard
URL: https://status.stolentee.com

Components:
- API
- Website
- Background Jobs
- Payment Processing

Incident Management:
- Create incident
- Post updates
- Resolve incident
- Post-mortem
```

---

## Summary

### Monitoring Checklist

**Free Tier (Minimum Required):**
- [x] Railway Dashboard (CPU, Memory, Network)
- [x] Health check endpoints (/health, /health/detailed)
- [x] Application logging (Winston)
- [x] UptimeRobot (uptime monitoring)
- [x] Manual cost tracking (spreadsheet)

**Recommended (< $50/month):**
- [ ] Datadog APM ($15/host)
- [ ] Slack alerts (free)
- [ ] Status page (free tier)
- [ ] Automated cost alerts (script)

**Enterprise (> $100/month):**
- [ ] PagerDuty ($21/user)
- [ ] New Relic ($99/month)
- [ ] Advanced analytics
- [ ] Multi-region monitoring

---

**Current Status:** FREE tier monitoring fully implemented ✅

**Next Steps:**
1. Set up UptimeRobot monitors (free)
2. Configure Slack webhooks for alerts
3. Create cost tracking spreadsheet
4. Consider Datadog for production (optional)
