# CRITICAL SECURITY ACTIONS - DO THESE NOW

**Date:** November 26, 2025
**Priority:** IMMEDIATE

---

## 🚨 CRITICAL ACTIONS (DO TODAY - WITHIN 24 HOURS)

### 1. Rotate Supabase Service Key (CRITICAL)

**Why:** Real Supabase Service Key found in `/backend/.env` (not committed to git, but exists in working directory)

**Steps:**
1. Go to Supabase Dashboard → Project Settings → API
2. Click "Rotate Service Key"
3. Copy new service key
4. Update Railway environment variables:
   ```bash
   # In Railway dashboard:
   SUPABASE_SERVICE_KEY=<new_key_here>
   ```
5. Verify backend restarts successfully
6. Test upload functionality to confirm it works

**Risk if not done:** Complete database access compromise

---

### 2. Remove .env Files from Git Tracking

**Why:** `.env` files are modified and could be accidentally committed

**Commands:**
```bash
cd /Users/brandonshore/stolen/stolen1

# Remove from git index (keeps local files)
git rm --cached backend/.env
git rm --cached frontend/.env

# Verify .gitignore has .env (it does)
cat .gitignore | grep .env

# Commit the removal
git commit -m "Security: Remove .env files from git tracking"

# Push to GitHub
git push origin main

# Verify they're now ignored
git status  # Should NOT show .env files
```

**Risk if not done:** Future commits might expose secrets

---

### 3. Delete Temporary Files from Repository

**Why:** 13 temporary .txt files contain sensitive URLs and configuration

**Commands:**
```bash
cd /Users/brandonshore/stolen/stolen1

# Remove all temporary files
git rm GOOGLE_OAUTH_URLS.txt \
       BACKEND_URL.txt \
       STRIPE_WEBHOOK_URL.txt \
       VERCEL_ENV_VARS.txt \
       URGENT_FIX_BACKEND_ISSUE.txt \
       STOLEN_IOS_WORKFLOW_DOCUMENTATION.txt \
       test-upload.html \
       FIX_HOODIE.txt \
       FIX_RAILWAY_DATABASE.txt \
       HOODIE_FIX.txt \
       RAILWAY_FIX_INSTRUCTIONS.txt \
       RAILWAY_SQL_FIX.txt \
       SIMPLE_SQL_FIX.txt \
       SUPABASE_SQL.txt

# Keep important .txt files
git reset HEAD PRODUCTION_READINESS_AUDIT.txt \
              BILLING_SAFEGUARDS_AGENT_PLAN.txt

# Commit cleanup
git commit -m "Security: Remove temporary files with sensitive URLs"

# Push
git push origin main
```

**Risk if not done:** Exposes API endpoints and configuration to attackers

---

### 4. Verify Production Environment Variables

**Why:** Placeholder secrets like "your-super-secret-jwt-key-change-in-production" must be replaced

**Railway Backend Variables to Verify:**

```bash
# Go to Railway dashboard → Variables tab

# Check these are NOT placeholders:
JWT_SECRET=<should be 64+ random characters, not "your-super-secret-jwt-key-change-in-production">
STRIPE_SECRET_KEY=<should start with "sk_live_" for production, not "sk_test_">
STRIPE_WEBHOOK_SECRET=<should start with "whsec_", not "whsec_your_webhook_secret">
GEMINI_API_KEY=<verify it's set>
REMOVEBG_API_KEY=<verify it's set>
```

**Generate Strong JWT Secret:**
```bash
# Run this locally to generate a strong secret:
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Copy output and update Railway:
# Example output: a7f9d8c6e5b4a3d2f1e0c9b8a7d6e5f4c3b2a1d0e9f8c7b6a5d4e3f2a1b0c9d8e7f6a5b4c3d2e1f0
```

**Vercel Frontend Variables to Verify:**

```bash
# Go to Vercel dashboard → Settings → Environment Variables

VITE_STRIPE_PUBLISHABLE_KEY=<should start with "pk_live_" for production>
VITE_API_URL=<should point to Railway backend, not localhost>
```

**Risk if not done:** JWT tokens insecure, Stripe payments fail, services break

---

## 🔥 HIGH PRIORITY (DO THIS WEEK)

### 5. Add Auth Rate Limiting to Prevent Brute Force

**File:** `/backend/src/index.ts`

**Add this code after the existing rate limiters (around line 93):**

```typescript
// Strict rate limiter for authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Max 5 attempts per 15 min
  message: 'Too many login attempts. Please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Only count failed attempts
});

// Apply to auth endpoints
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/signup', authLimiter);
```

**Why:** Currently no protection against password brute-force attacks

---

### 6. Fix CORS to Remove Localhost in Production

**File:** `/backend/src/index.ts`

**Replace lines 47-53 with:**

```typescript
const allowedOrigins = [
  env.FRONTEND_URL,
  'https://stolentee.com',
  'https://www.stolentee.com',
  // Only add localhost in development
  ...(env.NODE_ENV === 'development' ? [
    'http://localhost:5173',
    'http://localhost:3003'
  ] : [])
];
```

**Why:** Production should not allow localhost origins

---

### 7. Remove Compiled dist/ Files from Git

**Why:** dist/ files contain compiled environment variable references

**Commands:**
```bash
cd /Users/brandonshore/stolen/stolen1

# Add to .gitignore
echo "frontend/dist/" >> .gitignore
echo "backend/dist/" >> .gitignore

# Remove from git
git rm -r --cached frontend/dist backend/dist

# Commit
git commit -m "Security: Remove compiled dist files from git"
git push origin main
```

---

## 📋 VERIFICATION CHECKLIST

After completing the above actions, verify:

```bash
# 1. Check .env files are not tracked
cd /Users/brandonshore/stolen/stolen1
git ls-files | grep .env
# ✅ Should return NOTHING

# 2. Check temp files are gone
ls *.txt
# ✅ Should only show PRODUCTION_READINESS_AUDIT.txt and BILLING_SAFEGUARDS_AGENT_PLAN.txt

# 3. Check git status is clean
git status
# ✅ Should not show .env files or .txt files

# 4. Verify Railway environment variables
# Go to Railway dashboard → Project → Variables
# ✅ JWT_SECRET should be 64+ random characters
# ✅ STRIPE_SECRET_KEY should start with sk_live_ (production)
# ✅ SUPABASE_SERVICE_KEY should be new rotated key

# 5. Test backend still works
curl https://stolentee-backend-production.up.railway.app/health
# ✅ Should return: {"status":"ok","timestamp":"..."}

# 6. Test frontend still works
# Open: https://stolentee.com
# ✅ Should load without errors

# 7. Test upload functionality
# Upload a shirt photo at https://stolentee.com
# ✅ Should create job and process successfully
```

---

## 🛡️ COMPLETED SECURITY MEASURES (ALREADY GOOD)

These are already secure - no action needed:

✅ All database queries use parameterized queries (no SQL injection)
✅ Passwords hashed with bcrypt
✅ JWT authentication properly implemented
✅ Upload rate limiting (10/hour)
✅ File size limits (25MB)
✅ No XSS vulnerabilities (no dangerouslySetInnerHTML)
✅ Error messages don't leak sensitive info
✅ CORS configured with specific origins (needs localhost fix)
✅ Helmet security headers configured
✅ Graceful shutdown handlers

---

## 📊 RISK ASSESSMENT

**Before Actions:**
- Risk Level: 🔴 HIGH
- Exposed Secrets: 3 CRITICAL
- Vulnerable Endpoints: 2 (login, signup)
- Exposed Files: 13

**After Actions:**
- Risk Level: 🟡 MEDIUM
- Exposed Secrets: 0
- Vulnerable Endpoints: 0
- Exposed Files: 0

**After Full Implementation:**
- Risk Level: 🟢 LOW
- Production Ready: ✅ YES

---

## 💰 COST OF INACTION

If secrets are compromised before action:

| Scenario | Estimated Cost | Likelihood |
|----------|---------------|------------|
| Database breach via Supabase key | $10,000+ | HIGH |
| User account takeovers via JWT | $5,000+ | HIGH |
| Stripe fraud/abuse | $2,000+ | MEDIUM |
| API quota exhaustion (Gemini/Remove.bg) | $1,000+ | MEDIUM |
| Reputation damage | Priceless | HIGH |

**Total Potential Loss:** $18,000+ in direct costs + reputation damage

**Time to Complete Critical Actions:** ~30 minutes
**Time Saved by Preventing Breach:** Weeks of incident response

---

## 🤝 SUPPORT

If you need help with any of these actions:

1. **Rotating Supabase Key:** https://supabase.com/docs/guides/platform/going-into-prod#rotate-keys
2. **Railway Environment Variables:** https://docs.railway.app/develop/variables
3. **Git Commands:** https://git-scm.com/docs
4. **Security Questions:** See full report: `SECURITY_AUDIT_REPORT.md`

---

## 📝 NOTES

- Local .env files will NOT be deleted (only removed from git tracking)
- Railway/Vercel deployments will continue working
- Frontend and backend will rebuild after env var changes
- Test thoroughly in development before deploying to production

---

**Report Generated:** November 26, 2025
**Estimated Time to Complete:** 30-60 minutes
**Next Review:** After implementing these actions (within 1 week)

**DO NOT COMMIT THIS FILE TO GIT** - Contains security checklist
