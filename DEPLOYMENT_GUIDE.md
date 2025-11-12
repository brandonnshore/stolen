# 🚀 Stolen Tee Deployment Guide

Complete step-by-step guide to deploy your app to production.

---

## 📋 Prerequisites

- [ ] GitHub account
- [ ] Vercel account (free)
- [ ] Railway account (free tier available)
- [ ] Supabase account (free)
- [ ] Upstash account for Redis (free)
- [ ] Domain name (optional but recommended)

---

## 1️⃣ Set Up Supabase (Database + Storage)

### Database Setup
1. Go to [supabase.com](https://supabase.com) and create a new project
2. Choose a name: `stolentee` or similar
3. Set a strong database password (save this!)
4. Wait for database to provision (~2 minutes)
5. Go to **Settings** → **Database** and copy your connection string:
   ```
   postgresql://postgres:[YOUR-PASSWORD]@[YOUR-PROJECT-REF].supabase.co:5432/postgres
   ```

### Run Database Migrations
```bash
# In your local terminal
cd backend
export DATABASE_URL="your-supabase-connection-string"
npm run migrate
```

### Storage Setup
1. In Supabase dashboard, go to **Storage**
2. Create a new bucket: `stolentee-uploads`
3. Set bucket to **Public** (for CDN access)
4. Go to **Settings** → **API** and copy:
   - Project URL: `https://[YOUR-PROJECT-REF].supabase.co`
   - Anon/Public Key: `eyJhbGc...` (long string)

### Configure API Keys in Database
```bash
# Connect to your Supabase database and run:
psql "your-supabase-connection-string"

# Insert your API keys
INSERT INTO settings (key, value) VALUES
('gemini_api_key', '{"api_key": "YOUR_GEMINI_KEY"}'),
('removebg_api_key', '{"api_key": "YOUR_REMOVEBG_KEY"}');
```

---

## 2️⃣ Set Up Upstash Redis (Job Queue)

1. Go to [upstash.com](https://upstash.com) and sign up
2. Create a new Redis database
3. Choose a region close to your Railway deployment
4. Copy the **Redis URL** (starts with `rediss://`)
   ```
   rediss://default:[PASSWORD]@[ENDPOINT].upstash.io:6379
   ```

---

## 3️⃣ Deploy Backend to Railway

### Initial Setup
1. Go to [railway.app](https://railway.app) and sign in with GitHub
2. Click **New Project** → **Deploy from GitHub repo**
3. Select your repository
4. Railway will auto-detect the project

### Configure Environment Variables
1. In Railway dashboard, click on your project
2. Go to **Variables** tab
3. Add all variables from `backend/.env.production.template`:
   - `NODE_ENV=production`
   - `DATABASE_URL` (from Supabase)
   - `REDIS_URL` (from Upstash)
   - `SUPABASE_URL` (from Supabase)
   - `SUPABASE_KEY` (from Supabase)
   - `SUPABASE_BUCKET=stolentee-uploads`
   - `USE_SUPABASE_STORAGE=true`
   - Add all other keys (Stripe, Gemini, etc.)

### Deploy Worker Process
Railway will deploy your backend automatically, but you need a **separate service for the worker**:

1. In Railway, click **New Service** → **GitHub Repo** (same repo)
2. Name it `stolentee-worker`
3. In Settings → Deploy, set:
   - **Build Command**: `cd backend && npm install && npm run build`
   - **Start Command**: `cd backend && npm run worker`
4. Add the same environment variables as the backend
5. Deploy!

### Get Your Backend URL
1. In Railway, go to your backend service
2. Click **Settings** → **Generate Domain**
3. Copy the URL: `https://your-app-name.up.railway.app`

---

## 4️⃣ Deploy Frontend to Vercel

### Initial Setup
1. Go to [vercel.com](https://vercel.com) and sign in with GitHub
2. Click **Add New** → **Project**
3. Import your GitHub repository
4. Vercel auto-detects Vite/React

### Configure Build Settings
- **Framework Preset**: Vite
- **Root Directory**: `frontend`
- **Build Command**: `npm run build`
- **Output Directory**: `dist`

### Set Environment Variables
In Vercel project settings → Environment Variables:
```
VITE_API_URL=https://your-railway-backend-url.up.railway.app
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_your_stripe_key
VITE_GA_TRACKING_ID=G-XXXXXXXXXX
```

### Deploy!
1. Click **Deploy**
2. Vercel will build and deploy (~2 minutes)
3. Get your URL: `https://your-project.vercel.app`

---

## 5️⃣ Update Backend with Frontend URL

Go back to Railway and update:
```
FRONTEND_URL=https://your-project.vercel.app
```

Redeploy the backend for CORS to work properly.

---

## 6️⃣ Set Up Stripe Webhooks

1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Navigate to **Developers** → **Webhooks**
3. Click **Add endpoint**
4. Enter: `https://your-railway-backend-url.up.railway.app/api/webhooks/stripe`
5. Select events:
   - `checkout.session.completed`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
6. Copy the **Webhook Secret** (starts with `whsec_`)
7. Add to Railway environment variables: `STRIPE_WEBHOOK_SECRET`

---

## 7️⃣ Custom Domain (Optional)

### For Vercel (Frontend)
1. Buy domain from Namecheap, GoDaddy, etc.
2. In Vercel project → **Settings** → **Domains**
3. Add your domain: `stolentee.com`
4. Follow DNS instructions (add A record and CNAME)

### For Railway (Backend)
1. In Railway project → **Settings** → **Domains**
2. Add custom domain: `api.stolentee.com`
3. Add CNAME record pointing to Railway

---

## 8️⃣ Test Everything

### Health Checks
1. Frontend: Visit `https://your-domain.vercel.app`
2. Backend: Visit `https://your-railway-url.up.railway.app/health`
3. Test upload and AI extraction
4. Test checkout flow (use Stripe test card: `4242 4242 4242 4242`)

### Monitor Logs
- **Railway**: Click on service → **Deployments** → View logs
- **Vercel**: Click on deployment → **Functions** → View logs
- **Supabase**: **Logs Explorer**

---

## 🎉 You're Live!

Your app is now running in production:
- ✅ Frontend on Vercel
- ✅ Backend on Railway
- ✅ Worker processing AI jobs
- ✅ Database on Supabase
- ✅ Files stored in Supabase Storage
- ✅ Job queue on Upstash Redis

---

## 📊 Monitoring & Maintenance

### Check Worker Status
```bash
# Railway logs for worker service
railway logs --service stolentee-worker
```

### Database Backups
Supabase automatically backs up your database daily (free tier: 7 days retention)

### Scaling
- **Railway**: Upgrade plan for more RAM/CPU
- **Vercel**: Automatically scales
- **Supabase**: Upgrade for more storage/bandwidth

---

## 🆘 Troubleshooting

### Upload Not Working
- Check Supabase Storage bucket is public
- Verify `SUPABASE_URL` and `SUPABASE_KEY` in Railway
- Check Railway worker logs

### AI Extraction Stuck
- Check Railway worker is running
- Verify Redis connection (`REDIS_URL`)
- Check Gemini/RemoveBG API keys in database

### CORS Errors
- Verify `FRONTEND_URL` in Railway backend
- Check it matches your Vercel URL exactly

### Payment Issues
- Verify Stripe webhook is set up
- Check `STRIPE_WEBHOOK_SECRET` in Railway
- Use Stripe test mode for testing

---

## 💰 Costs (Approximate)

**Free Tier (Development):**
- Vercel: $0/month
- Railway: $0-5/month (free $5 credit)
- Supabase: $0/month (up to 500MB database)
- Upstash Redis: $0/month (10,000 commands/day)

**Production (with traffic):**
- Vercel: $0-20/month
- Railway: $5-20/month
- Supabase: $0-25/month
- Upstash Redis: $0/month (usually stays free)
- **Total: ~$10-65/month**

---

Need help? Check the logs first, then reach out!
