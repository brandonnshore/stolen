# ✅ QUICK DEPLOYMENT CHECKLIST

Use this as your **final pre-launch checklist**. Print it out and check off each item!

---

## 🔐 SECRETS & CREDENTIALS (30 minutes)

### Railway Backend Environment Variables

Go to: https://railway.app > stolentee-backend > Variables

- [ ] `DATABASE_URL` - Updated with NEW Supabase password
- [ ] `JWT_SECRET` - Set to: `2237091da65ea2ba563632d43932bfb85b45ddd4a7bfeb882e4979d94882bece53b204cfeeeabf50a9f5b7c824b0397f0a7a5c507760a09e684bea7f556019d0`
- [ ] `STRIPE_SECRET_KEY` - Real test key (starts with `sk_test_`)
- [ ] `STRIPE_WEBHOOK_SECRET` - Real webhook secret (starts with `whsec_test_`)
- [ ] `SUPABASE_SERVICE_KEY` - NEW rotated key (starts with `eyJ`)
- [ ] `GEMINI_API_KEY` - Real Gemini API key
- [ ] `SENTRY_DSN` - Sentry project DSN URL
- [ ] `FRONTEND_URL` - Your Vercel URL
- [ ] `NODE_ENV=production`
- [ ] `USE_LOCAL_STORAGE=false`

### Vercel Frontend Environment Variables

Go to: https://vercel.com > your-project > Settings > Environment Variables

- [ ] `VITE_API_URL=https://stolentee-backend-production.up.railway.app`
- [ ] `VITE_STRIPE_PUBLISHABLE_KEY` - Real test key (starts with `pk_test_`)
- [ ] `VITE_SUPABASE_URL=https://dntnjlodfcojzgovikic.supabase.co`
- [ ] `VITE_SUPABASE_ANON_KEY` - NEW anon key (starts with `eyJ`)

### Supabase Database

Go to: https://supabase.com/dashboard/project/dntnjlodfcojzgovikic/editor

Run this SQL:
```sql
INSERT INTO settings (key, value, updated_at)
VALUES ('removebg_api_key', 'YOUR_REMOVEBG_KEY', NOW())
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();
```

- [ ] Remove.bg API key added to database

---

## 🔧 STRIPE SETUP (15 minutes)

### Stripe Dashboard

Go to: https://dashboard.stripe.com/test/webhooks

- [ ] Webhook created with URL: `https://stolentee-backend-production.up.railway.app/api/webhooks/stripe`
- [ ] Events enabled: `payment_intent.succeeded`, `payment_intent.payment_failed`, `charge.refunded`
- [ ] Webhook signing secret copied to Railway

---

## 🚀 DEPLOYMENT STATUS (5 minutes)

### Railway Backend

- [ ] Deployment status: 🟢 Green (running)
- [ ] No build errors in logs
- [ ] Health check: `https://stolentee-backend-production.up.railway.app/health` returns 200

### Vercel Frontend

- [ ] Latest deployment successful
- [ ] No build errors
- [ ] Preview URL accessible

---

## 🧪 FUNCTIONAL TESTING (30 minutes)

### Basic Functionality

- [ ] Frontend loads without console errors
- [ ] Can view products
- [ ] API calls go to correct backend (check Network tab)
- [ ] No CORS errors

### User Authentication

- [ ] Can create new account
- [ ] Can log in with email/password
- [ ] JWT token received and stored
- [ ] Protected routes require authentication

### Upload & Extraction

- [ ] Can upload shirt photo (JPG/PNG)
- [ ] Job starts processing
- [ ] Gemini extracts design (check Railway logs)
- [ ] Remove.bg removes background
- [ ] Transparent PNG generated with 300 DPI
- [ ] Result displays correctly

### Payment Flow (TEST MODE)

Use test card: **4242 4242 4242 4242**

- [ ] Can add item to cart
- [ ] Can proceed to checkout
- [ ] Stripe checkout loads correctly
- [ ] Can enter test card details
- [ ] Payment completes successfully
- [ ] Order status changes to "paid"
- [ ] Stripe dashboard shows payment
- [ ] Webhook event received (check Railway logs)

### Payment Failure Test

Use test card: **4000 0000 0000 0002** (card declined)

- [ ] Payment fails gracefully
- [ ] Error message displayed to user
- [ ] Order status remains "pending" or changes to "failed"

---

## 📊 MONITORING (10 minutes)

### Sentry

Go to: https://sentry.io > your-project

- [ ] Sentry dashboard shows "Connected"
- [ ] Test error appears (trigger one manually)
- [ ] Alerts configured for critical errors

### Railway Logs

Go to: https://railway.app > stolentee-backend > Observability > Logs

- [ ] Logs streaming in real-time
- [ ] No critical errors
- [ ] Sentry initialization message appears

---

## 🔒 SECURITY VERIFICATION (10 minutes)

### Git Status

```bash
cd /Users/brandonshore/stolen/stolen1
git status
```

- [ ] `.env` files NOT shown in git status
- [ ] No sensitive files staged for commit

### Browser DevTools

Open your site and check DevTools:

- [ ] No API keys visible in Network tab
- [ ] No secrets in JavaScript source
- [ ] HTTPS lock icon visible (secure connection)
- [ ] No mixed content warnings

### API Security Headers

Check: `curl -I https://stolentee-backend-production.up.railway.app/health`

- [ ] `Strict-Transport-Security` header present
- [ ] `X-Content-Type-Options: nosniff` present
- [ ] `X-Frame-Options: DENY` present

---

## 📱 MOBILE TESTING (15 minutes)

### Responsive Design

Test on real device or Chrome DevTools mobile emulation:

- [ ] Homepage looks good on mobile
- [ ] Product page responsive
- [ ] Upload works on mobile
- [ ] Checkout works on mobile
- [ ] No horizontal scrolling issues

---

## 💾 BACKUP VERIFICATION (10 minutes)

### Supabase Backups

Go to: https://supabase.com/dashboard/project/dntnjlodfcojzgovikic/settings/database

- [ ] Backup strategy documented (Pro plan PITR or manual script)
- [ ] Restore procedure documented in `docs/DISASTER_RECOVERY.md`

---

## 📈 PERFORMANCE CHECK (10 minutes)

### Page Load Speed

Use: https://pagespeed.web.dev/

- [ ] Performance score > 70
- [ ] First Contentful Paint < 2s
- [ ] Time to Interactive < 4s

### API Response Times

Check Railway metrics or Sentry:

- [ ] Average response time < 500ms
- [ ] p95 response time < 2s

---

## 🎯 FINAL GO/NO-GO DECISION

### ✅ READY TO LAUNCH IF:

- All **Secrets & Credentials** checked ✅
- All **Functional Testing** passed ✅
- **Monitoring** working ✅
- **Security Verification** passed ✅
- No critical errors in logs ✅

### ⚠️ DO NOT LAUNCH IF:

- ❌ Payments don't work
- ❌ Upload/extraction fails
- ❌ Critical errors in Sentry
- ❌ Secrets still exposed in git
- ❌ Backend URL wrong in Vercel

---

## 🎉 POST-LAUNCH MONITORING (First 24 Hours)

### Hour 1
- [ ] Check Sentry every 15 minutes
- [ ] Monitor Railway logs continuously
- [ ] Test one real purchase yourself

### Hour 6
- [ ] Review all errors in Sentry
- [ ] Check Stripe dashboard for payments
- [ ] Verify no user complaints

### Hour 24
- [ ] Full error review in Sentry
- [ ] Check server load in Railway metrics
- [ ] Review customer feedback
- [ ] Verify all payments processed correctly

---

## 🚨 EMERGENCY ROLLBACK PROCEDURE

If critical issue discovered:

1. **Vercel:** Deployments > Previous deployment > "Promote to Production"
2. **Railway:** Deployments > Previous deployment > "Redeploy"
3. **Notify users:** "We're experiencing technical difficulties, payments disabled temporarily"
4. **Debug:** Check Sentry, Railway logs, Stripe dashboard
5. **Fix:** Address root cause
6. **Re-test:** Go through checklist again
7. **Redeploy:** When confident it's fixed

---

## 📞 EMERGENCY CONTACTS

Save these numbers/links:

- **Railway Support:** https://railway.app/help
- **Vercel Support:** https://vercel.com/support
- **Stripe Support:** https://support.stripe.com
- **Supabase Support:** https://supabase.com/dashboard/support
- **Sentry Status:** https://status.sentry.io

---

## ✅ SIGN-OFF

I confirm that:

- [ ] All critical issues from the audit are fixed
- [ ] All items in this checklist are completed
- [ ] I have tested the complete user flow end-to-end
- [ ] I am ready to handle production issues 24/7
- [ ] I have emergency rollback procedure ready

**Signed:** ___________________  
**Date:** ___________________  
**Time:** ___________________

---

**YOU'RE READY TO LAUNCH! 🚀**

Now go to PRODUCTION_SETUP_GUIDE.md and follow the step-by-step instructions to configure everything.
