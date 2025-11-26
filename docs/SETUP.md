# Local Development Setup Guide

**Estimated Setup Time:** 30-45 minutes
**Difficulty:** Intermediate
**Last Updated:** 2025-11-26

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Quick Start (TL;DR)](#quick-start-tldr)
3. [Detailed Setup Instructions](#detailed-setup-instructions)
4. [Environment Configuration](#environment-configuration)
5. [Database Setup](#database-setup)
6. [Running the Application](#running-the-application)
7. [Verification](#verification)
8. [Development Workflow](#development-workflow)
9. [Common Issues](#common-issues)

---

## Prerequisites

Before you begin, ensure you have the following installed:

### Required Software

| Software | Version | Download Link | Verification Command |
|----------|---------|---------------|---------------------|
| **Node.js** | 20.x or higher | https://nodejs.org | `node --version` |
| **npm** | 10.x or higher | (comes with Node.js) | `npm --version` |
| **Git** | Latest | https://git-scm.com | `git --version` |
| **PostgreSQL** | 14.x or higher | https://www.postgresql.org | `psql --version` |
| **Redis** | 7.x or higher | https://redis.io | `redis-cli --version` |

### Optional (but Recommended)

- **VS Code** - IDE with excellent TypeScript support
- **Postman** - API testing tool
- **TablePlus/pgAdmin** - Database GUI client

### Required Accounts

You'll need to create free accounts for:

1. **Supabase** (https://supabase.com) - Database & Storage
2. **Stripe** (https://stripe.com) - Payment processing (test mode)
3. **Remove.bg** (https://remove.bg) - Background removal API (optional)
4. **Google AI Studio** (https://aistudio.google.com) - Gemini API (optional)

---

## Quick Start (TL;DR)

For experienced developers who want to get up and running quickly:

```bash
# 1. Clone repository
git clone https://github.com/yourusername/stolentee.git
cd stolentee

# 2. Install dependencies
cd backend && npm install
cd ../frontend && npm install
cd ..

# 3. Set up environment variables
cd backend && cp .env.example .env
cd ../frontend && cp .env.example .env
# Edit both .env files with your credentials

# 4. Set up database (Supabase)
# Create a new Supabase project at https://supabase.com
# Run the SQL from backend/migrations/001_initial_schema.sql in Supabase SQL Editor

# 5. Start services
cd backend && npm run dev     # Terminal 1: Backend (port 3001)
cd frontend && npm run dev    # Terminal 2: Frontend (port 5173)

# 6. Access application
# Frontend: http://localhost:5173
# Backend API: http://localhost:3001
# Health Check: http://localhost:3001/health
```

**Default Login:**
- Email: `admin@stolentee.com`
- Password: `admin123`

---

## Detailed Setup Instructions

### Step 1: Clone the Repository

```bash
# HTTPS
git clone https://github.com/yourusername/stolentee.git

# OR SSH
git clone git@github.com:yourusername/stolentee.git

# Navigate to project
cd stolentee

# Verify structure
ls -la
```

**Expected Output:**
```
backend/
frontend/
docs/
specs/
README.md
package.json
```

---

### Step 2: Install Backend Dependencies

```bash
cd backend

# Install all dependencies
npm install

# Verify installation
npm list --depth=0
```

**Expected Dependencies:**
- express
- pg (PostgreSQL client)
- bcryptjs (password hashing)
- jsonwebtoken (JWT auth)
- stripe (payment processing)
- bull (job queue)
- And more...

**Installation Time:** ~2-3 minutes

---

### Step 3: Install Frontend Dependencies

```bash
cd ../frontend

# Install all dependencies
npm install

# Verify installation
npm list --depth=0
```

**Expected Dependencies:**
- react
- vite
- typescript
- tailwindcss
- fabric (canvas library)
- zustand (state management)
- And more...

**Installation Time:** ~2-3 minutes

---

### Step 4: Set Up Supabase (Database & Storage)

#### 4.1 Create Supabase Project

1. Go to https://supabase.com
2. Click "Start your project"
3. Sign in or create an account
4. Click "New Project"
5. Fill in details:
   - **Name:** `stolentee-dev`
   - **Database Password:** (save this securely!)
   - **Region:** Choose closest to you
   - **Pricing:** Free tier
6. Click "Create new project" (takes 1-2 minutes)

#### 4.2 Get Database Connection String

1. In Supabase dashboard, go to **Settings** → **Database**
2. Scroll to **Connection String**
3. Select **Connection Pooling** tab
4. Copy the **URI** (starts with `postgresql://`)
5. Replace `[YOUR-PASSWORD]` with your database password

**Example:**
```
postgresql://postgres.abc123:YOUR_PASSWORD@aws-0-us-east-1.pooler.supabase.com:6543/postgres
```

#### 4.3 Run Database Migrations

1. In Supabase dashboard, go to **SQL Editor**
2. Click "New Query"
3. Open `/Users/brandonshore/stolen/stolen1/backend/migrations/001_initial_schema.sql` in your text editor
4. Copy the entire contents
5. Paste into Supabase SQL Editor
6. Click "Run" (bottom right)

**Expected Output:**
```
Success. No rows returned
```

This creates:
- All database tables (users, products, orders, etc.)
- Indexes
- Sample data (admin user, products)

#### 4.4 Set Up Storage Bucket

1. In Supabase dashboard, go to **Storage**
2. Click "Create a new bucket"
3. Name: `stolentee-uploads`
4. Public bucket: **Yes**
5. Click "Create bucket"

---

### Step 5: Configure Environment Variables

#### 5.1 Backend Environment Variables

```bash
cd backend
cp .env.example .env
```

**Edit `backend/.env`** with your credentials:

```env
# Server Configuration
NODE_ENV=development
PORT=3001
API_URL=http://localhost:3001
FRONTEND_URL=http://localhost:5173

# Database (from Supabase Step 4.2)
DATABASE_URL=postgresql://postgres.abc123:YOUR_PASSWORD@aws-0-us-east-1.pooler.supabase.com:6543/postgres

# JWT Authentication
JWT_SECRET=your-super-secret-jwt-key-change-this-to-random-string
JWT_EXPIRES_IN=7d

# Stripe (Get from https://dashboard.stripe.com/test/apikeys)
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Supabase (from Supabase dashboard → Settings → API)
SUPABASE_URL=https://abc123.supabase.co
SUPABASE_SERVICE_KEY=your-supabase-service-role-key

# Redis (Local or Upstash)
REDIS_URL=redis://localhost:6379
# OR for Upstash: redis://:password@endpoint.upstash.io:6379

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Optional: AI Services
GEMINI_API_KEY=your_gemini_api_key
REMOVE_BG_API_KEY=your_remove_bg_api_key
```

**Where to find credentials:**

1. **Supabase URL & Key:**
   - Supabase Dashboard → Settings → API
   - Copy "Project URL" for `SUPABASE_URL`
   - Copy "service_role key" for `SUPABASE_SERVICE_KEY`

2. **Stripe Keys:**
   - Go to https://dashboard.stripe.com/test/apikeys
   - Copy "Publishable key" and "Secret key"
   - For webhook secret: Skip for now (only needed in production)

3. **JWT Secret:**
   - Generate random string:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

#### 5.2 Frontend Environment Variables

```bash
cd ../frontend
cp .env.example .env
```

**Edit `frontend/.env`:**

```env
# Backend API URL
VITE_API_URL=http://localhost:3001

# Stripe (same publishable key from backend)
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key_here

# Supabase (for OAuth)
VITE_SUPABASE_URL=https://abc123.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

**Where to find Supabase anon key:**
- Supabase Dashboard → Settings → API
- Copy "anon public" key

---

### Step 6: Start Redis

#### Option A: Local Redis (Recommended for Development)

**Mac (Homebrew):**
```bash
brew install redis
brew services start redis

# Verify
redis-cli ping
# Expected output: PONG
```

**Ubuntu/Debian:**
```bash
sudo apt-get install redis-server
sudo systemctl start redis
sudo systemctl enable redis

# Verify
redis-cli ping
```

**Windows:**
- Download from https://github.com/microsoftarchive/redis/releases
- Or use Docker:
```bash
docker run -d -p 6379:6379 redis
```

#### Option B: Upstash (Cloud Redis - Free Tier)

1. Go to https://upstash.com
2. Create account
3. Click "Create Database"
4. Choose "Redis"
5. Region: Closest to you
6. Copy the connection string
7. Update `REDIS_URL` in `backend/.env`

---

### Step 7: Verify PostgreSQL Connection

```bash
cd backend

# Test database connection
node -e "const { Pool } = require('pg'); const pool = new Pool({ connectionString: process.env.DATABASE_URL }); pool.query('SELECT NOW()').then(res => console.log('Database connected:', res.rows[0])).catch(err => console.error('Database error:', err)).finally(() => pool.end());"
```

**Expected Output:**
```
Database connected: { now: 2025-11-26T12:00:00.000Z }
```

**If you get an error:**
- Check `DATABASE_URL` in `.env`
- Verify Supabase project is running
- Check firewall/network settings

---

## Running the Application

### Start Backend (Terminal 1)

```bash
cd backend
npm run dev
```

**Expected Output:**
```
[INFO] Stolen Tee API Server started
  port: 3001
  environment: development
  apiUrl: http://localhost:3001
[INFO] Supabase Storage initialized
  bucket: stolentee-uploads
```

**Backend is ready when you see:**
- ✅ Server listening on port 3001
- ✅ Supabase Storage initialized

**Access:**
- API: http://localhost:3001
- Health: http://localhost:3001/health

---

### Start Frontend (Terminal 2)

```bash
cd frontend
npm run dev
```

**Expected Output:**
```
VITE v6.0.0  ready in 523 ms

➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
➜  press h to show help
```

**Frontend is ready when you see:**
- ✅ Vite dev server running
- ✅ Port 5173 (or 5174 if 5173 is taken)

**Access:**
- Frontend: http://localhost:5173

---

## Verification

### Step 1: Check Backend Health

```bash
curl http://localhost:3001/health
```

**Expected Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-11-26T12:00:00.000Z"
}
```

---

### Step 2: Test API Endpoints

**Get Products:**
```bash
curl http://localhost:3001/api/products
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "products": [
      {
        "id": 1,
        "name": "Classic T-Shirt",
        "slug": "classic-tshirt",
        ...
      }
    ]
  }
}
```

---

### Step 3: Test Frontend

1. Open http://localhost:5173 in your browser
2. You should see the homepage
3. Click on a product
4. Customizer should load

**Expected Behavior:**
- ✅ Homepage loads without errors
- ✅ Product images display
- ✅ Canvas customizer renders
- ✅ No console errors (F12 → Console)

---

### Step 4: Test Authentication

1. Navigate to http://localhost:5173/login
2. Try default credentials:
   - Email: `admin@stolentee.com`
   - Password: `admin123`
3. Should redirect to dashboard

**If login fails:**
- Check backend console for errors
- Verify database migration ran successfully
- Check `JWT_SECRET` is set in backend `.env`

---

## Development Workflow

### Project Structure Overview

```
stolentee/
├── backend/
│   ├── src/
│   │   ├── routes/          # API endpoints
│   │   ├── controllers/     # Request handlers
│   │   ├── services/        # Business logic
│   │   ├── middleware/      # Auth, error handling
│   │   └── index.ts         # App entry point
│   ├── migrations/          # Database schemas
│   ├── .env                 # Environment config
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── pages/           # Route pages
│   │   ├── components/      # Reusable components
│   │   ├── stores/          # Zustand state
│   │   ├── contexts/        # React contexts
│   │   └── App.tsx
│   ├── .env                 # Environment config
│   └── package.json
│
└── docs/                    # Documentation
```

---

### Common Development Commands

#### Backend

```bash
cd backend

# Start development server (hot reload)
npm run dev

# Build TypeScript
npm run build

# Run production build
npm start

# Type checking
npm run type-check

# Linting
npm run lint

# Run tests
npm test
```

#### Frontend

```bash
cd frontend

# Start development server (hot reload)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Type checking
npm run type-check

# Linting
npm run lint

# Run tests
npm test
```

---

### Hot Reload

Both backend and frontend support hot reload:

**Backend:**
- Uses `tsx` with watch mode
- Changes to `.ts` files trigger restart
- Restart time: ~2 seconds

**Frontend:**
- Vite HMR (Hot Module Replacement)
- Changes to `.tsx` files update instantly
- No page refresh needed

---

### Making Your First Change

#### 1. Add a New API Endpoint

**File:** `backend/src/routes/products.ts`

```typescript
// Add this route
router.get('/featured', getFeaturedProducts);
```

**File:** `backend/src/controllers/productController.ts`

```typescript
export const getFeaturedProducts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const products = await getAllProducts('active');
    const featured = products.slice(0, 3); // Get first 3

    res.status(200).json({
      success: true,
      data: { products: featured }
    });
  } catch (error) {
    next(error);
  }
};
```

**Test:**
```bash
curl http://localhost:3001/api/products/featured
```

---

#### 2. Add a New Frontend Component

**File:** `frontend/src/components/FeaturedProducts.tsx`

```tsx
import { useEffect, useState } from 'react';

export default function FeaturedProducts() {
  const [products, setProducts] = useState([]);

  useEffect(() => {
    fetch('http://localhost:3001/api/products/featured')
      .then(res => res.json())
      .then(data => setProducts(data.data.products));
  }, []);

  return (
    <div>
      <h2>Featured Products</h2>
      {products.map(product => (
        <div key={product.id}>{product.name}</div>
      ))}
    </div>
  );
}
```

**Use it:**
```tsx
// In any page
import FeaturedProducts from '../components/FeaturedProducts';

<FeaturedProducts />
```

---

### Debugging Tips

#### Backend Debugging

**1. Enable verbose logging:**

```typescript
// backend/src/index.ts
import { logger } from './utils/logger';

logger.level = 'debug'; // Show all logs
```

**2. Use breakpoints (VS Code):**

Create `.vscode/launch.json`:
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Backend",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "dev"],
      "cwd": "${workspaceFolder}/backend",
      "console": "integratedTerminal"
    }
  ]
}
```

**3. Check database queries:**

```typescript
// Add this to any service
console.log('SQL Query:', query);
```

---

#### Frontend Debugging

**1. Use React DevTools:**
- Install browser extension
- Inspect component props/state

**2. Check API calls:**
- Open DevTools → Network tab
- Filter by "Fetch/XHR"
- Inspect request/response

**3. Use VS Code debugger:**

Create `.vscode/launch.json`:
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "chrome",
      "request": "launch",
      "name": "Debug Frontend",
      "url": "http://localhost:5173",
      "webRoot": "${workspaceFolder}/frontend"
    }
  ]
}
```

---

## Common Issues

### Issue 1: Port Already in Use

**Symptom:**
```
Error: listen EADDRINUSE: address already in use :::3001
```

**Solution:**
```bash
# Find process using port 3001
lsof -i :3001

# Kill process
kill -9 <PID>

# OR use different port
PORT=3002 npm run dev
```

---

### Issue 2: Database Connection Failed

**Symptom:**
```
Error: connect ECONNREFUSED
```

**Solution:**
1. Verify Supabase project is running
2. Check `DATABASE_URL` in `.env`
3. Test connection:
```bash
psql "postgresql://postgres.abc123:PASSWORD@aws-0-us-east-1.pooler.supabase.com:6543/postgres"
```

---

### Issue 3: Redis Connection Failed

**Symptom:**
```
Error: Redis connection to localhost:6379 failed
```

**Solution:**
```bash
# Check if Redis is running
redis-cli ping

# Start Redis
brew services start redis  # Mac
sudo systemctl start redis # Linux
```

---

### Issue 4: Module Not Found

**Symptom:**
```
Error: Cannot find module 'express'
```

**Solution:**
```bash
# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

---

### Issue 5: CORS Error in Frontend

**Symptom:**
```
Access to fetch at 'http://localhost:3001' blocked by CORS
```

**Solution:**
1. Check `FRONTEND_URL` in backend `.env`
2. Should be: `http://localhost:5173`
3. Restart backend server

---

### Issue 6: Stripe Not Working

**Symptom:**
```
Error: No API key provided
```

**Solution:**
1. Get test keys from https://dashboard.stripe.com/test/apikeys
2. Update both:
   - `STRIPE_SECRET_KEY` in backend `.env`
   - `VITE_STRIPE_PUBLISHABLE_KEY` in frontend `.env`
3. Restart both servers

---

## Next Steps

Now that your environment is set up:

1. **Read the Architecture Guide:** [docs/ARCHITECTURE.md](./ARCHITECTURE.md)
2. **Explore the API:** [docs/API.md](./API.md)
3. **Deploy to Production:** [docs/DEPLOYMENT.md](./DEPLOYMENT.md)
4. **Troubleshooting:** [docs/TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
5. **Contributing:** [docs/CONTRIBUTING.md](./CONTRIBUTING.md)

---

## Development Resources

### API Testing
- **Postman Collection:** Import from `/docs/postman_collection.json`
- **Thunder Client:** VS Code extension for API testing
- **cURL Examples:** See [API.md](./API.md)

### Database Tools
- **Supabase Studio:** https://supabase.com/dashboard
- **TablePlus:** https://tableplus.com
- **pgAdmin:** https://www.pgadmin.org

### Documentation
- **TypeScript Handbook:** https://www.typescriptlang.org/docs
- **React Docs:** https://react.dev
- **Express Guide:** https://expressjs.com/en/guide
- **PostgreSQL Tutorial:** https://www.postgresqltutorial.com

---

## Getting Help

If you encounter issues not covered here:

1. Check [Troubleshooting Guide](./TROUBLESHOOTING.md)
2. Search GitHub Issues
3. Ask in Discord/Slack
4. Open a new issue with:
   - Error message
   - Steps to reproduce
   - Environment (OS, Node version)

---

**Last Updated:** 2025-11-26
**Maintainer:** StolenTee Development Team
