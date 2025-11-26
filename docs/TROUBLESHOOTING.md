# Troubleshooting Guide

**Quick Reference for Common Issues**
**Last Updated:** 2025-11-26

---

## Table of Contents

1. [Server Issues](#server-issues)
2. [Database Issues](#database-issues)
3. [Authentication Issues](#authentication-issues)
4. [Upload Issues](#upload-issues)
5. [Payment Issues](#payment-issues)
6. [Frontend Issues](#frontend-issues)
7. [Performance Issues](#performance-issues)
8. [Deployment Issues](#deployment-issues)
9. [Redis/Queue Issues](#redisqueue-issues)
10. [AI Service Issues](#ai-service-issues)

---

## Server Issues

### Backend Server Won't Start

**Symptom:**
```
Error: listen EADDRINUSE: address already in use :::3001
```

**Cause:** Port 3001 is already in use by another process.

**Solution:**

```bash
# Find process using port 3001
lsof -i :3001

# Output:
# COMMAND   PID    USER   FD   TYPE DEVICE SIZE/OFF NODE NAME
# node    12345   user   23u  IPv6 0x...      0t0  TCP *:3001

# Kill the process
kill -9 12345

# OR use a different port
PORT=3002 npm run dev
```

**Prevention:** Always stop servers properly with Ctrl+C instead of closing terminals.

---

### Server Crashes on Startup

**Symptom:**
```
Error: Cannot find module 'express'
```

**Cause:** Missing dependencies.

**Solution:**

```bash
cd backend
rm -rf node_modules package-lock.json
npm install
npm run dev
```

**Also Check:**
- Node version: `node --version` (should be 20+)
- npm version: `npm --version` (should be 10+)

---

### Server Runs But Returns 500 Errors

**Symptom:**
```json
{
  "success": false,
  "error": {
    "message": "Internal server error"
  }
}
```

**Debugging Steps:**

1. **Check backend logs:**
```bash
# Look for error stack traces
tail -f backend/logs/combined.log
```

2. **Check environment variables:**
```bash
cd backend
cat .env | grep -v "^#"
```

Verify all required vars are set (see `.env.example`).

3. **Test database connection:**
```bash
cd backend
node -e "const { Pool } = require('pg'); const pool = new Pool({ connectionString: process.env.DATABASE_URL }); pool.query('SELECT NOW()').then(res => console.log('✅ Database connected:', res.rows[0])).catch(err => console.error('❌ Database error:', err)).finally(() => pool.end());"
```

4. **Enable debug mode:**
```bash
# In backend/src/index.ts, add:
import { logger } from './utils/logger';
logger.level = 'debug';
```

---

## Database Issues

### Connection Refused Error

**Symptom:**
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**Cause:** PostgreSQL is not running or wrong connection string.

**Solution for Local PostgreSQL:**

```bash
# Mac
brew services start postgresql@14

# Linux
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Verify
psql -U postgres -c "SELECT version();"
```

**Solution for Supabase:**

1. Check project is active: https://supabase.com/dashboard
2. Verify connection string in `.env`:
```bash
# Get from Supabase Dashboard → Settings → Database
DATABASE_URL=postgresql://postgres.abc123:PASSWORD@aws-0-us-east-1.pooler.supabase.com:6543/postgres
```
3. Test connection:
```bash
psql "postgresql://postgres.abc123:PASSWORD@aws-0-us-east-1.pooler.supabase.com:6543/postgres" -c "SELECT NOW();"
```

---

### Table Does Not Exist Error

**Symptom:**
```
Error: relation "users" does not exist
```

**Cause:** Database migrations haven't been run.

**Solution:**

1. **For Supabase:**
   - Go to Supabase Dashboard → SQL Editor
   - Run `backend/migrations/001_initial_schema.sql`
   - Click "Run"

2. **For Local PostgreSQL:**
```bash
cd backend
psql -U postgres -d stolentee -f migrations/001_initial_schema.sql
```

**Verification:**
```sql
-- Run in psql or Supabase SQL Editor
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public';

-- Should show: users, products, orders, variants, etc.
```

---

### Connection Pool Exhausted

**Symptom:**
```
Error: sorry, too many clients already
```

**Cause:** Too many database connections open.

**Solution:**

1. **Check pool configuration:**
```typescript
// backend/src/config/database.ts
const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: 20, // Maximum connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

2. **Always close connections:**
```typescript
// After queries
const client = await pool.connect();
try {
  // ... use client
} finally {
  client.release(); // IMPORTANT!
}
```

3. **Restart server:**
```bash
# Ctrl+C and restart
npm run dev
```

**For Supabase Free Tier:** Maximum 60 connections. Ensure you're not leaking connections.

---

## Authentication Issues

### Login Fails with 401 Unauthorized

**Symptom:**
```json
{
  "success": false,
  "error": {
    "message": "Invalid email or password"
  }
}
```

**Debugging Steps:**

1. **Verify user exists:**
```sql
SELECT email FROM users WHERE email = 'admin@stolentee.com';
```

2. **If user doesn't exist, run migrations again**

3. **Test with default credentials:**
   - Email: `admin@stolentee.com`
   - Password: `admin123`

4. **Check password hashing:**
```typescript
// In authService.ts, temporarily log:
console.log('Stored hash:', user.password_hash);
console.log('Input password:', password);
```

5. **Verify bcrypt is working:**
```bash
cd backend
node -e "const bcrypt = require('bcryptjs'); const hash = bcrypt.hashSync('admin123', 10); console.log('Hash:', hash); console.log('Verify:', bcrypt.compareSync('admin123', hash));"
# Should output: true
```

---

### JWT Token Invalid or Expired

**Symptom:**
```json
{
  "success": false,
  "error": {
    "message": "Invalid token"
  }
}
```

**Solution:**

1. **Check JWT_SECRET is set:**
```bash
cd backend
grep JWT_SECRET .env
```

2. **Generate new secret if needed:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

3. **Log out and log in again** (frontend)
```javascript
localStorage.removeItem('token');
// Navigate to /login
```

4. **Verify token format:**
```javascript
// In browser console (F12)
const token = localStorage.getItem('token');
console.log('Token:', token);
console.log('Parts:', token.split('.').length); // Should be 3
```

5. **Check token expiration:**
```javascript
// Decode JWT (use jwt.io)
const payload = JSON.parse(atob(token.split('.')[1]));
console.log('Expires:', new Date(payload.exp * 1000));
```

---

### Google OAuth Not Working

**Symptom:**
- User can sign in with Google
- But gets error "User not found"

**Solution:**

1. **Check OAuth sync endpoint:**
```bash
curl -X POST http://localhost:3001/api/auth/oauth/sync \
  -H "Content-Type: application/json" \
  -d '{"email":"test@gmail.com","name":"Test User","supabaseId":"abc123"}'
```

2. **Verify Supabase OAuth settings:**
   - Supabase Dashboard → Authentication → Providers
   - Google enabled
   - Redirect URL correct

3. **Check frontend OAuth flow:**
```typescript
// frontend/src/contexts/AuthContext.tsx
const { data, error } = await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: {
    redirectTo: `${window.location.origin}/auth/callback`
  }
});
```

4. **Verify backend sync:**
```typescript
// Check logs for sync request
console.log('[OAuth] Syncing user:', email, name, supabaseId);
```

---

## Upload Issues

### File Upload Fails with 413 Payload Too Large

**Symptom:**
```
Error 413: Payload Too Large
```

**Cause:** File exceeds size limit (default 10MB).

**Solution:**

1. **Check file size:**
```javascript
// In frontend
if (file.size > 10 * 1024 * 1024) {
  alert('File must be less than 10MB');
  return;
}
```

2. **Increase limit (if needed):**
```typescript
// backend/src/index.ts
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));
```

3. **For very large files, use signed URLs:**
```javascript
// Get signed URL
const { data } = await fetch('/api/uploads/signed-url', {
  method: 'POST',
  body: JSON.stringify({ fileName: 'logo.png', fileType: 'image/png' })
}).then(r => r.json());

// Upload directly to storage
await fetch(data.signedUrl, {
  method: 'PUT',
  headers: { 'Content-Type': 'image/png' },
  body: file
});
```

---

### Uploaded Images Not Displaying

**Symptom:**
- Upload succeeds
- But image URL returns 404

**Solution:**

1. **Check file path:**
```bash
# For local storage
ls -la backend/uploads/
```

2. **Verify static file serving:**
```typescript
// backend/src/index.ts
app.use('/uploads', express.static(path.resolve('./uploads')));
```

3. **Check CORS headers:**
```typescript
app.use('/uploads', (_req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
}, express.static(uploadsPath));
```

4. **For Supabase Storage:**
```javascript
// Verify bucket is public
// Supabase Dashboard → Storage → stolentee-uploads → Settings
// Public: Yes
```

5. **Test URL directly:**
```bash
curl -I http://localhost:3001/uploads/test-image.png
# Should return 200, not 404
```

---

### Shirt Photo Upload Rate Limited

**Symptom:**
```json
{
  "success": false,
  "error": {
    "message": "Too many uploads. Please wait before uploading again."
  }
}
```

**Cause:** Exceeded rate limit (10 uploads per hour).

**Solution:**

**For Development:**
```typescript
// backend/src/index.ts
// Temporarily increase limit
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 100, // Increase from 10 to 100
  message: 'Too many uploads.'
});
```

**For Production:**
- Wait 1 hour
- OR implement user-specific rate limiting

**Check remaining requests:**
```javascript
// Response headers
console.log(response.headers.get('RateLimit-Remaining'));
console.log(response.headers.get('RateLimit-Reset'));
```

---

## Payment Issues

### Stripe Checkout Not Loading

**Symptom:**
- Checkout button doesn't work
- Console error: "Stripe is not defined"

**Solution:**

1. **Check Stripe is loaded:**
```html
<!-- In frontend/index.html -->
<script src="https://js.stripe.com/v3/"></script>
```

2. **Verify publishable key:**
```bash
cd frontend
grep VITE_STRIPE_PUBLISHABLE_KEY .env
# Should start with pk_test_ or pk_live_
```

3. **Initialize Stripe:**
```typescript
// frontend/src/pages/Checkout.tsx
const stripe = window.Stripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);
if (!stripe) {
  console.error('Stripe not loaded');
}
```

4. **Check browser console for errors** (F12 → Console)

---

### Payment Intent Creation Fails

**Symptom:**
```json
{
  "error": {
    "message": "No such customer: cus_xyz"
  }
}
```

**Solution:**

1. **Use test mode keys:**
```bash
# backend/.env
STRIPE_SECRET_KEY=sk_test_... # NOT sk_live_
```

2. **Test Stripe API connection:**
```bash
cd backend
node -e "const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY); stripe.paymentIntents.create({ amount: 1000, currency: 'usd' }).then(pi => console.log('✅ Stripe connected:', pi.id)).catch(err => console.error('❌ Stripe error:', err.message));"
```

3. **Check Stripe dashboard:**
   - https://dashboard.stripe.com/test/payments
   - Look for failed payment attempts

4. **Verify order total:**
```typescript
// Must be > 0
if (order.total <= 0) {
  throw new Error('Invalid order total');
}
```

---

### Webhook Not Receiving Events

**Symptom:**
- Payment succeeds in Stripe
- But order status not updated

**Debugging:**

1. **Check webhook secret:**
```bash
cd backend
grep STRIPE_WEBHOOK_SECRET .env
```

2. **Use Stripe CLI for local testing:**
```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward webhooks
stripe listen --forward-to http://localhost:3001/api/webhooks/stripe
```

3. **Verify webhook endpoint:**
```bash
curl -X POST http://localhost:3001/api/webhooks/stripe \
  -H "Content-Type: application/json" \
  -d '{"type":"payment_intent.succeeded"}'
# Should return 200
```

4. **Check logs:**
```typescript
// backend/src/controllers/webhookController.ts
console.log('[Webhook] Received event:', event.type);
```

---

## Frontend Issues

### Blank White Screen

**Symptom:**
- Frontend loads but shows nothing
- No errors in terminal

**Debugging:**

1. **Check browser console** (F12 → Console)
   - Look for JavaScript errors
   - Look for failed API requests

2. **Check network tab** (F12 → Network)
   - Filter by "Fetch/XHR"
   - Look for 500/404 errors

3. **Verify API URL:**
```bash
cd frontend
grep VITE_API_URL .env
# Should be: http://localhost:3001
```

4. **Test API directly:**
```bash
curl http://localhost:3001/api/products
# Should return JSON, not HTML
```

5. **Clear cache and reload:**
```bash
# In browser
Ctrl+Shift+R (hard reload)
# OR
Ctrl+Shift+Delete (clear cache)
```

---

### Canvas Not Rendering

**Symptom:**
- Customizer page loads
- But t-shirt canvas is blank

**Solution:**

1. **Check Fabric.js is loaded:**
```javascript
// Browser console
console.log(window.fabric);
// Should be an object
```

2. **Check canvas element:**
```javascript
// Browser console
document.querySelector('canvas');
// Should exist
```

3. **Verify product images:**
```javascript
// Check image URLs
const product = {...}; // From API
console.log('Front:', product.images.front);
console.log('Back:', product.images.back);
```

4. **Check CORS:**
```bash
# Product images must have CORS headers
curl -I https://your-image-url.com/tshirt.png
# Look for: Access-Control-Allow-Origin: *
```

5. **Test with simple canvas:**
```typescript
// In TShirtCanvas.tsx
useEffect(() => {
  const canvas = new fabric.Canvas('canvas', {
    width: 400,
    height: 400,
    backgroundColor: '#eeeeee'
  });

  canvas.add(new fabric.Rect({
    left: 100,
    top: 100,
    width: 50,
    height: 50,
    fill: 'red'
  }));
}, []);
```

---

### Cart Not Persisting

**Symptom:**
- Add items to cart
- Refresh page
- Cart is empty

**Solution:**

1. **Check localStorage:**
```javascript
// Browser console
localStorage.getItem('cart');
// Should show JSON array
```

2. **Verify cart store:**
```typescript
// frontend/src/stores/cartStore.ts
persist: {
  name: 'cart-storage',
  storage: createJSONStorage(() => localStorage),
}
```

3. **Clear corrupted data:**
```javascript
// Browser console
localStorage.removeItem('cart-storage');
// Reload page
```

4. **Check for localStorage quota:**
```javascript
// Test write
try {
  localStorage.setItem('test', 'data');
  localStorage.removeItem('test');
  console.log('✅ localStorage working');
} catch (e) {
  console.error('❌ localStorage error:', e);
}
```

---

### Images Not Loading (CORS)

**Symptom:**
```
Access to image at 'https://...' from origin 'http://localhost:5173' has been blocked by CORS
```

**Solution:**

1. **For local backend images:**
```typescript
// backend/src/index.ts
app.use('/uploads', (_req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
}, express.static(uploadsPath));
```

2. **For Supabase images:**
   - Bucket must be public
   - Supabase Dashboard → Storage → stolentee-uploads
   - Settings → Public: Yes

3. **Use proxy for external images:**
```typescript
// Create backend endpoint
app.get('/proxy-image', async (req, res) => {
  const imageUrl = req.query.url;
  const response = await fetch(imageUrl);
  const buffer = await response.buffer();
  res.type(response.headers.get('content-type'));
  res.send(buffer);
});
```

---

## Performance Issues

### Slow API Responses

**Symptom:**
- API requests take >2 seconds

**Debugging:**

1. **Check database query performance:**
```sql
-- Enable query timing in psql
\timing

SELECT * FROM orders WHERE customer_email = 'test@example.com';

-- If slow, add index
CREATE INDEX idx_orders_customer_email ON orders(customer_email);
```

2. **Add database connection pooling:**
```typescript
// backend/src/config/database.ts
const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: 20,
  min: 5,
  idleTimeoutMillis: 30000
});
```

3. **Cache frequently accessed data:**
```typescript
// Use Redis for caching
const products = await redis.get('products');
if (products) return JSON.parse(products);

const freshProducts = await db.query('SELECT * FROM products');
await redis.setex('products', 3600, JSON.stringify(freshProducts));
```

4. **Profile slow endpoints:**
```typescript
const start = Date.now();
// ... endpoint logic
console.log(`[Perf] ${req.path} took ${Date.now() - start}ms`);
```

---

### High Memory Usage

**Symptom:**
```
FATAL ERROR: Reached heap limit Allocation failed - JavaScript heap out of memory
```

**Solution:**

1. **Increase Node.js memory:**
```bash
# In package.json
"scripts": {
  "dev": "NODE_OPTIONS=--max-old-space-size=4096 tsx watch src/index.ts"
}
```

2. **Check for memory leaks:**
```bash
# Install heapdump
npm install heapdump

# Take heap snapshot
node --inspect src/index.ts
# Use Chrome DevTools to analyze
```

3. **Fix common leaks:**
```typescript
// Always close connections
const client = await pool.connect();
try {
  // use client
} finally {
  client.release(); // CRITICAL!
}

// Clear intervals/timeouts
const interval = setInterval(() => {}, 1000);
clearInterval(interval); // When done
```

---

### Slow Frontend Loading

**Symptom:**
- Page takes >5 seconds to load

**Solution:**

1. **Analyze bundle size:**
```bash
cd frontend
npm run build
# Check dist/assets/*.js sizes
```

2. **Use code splitting:**
```typescript
// Instead of
import Dashboard from './pages/Dashboard';

// Use
const Dashboard = lazy(() => import('./pages/Dashboard'));
```

3. **Optimize images:**
```bash
# Use WebP format
# Compress images before upload
# Lazy load images
<img loading="lazy" src="..." />
```

4. **Enable Vite build optimizations:**
```typescript
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'canvas-vendor': ['fabric'],
        }
      }
    }
  }
});
```

---

## Deployment Issues

### Railway Deployment Fails

**Symptom:**
```
Error: Build failed
```

**Debugging:**

1. **Check build logs in Railway dashboard**

2. **Common issues:**
   - Missing `build` script in package.json
   - Wrong Node version
   - Missing environment variables

3. **Fix build script:**
```json
// backend/package.json
"scripts": {
  "build": "tsc",
  "start": "node dist/index.js"
}
```

4. **Specify Node version:**
```json
// package.json
"engines": {
  "node": ">=20.0.0",
  "npm": ">=10.0.0"
}
```

5. **Set environment variables in Railway dashboard:**
   - All vars from `.env.example`
   - Use production values

---

### Vercel Deployment Fails

**Symptom:**
```
Error: Command "npm run build" exited with 1
```

**Solution:**

1. **Check build logs in Vercel dashboard**

2. **Fix common issues:**
```json
// frontend/package.json
"scripts": {
  "build": "tsc && vite build",
  "preview": "vite preview"
}
```

3. **Verify environment variables:**
   - Vercel Dashboard → Settings → Environment Variables
   - Add all `VITE_*` vars from `.env.example`

4. **Check Vercel configuration:**
```json
// vercel.json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite"
}
```

---

### Database Connection Fails in Production

**Symptom:**
```
Error: connect ETIMEDOUT
```

**Solution:**

1. **Verify DATABASE_URL:**
   - Use connection pooling URL (not direct)
   - Supabase: Use "Connection Pooling" tab, not "Direct Connection"

2. **Check IP whitelist:**
   - Supabase → Settings → Database → Connection Pooling
   - Enable "SSL Mode"

3. **Test connection:**
```bash
psql "postgresql://postgres.abc123:PASSWORD@aws-0-us-east-1.pooler.supabase.com:6543/postgres" -c "SELECT NOW();"
```

4. **Enable SSL:**
```typescript
// backend/src/config/database.ts
const pool = new Pool({
  connectionString: env.DATABASE_URL,
  ssl: env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});
```

---

## Redis/Queue Issues

### Redis Connection Refused

**Symptom:**
```
Error: Redis connection to localhost:6379 failed - connect ECONNREFUSED
```

**Solution:**

**For Local Development:**
```bash
# Check if Redis is running
redis-cli ping

# Start Redis
brew services start redis  # Mac
sudo systemctl start redis # Linux

# Verify
redis-cli
> ping
PONG
```

**For Upstash (Production):**
```bash
# Verify REDIS_URL in .env
REDIS_URL=redis://:password@endpoint.upstash.io:6379

# Test connection
redis-cli -u redis://:password@endpoint.upstash.io:6379 ping
```

---

### Jobs Not Processing

**Symptom:**
- Job created with status "pending"
- Never changes to "processing"

**Debugging:**

1. **Check worker is running:**
```bash
# Should see worker process
ps aux | grep node
```

2. **Verify queue connection:**
```typescript
// backend/src/workers/queueManager.ts
queue.on('error', (error) => {
  console.error('[Queue] Error:', error);
});

queue.on('waiting', (jobId) => {
  console.log('[Queue] Job waiting:', jobId);
});

queue.on('active', (job) => {
  console.log('[Queue] Job active:', job.id);
});
```

3. **Check Redis memory:**
```bash
redis-cli INFO memory
# Look for used_memory_human
```

4. **Manually process job:**
```bash
# In Redis CLI
LLEN bull:logo_extraction:waiting
LRANGE bull:logo_extraction:waiting 0 -1
```

5. **Restart worker:**
```bash
# Kill and restart
pkill -f "node.*worker"
npm run worker
```

---

## AI Service Issues

### Gemini API Failing

**Symptom:**
```
Error: GEMINI_API_KEY not set
```

**Solution:**

1. **Get API key:**
   - Go to https://aistudio.google.com/app/apikey
   - Click "Create API key"
   - Copy key

2. **Set in environment:**
```bash
# backend/.env
GEMINI_API_KEY=your_api_key_here
```

3. **Test API:**
```bash
cd backend
node -e "const { GoogleGenerativeAI } = require('@google/generative-ai'); const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY); const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' }); model.generateContent('Hello').then(result => console.log('✅ Gemini working:', result.response.text())).catch(err => console.error('❌ Gemini error:', err.message));"
```

---

### Remove.bg API Limit Exceeded

**Symptom:**
```
Error: Insufficient credits
```

**Solution:**

1. **Check quota:**
   - Go to https://www.remove.bg/users/sign_in
   - Check "API Usage"

2. **Free tier limits:**
   - 50 API calls/month
   - Use wisely!

3. **Alternative: Skip background removal**
```typescript
// backend/src/services/backgroundRemovalService.ts
export async function removeBackground(imageUrl: string) {
  // For development, just return original
  if (process.env.NODE_ENV === 'development') {
    return imageUrl;
  }

  // Production: use Remove.bg
  // ...
}
```

---

## General Debugging Tips

### Enable Verbose Logging

**Backend:**
```typescript
// backend/src/utils/logger.ts
export const logger = winston.createLogger({
  level: 'debug', // Change from 'info'
  // ...
});
```

**Frontend:**
```typescript
// frontend/src/main.tsx
if (import.meta.env.DEV) {
  console.log('[Debug] API URL:', import.meta.env.VITE_API_URL);
  console.log('[Debug] Environment:', import.meta.env.MODE);
}
```

---

### Check All Services Health

```bash
# Database
psql "your_connection_string" -c "SELECT 1;"

# Redis
redis-cli ping

# Backend API
curl http://localhost:3001/health

# Frontend
curl http://localhost:5173
```

---

### Reset Everything

If all else fails:

```bash
# 1. Stop all servers (Ctrl+C)

# 2. Clean dependencies
cd backend && rm -rf node_modules package-lock.json && npm install
cd ../frontend && rm -rf node_modules package-lock.json && npm install

# 3. Clear Redis
redis-cli FLUSHALL

# 4. Reset database (CAUTION: deletes all data)
# In Supabase SQL Editor, re-run migrations

# 5. Clear browser cache
# Browser → Settings → Clear cache

# 6. Restart services
cd backend && npm run dev
cd frontend && npm run dev
```

---

## Getting More Help

If you're still stuck:

1. **Check logs:** Backend terminal output + browser console
2. **Search GitHub issues:** https://github.com/yourusername/stolentee/issues
3. **Ask for help:**
   - Provide error message
   - Provide steps to reproduce
   - Include environment (OS, Node version, etc.)

---

**Last Updated:** 2025-11-26
**Maintainer:** StolenTee Development Team
