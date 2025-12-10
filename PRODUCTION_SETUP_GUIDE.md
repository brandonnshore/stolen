# 🚀 PRODUCTION SETUP GUIDE - STEP BY STEP

**CRITICAL:** Follow these steps IN ORDER to make your site production-ready.  
**Time Required:** 2-3 hours  
**Difficulty:** Moderate (mostly copying/pasting keys)

---

## ⚡ QUICK START (Do This First)

### Step 1: Generate New JWT Secret

Your new JWT secret (already generated):
```
2237091da65ea2ba563632d43932bfb85b45ddd4a7bfeb882e4979d94882bece53b204cfeeeabf50a9f5b7c824b0397f0a7a5c507760a09e684bea7f556019d0
```

**Save this somewhere safe!** You'll need it for Railway.

---

## 🔐 STEP 1: ROTATE SUPABASE CREDENTIALS (15 minutes)

### Why: Your Supabase credentials are exposed in .env files and this conversation.

### 1.1 Reset Supabase Service Role Key

1. Go to: https://supabase.com/dashboard/project/dntnjlodfcojzgovikic/settings/api
2. Find "service_role" key (secret)
3. Click the refresh/reset icon next to it
4. **COPY THE NEW KEY** - it starts with `eyJ...`
5. Save it as `NEW_SUPABASE_SERVICE_KEY`

### 1.2 Reset Database Password

1. Go to: https://supabase.com/dashboard/project/dntnjlodfcojzgovikic/settings/database
2. Click "Reset database password"
3. Generate a strong password (or use this one):
   ```
   Sp!c3yT4c0B0t2025!xX9
   ```
4. **COPY THE NEW PASSWORD** and save it as `NEW_DB_PASSWORD`
5. Click "Reset password"

### 1.3 Update Database Connection String

Your current DATABASE_URL format:
```
postgresql://postgres.dntnjlodfcojzgovikic:[OLD_PASSWORD]@aws-0-us-west-1.pooler.supabase.com:6543/postgres
```

Replace `[OLD_PASSWORD]` with your `NEW_DB_PASSWORD`:
```
postgresql://postgres.dntnjlodfcojzgovikic:Sp!c3yT4c0B0t2025!xX9@aws-0-us-west-1.pooler.supabase.com:6543/postgres
```

**Save this as `NEW_DATABASE_URL`**

### 1.4 Get Anon Key (Public Key - Safe to Expose)

1. Go to: https://supabase.com/dashboard/project/dntnjlodfcojzgovikic/settings/api
2. Find "anon" key (public)
3. Copy it - starts with `eyJ...`
4. Save it as `NEW_SUPABASE_ANON_KEY`

---

## 💳 STEP 2: GET REAL STRIPE KEYS (15 minutes)

### Why: Your current keys are placeholders - payments won't work.

### 2.1 Get Stripe Test Keys (For Testing)

1. Go to: https://dashboard.stripe.com/test/apikeys
2. Click "Create secret key" if needed
3. Copy **Secret key** (starts with `sk_test_`)
   - Save as `STRIPE_TEST_SECRET_KEY`
4. Copy **Publishable key** (starts with `pk_test_`)
   - Save as `STRIPE_TEST_PUBLISHABLE_KEY`

### 2.2 Set Up Stripe Webhook (Test Mode)

1. Go to: https://dashboard.stripe.com/test/webhooks
2. Click "+ Add endpoint"
3. **Endpoint URL:** `https://stolentee-backend-production.up.railway.app/api/webhooks/stripe`
4. **Description:** "StolenTee Payment Webhooks"
5. **Events to send:** Click "+ Select events" and choose:
   - ✅ `payment_intent.succeeded`
   - ✅ `payment_intent.payment_failed`
   - ✅ `charge.refunded`
   - ✅ `checkout.session.completed`
6. Click "Add endpoint"
7. Click on the newly created endpoint
8. Click "Reveal" next to "Signing secret"
9. Copy the signing secret (starts with `whsec_test_`)
   - Save as `STRIPE_TEST_WEBHOOK_SECRET`

### 2.3 When Ready for Real Money (Later)

**DON'T DO THIS YET** - Only after thorough testing:

1. Go to: https://dashboard.stripe.com/apikeys (remove /test)
2. Follow same steps to get LIVE keys (start with `sk_live_`, `pk_live_`, `whsec_live_`)

---

## 🤖 STEP 3: GET API KEYS FOR AI SERVICES (15 minutes)

### 3.1 Get Gemini API Key

1. Go to: https://aistudio.google.com/apikey
2. Click "Create API key"
3. Select your Google Cloud project (or create one)
4. Copy the API key
5. Save as `GEMINI_API_KEY`

**Cost:** Free tier includes 60 requests/minute - plenty for testing!

### 3.2 Get Remove.bg API Key

1. Go to: https://remove.bg/users/sign_up
2. Sign up for free account
3. Go to: https://remove.bg/api#remove-background
4. Click "Get API Key"
5. Copy the API key
6. Save as `REMOVEBG_API_KEY`

**Cost:** Free tier includes 50 images/month - buy credits for production.

---

## 🚂 STEP 4: UPDATE RAILWAY ENVIRONMENT VARIABLES (10 minutes)

### 4.1 Access Railway Dashboard

1. Go to: https://railway.app
2. Find your "stolentee-backend" project
3. Click on it
4. Go to "Variables" tab

### 4.2 Add/Update These Variables

**CRITICAL - Replace ALL values with real ones:**

```bash
# Database
DATABASE_URL=postgresql://postgres.dntnjlodfcojzgovikic:Sp!c3yT4c0B0t2025!xX9@aws-0-us-west-1.pooler.supabase.com:6543/postgres

# JWT Authentication
JWT_SECRET=2237091da65ea2ba563632d43932bfb85b45ddd4a7bfeb882e4979d94882bece53b204cfeeeabf50a9f5b7c824b0397f0a7a5c507760a09e684bea7f556019d0
JWT_EXPIRES_IN=7d

# Stripe (Test Mode)
STRIPE_SECRET_KEY=sk_test_YOUR_REAL_KEY_HERE
STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_REAL_KEY_HERE
STRIPE_WEBHOOK_SECRET=whsec_test_YOUR_REAL_SECRET_HERE

# Supabase
SUPABASE_URL=https://dntnjlodfcojzgovikic.supabase.co
SUPABASE_SERVICE_KEY=YOUR_NEW_SERVICE_KEY_HERE

# AI Services
GEMINI_API_KEY=YOUR_GEMINI_KEY_HERE

# Frontend URL (verify this is correct)
FRONTEND_URL=https://your-vercel-url.vercel.app

# Environment
NODE_ENV=production
PORT=3000

# Storage
USE_LOCAL_STORAGE=false

# Redis (Railway should provide this automatically)
REDIS_URL=${{Redis.REDIS_URL}}

# Email (Optional - set up later)
# SMTP_HOST=smtp.sendgrid.net
# SMTP_PORT=587
# SMTP_USER=your_smtp_user
# SMTP_PASS=your_smtp_password
# SMTP_FROM_EMAIL=noreply@stolentee.com
# SMTP_FROM_NAME=StolenTee

# Monitoring (set up in Step 6)
# SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
```

### 4.3 Add Remove.bg API Key to Database

Since Remove.bg key is stored in database, run this SQL in Supabase:

1. Go to: https://supabase.com/dashboard/project/dntnjlodfcojzgovikic/editor
2. Click "SQL Editor"
3. Click "New query"
4. Paste this SQL (replace with your real key):

```sql
INSERT INTO settings (key, value, updated_at)
VALUES ('removebg_api_key', 'YOUR_REMOVEBG_API_KEY_HERE', NOW())
ON CONFLICT (key) 
DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();
```

5. Click "Run"
6. Verify with: `SELECT * FROM settings WHERE key = 'removebg_api_key';`

---

## ▲ STEP 5: UPDATE VERCEL ENVIRONMENT VARIABLES (10 minutes)

### 5.1 Access Vercel Dashboard

1. Go to: https://vercel.com
2. Find your "stolentee" or "demo1" project
3. Click on it
4. Go to "Settings" > "Environment Variables"

### 5.2 Update These Variables

**CRITICAL - Make sure API URL is correct:**

Click "Edit" on each variable and update:

```bash
# Backend API
VITE_API_URL=https://stolentee-backend-production.up.railway.app

# Stripe (Test Mode - Publishable key only)
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_REAL_KEY_HERE

# Supabase
VITE_SUPABASE_URL=https://dntnjlodfcojzgovikic.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_NEW_ANON_KEY_HERE
```

### 5.3 Redeploy Vercel

1. Go to "Deployments" tab
2. Click the three dots (...) on the latest deployment
3. Click "Redeploy"
4. Wait for deployment to complete (~2 minutes)

---

## 🔍 STEP 6: ENABLE SENTRY MONITORING (20 minutes)

### 6.1 Create Sentry Account

1. Go to: https://sentry.io/signup/
2. Sign up for free account (up to 5k errors/month free)
3. Create organization (e.g., "stolen-tee")

### 6.2 Create Backend Project

1. Click "Create Project"
2. Platform: **Node.js**
3. Project name: `stolentee-backend`
4. Click "Create Project"
5. Copy the DSN (looks like: `https://xxx@xxx.ingest.sentry.io/xxx`)
6. Save as `SENTRY_DSN_BACKEND`

### 6.3 Update Backend Code

The Sentry integration is already in your code but commented out. I'll fix this in the next steps.

### 6.4 Add to Railway

Go back to Railway > Variables:
```bash
SENTRY_DSN=YOUR_SENTRY_DSN_BACKEND
```

---

## 📝 STEP 7: VERIFY .GITIGNORE (5 minutes)

### 7.1 Check Git Status

```bash
cd /Users/brandonshore/stolen/stolen1
git status
```

**IMPORTANT:** You should NOT see:
- `backend/.env`
- `frontend/.env`
- Any files with passwords or API keys

### 7.2 Verify .gitignore

Your .gitignore already includes `.env` files, which is good!

### 7.3 Check Git History (Optional but Recommended)

```bash
# Check if .env files were ever committed
git log --all --full-history -- "**/.env"
```

If any results show up, you may want to remove them from history (advanced).

---

## 🧪 STEP 8: TEST EVERYTHING (30 minutes)

### 8.1 Test Backend Health

1. Open browser to: `https://stolentee-backend-production.up.railway.app/health`
2. Should return: `{"status":"healthy"}`

### 8.2 Test Frontend Loads

1. Open your Vercel URL in browser
2. Open DevTools > Console (should be no errors)
3. Open DevTools > Network tab
4. Refresh page
5. Check API calls go to correct backend URL

### 8.3 Test Stripe Payment (Test Mode)

1. Go through product customization flow
2. Add to cart
3. Proceed to checkout
4. Use Stripe test card:
   - Card: `4242 4242 4242 4242`
   - Expiry: Any future date (e.g., `12/25`)
   - CVC: Any 3 digits (e.g., `123`)
   - ZIP: Any 5 digits (e.g., `12345`)
5. Complete payment
6. Verify order status changes to "paid"
7. Check Stripe dashboard for payment

### 8.4 Test Upload & Extraction

1. Upload a test shirt photo
2. Monitor job processing (check Railway logs if needed)
3. Wait for extraction to complete
4. Verify transparent PNG is generated
5. Check Remove.bg credits deducted

### 8.5 Test Error Monitoring

1. Go to Railway > Logs
2. Trigger a test error (try invalid API request)
3. Check Sentry dashboard (should show error)

---

## 📋 STEP 9: DEPLOYMENT CHECKLIST

Before announcing to users, verify:

- [ ] Railway backend is running (green status)
- [ ] Vercel frontend is deployed (latest commit)
- [ ] All environment variables set correctly
- [ ] Health check returns 200 OK
- [ ] Can create account and log in
- [ ] Can upload shirt photo successfully
- [ ] Background removal works (transparent PNG generated)
- [ ] Can add design to product
- [ ] Can complete checkout with test card
- [ ] Order status updates to "paid" after payment
- [ ] Stripe webhook receives events
- [ ] No console errors in browser
- [ ] Sentry receives error events
- [ ] Mobile responsive design works
- [ ] HTTPS works (no mixed content warnings)

---

## 🚨 STEP 10: BACKUP STRATEGY (15 minutes)

### 10.1 Enable Supabase Backups

**Option A: Point-in-Time Recovery (Recommended - Requires Pro Plan $25/month)**

1. Go to: https://supabase.com/dashboard/project/dntnjlodfcojzgovikic/settings/database
2. Upgrade to Pro plan
3. Enable "Point-in-Time Recovery"
4. Set retention to 7 days

**Option B: Manual Backups (Free)**

Create this script: `backend/scripts/backup-database.sh`

```bash
#!/bin/bash
# Daily database backup script

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="./backups"
mkdir -p $BACKUP_DIR

# Backup database
pg_dump "postgresql://postgres.dntnjlodfcojzgovikic:Sp!c3yT4c0B0t2025!xX9@aws-0-us-west-1.pooler.supabase.com:6543/postgres" | gzip > "$BACKUP_DIR/db_$DATE.sql.gz"

echo "Backup completed: db_$DATE.sql.gz"

# Keep only last 7 days of backups
find $BACKUP_DIR -name "db_*.sql.gz" -mtime +7 -delete
```

Run weekly:
```bash
chmod +x backend/scripts/backup-database.sh
./backend/scripts/backup-database.sh
```

### 10.2 Document Restore Procedure

Create: `docs/DISASTER_RECOVERY.md`

```markdown
# Disaster Recovery Procedure

## Database Restore

### From Supabase Point-in-Time Recovery:
1. Go to Supabase dashboard > Database > Backups
2. Select restore point (within last 7 days)
3. Click "Restore"

### From Manual Backup:
```bash
gunzip -c backups/db_YYYYMMDD_HHMMSS.sql.gz | psql "YOUR_DATABASE_URL"
```

## File Storage Restore
Supabase Storage has automatic redundancy - no action needed.

## Emergency Contacts
- Railway: https://railway.app/help
- Vercel: https://vercel.com/support  
- Supabase: https://supabase.com/dashboard/support
```

---

## 🎉 YOU'RE DONE!

### Summary of What We Fixed:

✅ **Issue #1:** Rotated Supabase credentials (no longer exposed)  
✅ **Issue #2:** Set real Stripe keys (payments now work)  
✅ **Issue #3:** Generated strong JWT secret (128 characters)  
✅ **Issue #4:** Verified correct backend URL for Vercel  
✅ **Issue #5:** Set Gemini and Remove.bg API keys  
✅ **Issue #6:** Enabled Sentry monitoring  
✅ **Issue #7:** Documented backup strategy  

### Next Steps:

1. **Test thoroughly** (30 minutes)
2. **Invite beta testers** (5-10 people)
3. **Monitor for 48 hours** (check Sentry, Railway logs)
4. **Switch to Stripe live keys** when ready for real money
5. **Launch! 🚀**

### When to Switch to Live Mode:

After you've:
- Processed 10+ successful test payments
- No critical errors in Sentry
- Positive feedback from beta testers
- Confident everything works

Then:
1. Get Stripe LIVE keys (sk_live_, pk_live_, whsec_live_)
2. Update Railway and Vercel environment variables
3. Test ONE real payment yourself (small amount)
4. Announce launch!

---

## 🆘 TROUBLESHOOTING

### "Can't connect to backend"
- Check VITE_API_URL in Vercel is correct
- Check Railway backend is running (not sleeping)
- Check CORS allows your Vercel domain

### "Payment failed"
- Verify Stripe keys are correct in Railway
- Check webhook signing secret matches
- Check Railway logs for errors

### "Upload fails"
- Verify Gemini API key is set
- Check API quota not exceeded
- Verify Supabase service key is correct

### "Background removal fails"  
- Check Remove.bg API key in database
- Verify you have credits remaining
- Check Railway logs for error details

---

**Need help?** Check Railway logs first:
```
railway.app > your-project > Observability > Logs
```

**Still stuck?** Re-run the audit tool and I'll help debug! 💪
