# Horizontal Scaling Strategy
## Stolen Tee - Scale to 5,000+ Users

Last Updated: 2025-11-27

---

## Table of Contents
1. [Scaling Philosophy](#scaling-philosophy)
2. [Current Architecture](#current-architecture)
3. [Scaling Roadmap](#scaling-roadmap)
4. [Load Balancing](#load-balancing)
5. [Auto-Scaling Configuration](#auto-scaling-configuration)
6. [Database Scaling](#database-scaling)
7. [Performance Benchmarks](#performance-benchmarks)
8. [Cost at Scale](#cost-at-scale)

---

## Scaling Philosophy

### Principles

1. **Scale horizontally, not vertically**
   - Add more instances instead of bigger instances
   - Better reliability through redundancy
   - Easier to scale down during low traffic

2. **Optimize before scaling**
   - Fix N+1 queries
   - Add caching
   - Compress assets
   - Only scale when optimization is exhausted

3. **Measure everything**
   - Baseline performance metrics
   - Monitor after each change
   - Make data-driven decisions

4. **Cost-conscious scaling**
   - Target: < $5/month per user at scale
   - Optimize expensive operations (Remove.bg)
   - Use free tiers strategically

### Scaling Triggers

| Metric | Threshold | Action |
|--------|-----------|--------|
| **CPU Usage** | > 70% for 15 min | Scale up +1 instance |
| **Memory Usage** | > 80% | Scale up +1 instance |
| **Response Time (p95)** | > 1s | Scale up or optimize |
| **Error Rate** | > 2% | Investigate, possibly scale |
| **Queue Depth** | > 100 jobs | Add worker instance |
| **Database Connections** | > 80% of pool | Optimize or add read replica |

---

## Current Architecture

### Single Instance (0-100 Users)

```
┌────────────────────────────────────┐
│  Railway - Single Instance         │
│                                    │
│  ┌──────────────┐ ┌──────────────┐│
│  │  Express API │ │ BullMQ Worker││
│  │  (Port 3000) │ │ (Background) ││
│  └──────┬───────┘ └──────┬───────┘│
│         │                │        │
│         └────────┬───────┘        │
│                  ▼                │
│         ┌────────────────┐        │
│         │ Connection Pool│        │
│         │  (max 15 conn) │        │
│         └────────┬───────┘        │
└──────────────────┼────────────────┘
                   │
                   ▼
        ┌──────────────────┐
        │ Supabase Postgres│
        │   (Shared DB)    │
        └──────────────────┘
```

**Characteristics:**
- Single point of failure
- Limited to ~100 concurrent requests
- Manual restarts required
- Cost: $5/month

**Bottlenecks:**
- CPU bound (image processing)
- Memory bound (worker jobs)
- Database connection limit (15)

---

## Scaling Roadmap

### Phase 1: 100-500 Users (Month 2-6)

**Goal:** Separate API and Workers

```
┌─────────────────┐      ┌─────────────────┐
│  Railway API    │      │  Railway Worker │
│  (Auto-scale)   │      │  (Dedicated)    │
│                 │      │                 │
│  ┌───────────┐  │      │  ┌───────────┐  │
│  │ Express   │  │      │  │ BullMQ    │  │
│  │ API       │  │      │  │ Worker    │  │
│  │ (2-3 inst)│  │      │  │ (2GB RAM) │  │
│  └─────┬─────┘  │      │  └─────┬─────┘  │
└────────┼────────┘      └────────┼────────┘
         │                        │
         │      ┌─────────────────┘
         │      │
         ▼      ▼
    ┌────────────────┐
    │ Upstash Redis  │
    │  (Job Queue)   │
    └────────┬───────┘
             │
             ▼
    ┌────────────────┐
    │ Supabase DB    │
    └────────────────┘
```

**Implementation Steps:**

1. **Separate Worker Service (Week 1)**
   ```bash
   # Create new Railway service
   railway service create worker

   # Deploy worker-only instance
   # Set environment variable to disable API
   WORKER_ONLY=true
   ```

2. **Enable Auto-scaling for API (Week 2)**
   ```yaml
   # railway.json (if supported) or via dashboard
   services:
     api:
       instances:
         min: 1
         max: 3
       scaling:
         metric: cpu
         target: 70
   ```

3. **Optimize Connection Pool (Week 3)**
   ```typescript
   // Reduce connections per API instance
   const pool = new Pool({
     max: 5,  // Down from 15 (3 instances × 5 = 15 total)
     min: 1,
   });
   ```

**Expected Results:**
- Handle 500 concurrent users
- Better reliability (worker failures don't affect API)
- Faster API response (no background jobs blocking)
- Cost: ~$130/month

### Phase 2: 500-1,000 Users (Month 6-12)

**Goal:** Full Horizontal Scaling + Optimization

```
                    ┌──────────────┐
                    │   Cloudflare │
                    │   (CDN + LB) │
                    └───────┬──────┘
                            │
            ┌───────────────┼───────────────┐
            │               │               │
            ▼               ▼               ▼
    ┌────────────┐  ┌────────────┐  ┌────────────┐
    │ API Inst 1 │  │ API Inst 2 │  │ API Inst 3 │
    │  Railway   │  │  Railway   │  │  Railway   │
    └─────┬──────┘  └─────┬──────┘  └─────┬──────┘
          │               │               │
          └───────────────┼───────────────┘
                          │
              ┌───────────┴───────────┐
              │                       │
              ▼                       ▼
    ┌──────────────────┐    ┌──────────────────┐
    │  Worker 1        │    │  Worker 2        │
    │  (Self-hosted    │    │  (Self-hosted    │
    │   rembg)         │    │   rembg)         │
    └────────┬─────────┘    └────────┬─────────┘
             │                       │
             └───────────┬───────────┘
                         │
                         ▼
              ┌──────────────────┐
              │  Upstash Redis   │
              │  (Job Queue)     │
              └────────┬─────────┘
                       │
         ┌─────────────┴─────────────┐
         │                           │
         ▼                           ▼
┌─────────────────┐         ┌─────────────────┐
│ Supabase DB     │         │ Cloudflare R2   │
│ (PostgreSQL)    │         │ (Storage)       │
│                 │         │                 │
│ ┌─────────────┐ │         │ ┌─────────────┐ │
│ │ Primary (RW)│ │         │ │ 57GB Assets │ │
│ └─────────────┘ │         │ └─────────────┘ │
└─────────────────┘         └─────────────────┘
```

**Implementation Steps:**

1. **Deploy Self-Hosted rembg (Month 6)**
   - See INFRASTRUCTURE.md for migration plan
   - Saves $1,976/month

2. **Migrate to Cloudflare R2 (Month 7)**
   ```bash
   # Install Cloudflare R2 SDK
   npm install @aws-sdk/client-s3

   # Update storage service
   # Replace Supabase Storage with R2
   ```

3. **Enable Railway Auto-scale (Month 8)**
   ```yaml
   # Railway config
   instances:
     min: 2
     max: 5
   scaling:
     metric: cpu
     target: 70
   restart_policy: always
   ```

4. **Implement Query Result Caching (Month 9)**
   ```typescript
   // Cache frequently accessed data
   const getCachedProducts = cache.wrap(
     'products:all',
     async () => await db.getProducts(),
     { ttl: 3600 } // 1 hour
   );
   ```

**Expected Results:**
- Handle 1,000+ concurrent users
- 45% cost reduction (self-hosted rembg + R2)
- < 300ms API response time (p95)
- 99.9% uptime
- Cost: ~$2,427/month

### Phase 3: 1,000-5,000 Users (Month 12-24)

**Goal:** Multi-region, Read Replicas, Advanced Caching

```
┌────────────────────────────────────────────────┐
│              Cloudflare Global CDN             │
│  (Caching, DDoS Protection, Load Balancing)    │
└───────────────────┬────────────────────────────┘
                    │
      ┌─────────────┼─────────────┐
      │             │             │
      ▼             ▼             ▼
┌──────────┐  ┌──────────┐  ┌──────────┐
│ Region 1 │  │ Region 2 │  │ Region 3 │
│  (US)    │  │  (EU)    │  │  (APAC)  │
└────┬─────┘  └────┬─────┘  └────┬─────┘
     │             │             │
     └─────────────┼─────────────┘
                   │
      ┌────────────┴────────────┐
      │                         │
      ▼                         ▼
┌───────────────┐      ┌───────────────┐
│ API Instances │      │ Worker Pool   │
│ (Auto-scale)  │      │ (Queue-based) │
│ Min: 3        │      │ 4-6 workers   │
│ Max: 10       │      │               │
└───────┬───────┘      └───────┬───────┘
        │                      │
        └──────────┬───────────┘
                   │
         ┌─────────┴─────────┐
         │                   │
         ▼                   ▼
┌─────────────────┐  ┌─────────────────┐
│   Redis Cache   │  │  PostgreSQL DB  │
│   (Upstash)     │  │   (Supabase)    │
│                 │  │                 │
│ ┌─────────────┐ │  │ ┌─────────────┐ │
│ │ Query Cache │ │  │ │ Primary (RW)│ │
│ │ Session     │ │  │ └──────┬──────┘ │
│ │ Rate Limit  │ │  │        │        │
│ └─────────────┘ │  │ ┌──────▼──────┐ │
│                 │  │ │ Replica (RO)│ │
│                 │  │ │ (Optional)  │ │
└─────────────────┘  │ └─────────────┘ │
                     └─────────────────┘
```

**Implementation Steps:**

1. **Add Database Read Replica (if needed)**
   ```typescript
   // Separate read/write pools
   const writePool = new Pool({ /* primary */ });
   const readPool = new Pool({ /* replica */ });

   // Use replica for reads
   export const query = async (sql, params, { readOnly = false } = {}) => {
     const pool = readOnly ? readPool : writePool;
     return pool.query(sql, params);
   };
   ```

2. **Advanced Caching Strategy**
   ```typescript
   // Multi-layer cache
   // 1. In-memory (Node.js process)
   // 2. Redis (shared across instances)
   // 3. CDN (Cloudflare)

   async function getProduct(id: string) {
     // Layer 1: In-memory (fastest)
     const cached = inMemoryCache.get(`product:${id}`);
     if (cached) return cached;

     // Layer 2: Redis (shared)
     const redisCached = await redis.get(`product:${id}`);
     if (redisCached) {
       inMemoryCache.set(`product:${id}`, redisCached, 300); // 5 min
       return redisCached;
     }

     // Layer 3: Database
     const product = await db.getProduct(id);
     await redis.set(`product:${id}`, product, 'EX', 3600); // 1 hour
     inMemoryCache.set(`product:${id}`, product, 300);
     return product;
   }
   ```

3. **Geographic Distribution (Optional)**
   ```yaml
   # Railway regions (if/when supported)
   regions:
     - us-west
     - eu-west
     - ap-southeast
   ```

**Expected Results:**
- Handle 5,000+ concurrent users
- < 200ms global response time
- 99.95% uptime
- Cost: ~$5,000/month ($1/user)

---

## Load Balancing

### Railway Native Load Balancing

Railway automatically load balances across instances when auto-scaling is enabled.

**How it works:**
1. Railway deploys multiple instances of your service
2. Incoming requests distributed round-robin
3. Health checks ensure traffic only goes to healthy instances
4. Failed instances automatically restarted

**Configuration:**
```yaml
# railway.json (conceptual - Railway may use different config)
services:
  api:
    instances:
      min: 2
      max: 5
    health_check:
      path: /health
      interval: 30s
      timeout: 5s
      unhealthy_threshold: 3
```

### Cloudflare Load Balancing (Advanced)

For multi-region deployments:

```javascript
// Cloudflare Load Balancer config (via dashboard or API)
const loadBalancer = {
  name: 'stolen-tee-api',
  default_pools: ['us-west', 'eu-west'],
  fallback_pool: 'us-west',
  region_pools: {
    ENAM: ['us-west'], // Eastern North America
    WNAM: ['us-west'], // Western North America
    WEU: ['eu-west'],  // Western Europe
    EEU: ['eu-west'],  // Eastern Europe
  },
  steering_policy: 'geo', // Route to nearest region
  session_affinity: 'cookie', // Sticky sessions
};
```

---

## Auto-Scaling Configuration

### Scaling Policies

#### CPU-Based Scaling (Recommended)

```yaml
scaling:
  metric: cpu
  target: 70
  min_instances: 2
  max_instances: 5
  scale_up:
    threshold: 70
    duration: 5m
    cooldown: 3m
  scale_down:
    threshold: 30
    duration: 10m
    cooldown: 5m
```

**Rationale:**
- Scale up quickly (5 min sustained > 70%)
- Scale down slowly (10 min sustained < 30%)
- Prevents thrashing

#### Memory-Based Scaling (Alternative)

```yaml
scaling:
  metric: memory
  target: 80
  min_instances: 2
  max_instances: 5
```

**Use when:**
- Memory leaks suspected
- Large in-memory caching
- Image processing intensive

#### Request-Based Scaling (Alternative)

```yaml
scaling:
  metric: requests_per_second
  target: 100
  min_instances: 2
  max_instances: 10
```

**Use when:**
- Predictable request patterns
- Lightweight requests
- High concurrency needed

### Scaling Best Practices

1. **Set reasonable min/max**
   - Min: 2 (redundancy)
   - Max: Don't exceed database connection limits

2. **Database connection math**
   ```
   Total connections needed = max_instances × connections_per_instance

   Example:
   5 API instances × 5 connections = 25 total
   Supabase limit: 15-20 (free tier)

   Solution: Either reduce max_instances OR reduce connections_per_instance
   ```

3. **Monitor scaling events**
   ```typescript
   // Log when instance starts
   logger.info('Instance started', {
     instance_id: process.env.RAILWAY_INSTANCE_ID,
     replica: process.env.RAILWAY_REPLICA_ID,
   });
   ```

---

## Database Scaling

### Current Limitations (Supabase Free)

- Max connections: 15-20 (shared)
- No read replicas
- No connection pooling
- Single region

### Optimization Strategies

#### 1. Connection Pool Optimization (IMPLEMENTED)

```typescript
// Reduce connections per instance for horizontal scaling
const connectionsPerInstance = Math.ceil(
  MAX_DB_CONNECTIONS / MAX_API_INSTANCES
);

const pool = new Pool({
  max: connectionsPerInstance,  // e.g., 15 / 3 = 5 per instance
  min: 1,
  idleTimeoutMillis: 10000,
});
```

#### 2. Query Result Caching

```typescript
// Cache expensive queries
const getPopularProducts = cache.wrap(
  'products:popular',
  async () => {
    return await db.query(`
      SELECT * FROM products
      WHERE featured = true
      ORDER BY sales DESC
      LIMIT 10
    `);
  },
  { ttl: 3600 } // 1 hour
);
```

#### 3. Read/Write Separation (Future)

```typescript
// Use replica for reads (if available)
export async function query(
  sql: string,
  params: any[],
  { readOnly = false } = {}
) {
  const pool = readOnly ? readReplicaPool : primaryPool;
  return pool.query(sql, params);
}

// Usage
const products = await query(
  'SELECT * FROM products',
  [],
  { readOnly: true }  // Use replica
);
```

#### 4. Supabase Pro Upgrade Path

**When to upgrade:**
- Reaching connection limits
- Need read replicas
- Want better performance

**Supabase Pro ($25/month):**
- 200 simultaneous connections
- Point-in-time recovery
- Read replicas available
- Dedicated resources

---

## Performance Benchmarks

### Baseline (Current - Single Instance)

| Metric | Value | Target |
|--------|-------|--------|
| **Users** | < 100 | - |
| **Requests/sec** | ~10 | - |
| **Response time (p50)** | 150ms | < 200ms |
| **Response time (p95)** | 450ms | < 500ms |
| **Response time (p99)** | 850ms | < 1s |
| **Error rate** | < 1% | < 1% |
| **Uptime** | 98.5% | 99% |

### Phase 1 Target (100-500 Users)

| Metric | Target | How to Achieve |
|--------|--------|----------------|
| **Users** | 500 | Separate API + Worker |
| **Requests/sec** | ~50 | 2-3 API instances |
| **Response time (p95)** | < 500ms | Connection pooling |
| **Error rate** | < 1% | Retry logic |
| **Uptime** | 99.5% | Auto-restart |

### Phase 2 Target (500-1,000 Users)

| Metric | Target | How to Achieve |
|--------|--------|----------------|
| **Users** | 1,000 | Self-hosted rembg, R2 |
| **Requests/sec** | ~100 | 3-5 API instances |
| **Response time (p95)** | < 300ms | CDN, caching |
| **Error rate** | < 0.5% | Comprehensive monitoring |
| **Uptime** | 99.9% | Load balancing |

### Phase 3 Target (1,000-5,000 Users)

| Metric | Target | How to Achieve |
|--------|--------|----------------|
| **Users** | 5,000 | Multi-region, replicas |
| **Requests/sec** | ~500 | 5-10 API instances |
| **Response time (p95)** | < 200ms | Advanced caching |
| **Error rate** | < 0.1% | Circuit breakers |
| **Uptime** | 99.95% | Multi-region failover |

---

## Cost at Scale

### Cost Efficiency Curve

| Users | Monthly Cost | Cost/User | Optimizations |
|-------|--------------|-----------|---------------|
| 10 | $69 | $6.90 | Remove.bg paid |
| 100 | $250 | $2.50 | Dedicated worker |
| 500 | $800 | $1.60 | Auto-scale (3 inst) |
| 1,000 | $2,427 | $2.43 | Self-hosted rembg + R2 |
| 2,500 | $3,500 | $1.40 | Economies of scale |
| 5,000 | $5,000 | $1.00 | Mature infrastructure |

**Key Insight:** Cost per user DECREASES beyond 1,000 users due to:
1. Fixed costs amortized
2. Self-hosted services replace APIs
3. Bulk discounts (Supabase Pro, Railway)
4. Efficient resource utilization

### Cost Breakdown at 5,000 Users

| Service | Cost/Month | Notes |
|---------|------------|-------|
| Railway API (5 instances) | $150 | Pro plan + usage |
| Railway Workers (2) | $50 | Background processing |
| Cloudflare R2 | $2.50 | 285GB storage |
| Supabase Pro | $25 | Database + backups |
| Upstash Redis | $2.00 | Queue + cache |
| Stripe | $11,700 | Revenue-based (10K orders) |
| Monitoring (Sentry Pro) | $29 | Error tracking |
| **TOTAL** | **$11,958.50** | |

**Profitability at 5,000 Users:**
```
Revenue: 10,000 orders × $30 = $300,000/month
Infrastructure: $258.50/month (0.09% of revenue)
Stripe fees: $11,700/month (3.9% of revenue)
Gross margin: $288,041.50/month (96.0%)
```

---

## Capacity Planning

### Capacity Formula

```
Max concurrent users = (
  instances × connections_per_instance × avg_requests_per_connection
) / (1 + error_margin)

Example:
5 instances × 5 connections × 20 requests = 500 concurrent
500 / 1.2 (20% margin) = 416 users safely
```

### Scaling Decision Tree

```
Is response time > 1s?
├─ Yes → Is CPU > 70%?
│   ├─ Yes → Scale up (+1 instance)
│   └─ No → Optimize queries
└─ No → Is error rate > 1%?
    ├─ Yes → Check logs, may need rollback
    └─ No → All good, monitor
```

---

## Testing Scaling

### Load Testing

**Tool:** Apache Bench or Artillery

```bash
# Test API endpoint
ab -n 1000 -c 50 https://api.stolentee.com/api/products

# Results to watch:
# - Requests per second
# - Time per request (mean)
# - Failed requests
```

**Artillery Config:**
```yaml
# artillery-config.yml
config:
  target: 'https://api.stolentee.com'
  phases:
    - duration: 60
      arrivalRate: 10  # 10 users/sec
      name: "Warm up"
    - duration: 120
      arrivalRate: 50  # 50 users/sec
      name: "Ramp up"
    - duration: 300
      arrivalRate: 100  # 100 users/sec
      name: "Sustained load"

scenarios:
  - name: "Browse products"
    flow:
      - get:
          url: "/api/products"
      - think: 3
      - get:
          url: "/api/products/{{ productId }}"
```

**Run test:**
```bash
artillery run artillery-config.yml
```

### Chaos Engineering

**Simulate failures:**

```bash
# Kill random instance
railway restart api --force

# Simulate database latency
# (Via Supabase SQL editor)
SELECT pg_sleep(2); -- Add 2s delay

# Simulate high memory
# (In application code)
const leak = [];
setInterval(() => leak.push(new Array(1000000)), 100);
```

**Monitor during chaos:**
- Does load balancer route to healthy instances?
- Do new instances start automatically?
- Is data consistent?
- What's the user experience?

---

## Rollout Plan

### Week-by-Week Implementation

#### Week 1-2: Monitoring & Baseline
- Set up comprehensive monitoring
- Establish performance baselines
- Document current bottlenecks

#### Week 3-4: Separate Worker
- Deploy dedicated worker service
- Test job processing isolation
- Verify API response time improvement

#### Week 5-8: Self-Hosted rembg
- Deploy rembg service
- A/B test quality
- Gradual rollout (25% → 50% → 100%)
- Monitor cost savings

#### Week 9-12: Storage Migration
- Set up Cloudflare R2
- Migrate existing assets
- Update upload endpoints
- Verify CDN performance

#### Week 13-16: Auto-Scaling
- Enable Railway auto-scale
- Load test scaling behavior
- Optimize connection pooling
- Fine-tune scaling triggers

#### Week 17-20: Optimization
- Implement query caching
- Add API response caching
- Optimize slow queries
- Monitor cost efficiency

---

**Last Updated:** 2025-11-27 by Agent #8 - Infrastructure Optimization

**Next Review:** After 500 users reached
