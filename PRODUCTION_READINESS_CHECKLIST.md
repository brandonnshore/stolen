# Production Readiness Checklist for Stolen Tee

**Status: ⚠️ NOT READY FOR PRODUCTION**

Your site needs several critical configurations before you can promote it and have real users.

---

## ✅ What's DONE (Good News!)

### Security
- ✅ Supabase RLS enabled on all 14 tables
- ✅ Backend API security configured
- ✅ Sentry error monitoring integrated
- ✅ HTTPS/SSL ready (via Railway/Vercel)

### Infrastructure
- ✅ Railway deployment configuration exists
- ✅ Vercel frontend deployment configuration exists
- ✅ Database migrations system in place
- ✅ Auto-scaling config prepared
- ✅ Health check endpoint configured

### Code Quality
- ✅ TypeScript for type safety
- ✅ Proper error handling structure
- ✅ Connection pooling optimized
- ✅ Background job queue (BullMQ) implemented

---

## ❌ CRITICAL: Must Fix Before Launch

### 1. Environment Variables (CRITICAL)

Your `.env` file has **placeholder values** that MUST be replaced with real credentials:

#### ❌ Stripe Payment (BLOCKING)
```env
# Current (FAKE):
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Need: Real Stripe keys from https://dashboard.stripe.com/apikeys
```
**Impact:** Payments will NOT work. Users cannot buy anything.

#### ❌ JWT Secret (SECURITY RISK)
```env
# Current (INSECURE):
JWT_SECRET=your-super-secret-jwt-key-change-in-production

# Need: Generate a real secret
```
**Impact:** Anyone can forge authentication tokens and access user accounts.

**How to fix:**
```bash
# Generate a secure random secret:
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

#### ❌ Database Connection (CRITICAL)
```env
# Current (LOCAL):
DATABASE_URL=postgresql://brandonshore@localhost:5432/stolentee

# Need: Supabase production connection string
DATABASE_URL=postgresql://postgres:Bubbleboy2413!@db.dntnjlodfcojzgovikic.supabase.co:5432/postgres?sslmode=require
```
**Impact:** App connects to local database instead of Supabase cloud.

#### ❌ Redis (BLOCKING)
```env
# Current (LOCAL):
REDIS_URL=redis://localhost:6379

# Need: Cloud Redis (Upstash recommended)
REDIS_URL=redis://:password@host:port
```
**Impact:** Background jobs (logo extraction) won't work in production.

**Get free Redis:**
1. Go to https://upstash.com
2. Create free account
3. Create Redis database
4. Copy connection string

#### ❌ Email Service (Optional but Important)
```env
# Current (FAKE):
SMTP_USER=your_smtp_user
SMTP_PASS=your_smtp_password

# Need: Real SMTP credentials
```
**Impact:** Order confirmation emails won't send.

**Options:**
- SendGrid (free tier: 100 emails/day)
- Resend (free tier: 3,000 emails/month)
- AWS SES (very cheap)

---

### 2. Deployment Configuration

#### ❌ Environment Mode
```env
# Current:
NODE_ENV=development

# Need:
NODE_ENV=production
```

#### ❌ URLs
```env
# Current (LOCAL):
API_URL=http://localhost:3000
FRONTEND_URL=http://localhost:5173

# Need (PRODUCTION):
API_URL=https://your-backend.railway.app
FRONTEND_URL=https://your-frontend.vercel.app
```

---

### 3. Railway Deployment Setup

You have the config, but need to:

1. **Deploy to Railway:**
   ```bash
   # Install Railway CLI
   npm install -g @railway/cli

   # Login
   railway login

   # Create project
   railway init

   # Deploy
   railway up
   ```

2. **Set Environment Variables in Railway Dashboard:**
   - Go to Railway dashboard
   - Click your project → Variables
   - Add ALL the environment variables with REAL values

3. **Connect Redis:**
   - In Railway, add Redis service
   - Railway will automatically set REDIS_URL

---

### 4. Frontend Deployment (Vercel)

1. **Connect GitHub repo:**
   - Go to https://vercel.com
   - Import your GitHub repo
   - Vercel auto-deploys on push

2. **Set Environment Variables:**
   - In Vercel dashboard → Settings → Environment Variables
   - Add:
     ```
     VITE_API_URL=https://your-backend.railway.app
     VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...
     VITE_SUPABASE_URL=https://dntnjlodfcojzgovikic.supabase.co
     VITE_SUPABASE_ANON_KEY=your_anon_key
     ```

---

### 5. Stripe Setup (CRITICAL for Payments)

1. **Get Production Keys:**
   - Go to https://dashboard.stripe.com/apikeys
   - Switch from "Test mode" to "Live mode" (toggle in top right)
   - Copy "Publishable key" and "Secret key"

2. **Configure Webhook:**
   - Go to Developers → Webhooks
   - Add endpoint: `https://your-backend.railway.app/api/webhooks/stripe`
   - Select events: `payment_intent.succeeded`, `payment_intent.failed`
   - Copy webhook secret

3. **Complete Stripe Onboarding:**
   - You MUST complete business verification
   - Add bank account for payouts
   - This can take 1-3 days for approval

---

### 6. Testing Before Launch

#### ✅ Test Checklist:

- [ ] Create an account
- [ ] Browse products
- [ ] Add product to cart
- [ ] Complete checkout with test card (before live mode)
- [ ] Verify order appears in admin panel
- [ ] Upload custom artwork
- [ ] Verify email confirmation sent
- [ ] Test background removal feature
- [ ] Check mobile responsiveness
- [ ] Test on different browsers

#### Stripe Test Cards (Test Mode):
```
Success: 4242 4242 4242 4242
Decline: 4000 0000 0000 0002
3D Secure: 4000 0025 0000 3155
```

---

## ⚠️ IMPORTANT BEFORE PROMOTING

### Legal Requirements (MUST HAVE):

1. **Terms of Service** - Legal protection for your business
2. **Privacy Policy** - Required by law (GDPR, CCPA)
3. **Refund Policy** - Required for e-commerce
4. **Shipping Policy** - Set customer expectations
5. **Contact Information** - Support email/phone

**Where to get these:**
- Use template generator: https://www.termsfeed.com
- Or hire lawyer (recommended for serious business)

### Business Setup:

- [ ] Register business (LLC recommended)
- [ ] Get business bank account
- [ ] Set up accounting/bookkeeping
- [ ] Understand sales tax requirements
- [ ] Get business insurance (optional but recommended)

---

## 📊 Production-Ready Checklist Summary

### BLOCKING (Must fix to work):
- [ ] Replace Stripe placeholder keys with real keys
- [ ] Generate secure JWT_SECRET
- [ ] Configure production DATABASE_URL
- [ ] Set up cloud Redis (Upstash)
- [ ] Deploy backend to Railway
- [ ] Deploy frontend to Vercel
- [ ] Set all environment variables in Railway/Vercel
- [ ] Complete Stripe business verification

### HIGH PRIORITY (Need before users):
- [ ] Set NODE_ENV=production
- [ ] Configure SMTP for emails
- [ ] Add Terms of Service
- [ ] Add Privacy Policy
- [ ] Add Refund/Shipping policies
- [ ] Test full checkout flow
- [ ] Set up monitoring alerts

### MEDIUM PRIORITY (Need soon):
- [ ] Set up domain name (optional but professional)
- [ ] Configure Sentry alerts
- [ ] Add Google Analytics
- [ ] Create backup strategy
- [ ] Document deployment process

### OPTIONAL (Nice to have):
- [ ] Set up staging environment
- [ ] Add automated tests
- [ ] Configure CDN for assets
- [ ] Set up log aggregation

---

## 🚀 Quick Start Guide (Fastest Path to Production)

### Week 1: Core Setup
1. **Day 1-2:** Set up Stripe production account + verification
2. **Day 3:** Deploy to Railway + Vercel
3. **Day 4:** Configure all environment variables
4. **Day 5:** Set up Upstash Redis
5. **Day 6-7:** End-to-end testing

### Week 2: Legal & Polish
1. **Day 1-2:** Add legal pages (Terms, Privacy, Refund)
2. **Day 3-4:** Final testing + bug fixes
3. **Day 5:** Soft launch (friends & family)
4. **Day 6-7:** Monitor, fix issues

### Week 3: Launch
1. **Day 1:** Public launch
2. **Day 2-7:** Customer support + monitoring

---

## 💰 Expected Monthly Costs (At Launch)

### Minimum (0-100 users):
- Railway (backend): $5-20/month
- Vercel (frontend): $0 (free tier)
- Supabase (database): $0 (free tier, up to 500MB)
- Upstash Redis: $0 (free tier, 10k commands/day)
- Stripe: 2.9% + $0.30 per transaction
- **Total Fixed: ~$5-20/month**

### Growing (100-500 users):
- Railway: $20-50/month
- Vercel: $0-20/month
- Supabase: $25/month (Pro tier)
- Upstash: $10/month
- **Total Fixed: ~$55-105/month**

### At Scale (1,000+ users):
- See INFRASTRUCTURE_COST_OPTIMIZATION_REPORT.md
- Estimated: $2,427/month (4% of $60k revenue)

---

## 🆘 Need Help?

### If you're not technical:
Consider hiring someone to help with:
- Environment variable configuration
- Railway/Vercel deployment
- Stripe setup
- Legal page creation

**Estimated cost:** $500-1,500 one-time setup

### If you want to DIY:
- Railway docs: https://docs.railway.app
- Vercel docs: https://vercel.com/docs
- Stripe docs: https://stripe.com/docs
- Join Discord communities for help

---

## ✅ When You're ACTUALLY Ready

You'll know you're ready when:

1. ✅ You can process a real payment end-to-end
2. ✅ Background jobs work (logo extraction)
3. ✅ Emails send to customers
4. ✅ Database is in the cloud (not localhost)
5. ✅ Error monitoring is active
6. ✅ Legal pages are published
7. ✅ You've tested on multiple devices
8. ✅ You have a way to handle customer support
9. ✅ Your Stripe account is verified and active

**Current Status: 3/9 complete** ⚠️

---

## 📝 Next Steps

1. **Read this entire document**
2. **Create a Stripe production account** (start verification NOW - takes 1-3 days)
3. **Set up Upstash Redis** (takes 5 minutes, free)
4. **Deploy to Railway** (following their quickstart guide)
5. **Deploy to Vercel** (connect GitHub repo)
6. **Configure all environment variables**
7. **Test full checkout flow**
8. **Add legal pages**
9. **Soft launch with friends**
10. **Public launch!**

---

**Bottom line: You have a great foundation, but need 1-2 weeks of configuration and setup before you can safely launch to real users. The good news is most of this is one-time setup, not coding!**

Good luck! 🚀
