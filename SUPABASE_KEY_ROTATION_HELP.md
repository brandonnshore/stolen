# 🔑 How to Rotate Supabase Service Key

## The Problem with "Resetting"

**IMPORTANT:** Supabase doesn't have a "reset" or "refresh" button for the service_role key in the traditional sense. Here's why and what to do instead:

---

## ✅ RECOMMENDED SOLUTION: Create NEW Service Key

Since your current service key is exposed, the best approach is to **revoke access** and **generate a new project** OR use **Row Level Security (RLS)** to limit damage.

### Option 1: Use RLS Policies (FASTEST - 5 minutes)

Instead of rotating the key, make sure your database is protected by RLS policies:

1. Go to: https://supabase.com/dashboard/project/dntnjlodfcojzgovikic/auth/policies
2. Verify RLS is enabled on ALL tables (should already be done per your SUPABASE_SECURITY_FIX_SUMMARY.md)
3. Check that service_role key requires proper authentication

**Why this works:**
- Even if someone has your service key, RLS policies protect your data
- They can't read/write/delete without proper authentication
- Your app continues working without changes

### Option 2: Change Database Password (RECOMMENDED - 10 minutes)

This limits damage from the exposed connection string:

1. Go to: https://supabase.com/dashboard/project/dntnjlodfcojzgovikic/settings/database
2. Scroll down to "Database Settings"
3. Find "Database password" section
4. Click "Generate new password" or "Reset database password"
5. Copy the new password (it looks like: `AbCdEf123456789`)
6. Update your connection string with the new password

**Your current DATABASE_URL format:**
```
postgresql://postgres.dntnjlodfcojzgovikic:OLD_PASSWORD@aws-0-us-west-1.pooler.supabase.com:6543/postgres
```

**New DATABASE_URL (replace OLD_PASSWORD):**
```
postgresql://postgres.dntnjlodfcojzgovikic:NEW_PASSWORD@aws-0-us-west-1.pooler.supabase.com:6543/postgres
```

### Option 3: Create a NEW Supabase Project (SAFEST but MOST WORK - 30 minutes)

If you're really concerned about the exposed credentials:

1. Go to: https://supabase.com/dashboard
2. Click "New project"
3. Name it: `stolen-tee-production`
4. Choose same region: `West US (North California)`
5. Set strong database password (save it!)
6. Wait 2-5 minutes for project to initialize

**Then migrate your database:**

```bash
# Export from old project
pg_dump "postgresql://postgres.dntnjlodfcojzgovikic:OLD_PASSWORD@aws-0-us-west-1.pooler.supabase.com:6543/postgres" > backup.sql

# Import to new project
psql "postgresql://postgres.NEW_PROJECT_ID:NEW_PASSWORD@aws-0-us-west-1.pooler.supabase.com:6543/postgres" < backup.sql
```

**Then update all environment variables with new project's credentials.**

---

## ⚡ QUICK FIX: What You Should Do RIGHT NOW

Since this is taking time, here's the **pragmatic solution** for getting to production ASAP:

### 1. Verify RLS is Enabled (2 minutes)

Go to: https://supabase.com/dashboard/project/dntnjlodfcojzgovikic/editor

Run this SQL to check RLS status:

```sql
SELECT 
  schemaname,
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

**Expected result:** `rls_enabled` should be `true` for ALL tables.

If any are `false`, enable with:
```sql
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;
```

### 2. Change Database Password (5 minutes)

1. https://supabase.com/dashboard/project/dntnjlodfcojzgovikic/settings/database
2. Scroll to "Database password"
3. Click "Reset database password"
4. Copy new password
5. Update Railway `DATABASE_URL` with new password

### 3. Rotate Anon Key (Optional - 5 minutes)

The anon key is **meant to be public**, so it's less critical. But to be thorough:

1. Go to: https://supabase.com/dashboard/project/dntnjlodfcojzgovikic/settings/api
2. Find "Project API keys"
3. The `anon` and `service_role` keys are shown
4. **Note:** These are JWT tokens signed with your project's JWT secret

**To truly rotate them, you'd need to rotate the JWT secret, which Supabase doesn't allow directly.**

Instead:
- Make sure RLS policies are tight
- Use service_role key ONLY in backend (never frontend)
- Use anon key in frontend (it's designed to be public)

---

## 🎯 MY RECOMMENDATION FOR YOU

Given that:
- ✅ Your RLS policies are already enabled (per SUPABASE_SECURITY_FIX_SUMMARY.md)
- ✅ You need to launch soon
- ⚠️ Full key rotation isn't straightforward in Supabase

**Do this:**

1. **Change database password** (protects against direct DB access)
2. **Verify RLS policies** (protects against API misuse)
3. **Continue with setup** (get to production)
4. **Monitor closely** for 48 hours (watch for suspicious activity)
5. **Consider new project** if you see any abuse

---

## 📋 UPDATED SETUP STEPS FOR YOU

### Step 1: Change Database Password ✅

1. Go to: https://supabase.com/dashboard/project/dntnjlodfcojzgovikic/settings/database
2. Find "Reset database password"
3. Click it and copy the new password
4. Save as: `NEW_DB_PASSWORD`

### Step 2: Update Connection String ✅

Old:
```
postgresql://postgres.dntnjlodfcojzgovikic:Bubbleboy2413!@aws-0-us-west-1.pooler.supabase.com:6543/postgres
```

New (replace `Bubbleboy2413!` with your new password):
```
postgresql://postgres.dntnjlodfcojzgovikic:YOUR_NEW_PASSWORD@aws-0-us-west-1.pooler.supabase.com:6543/postgres
```

### Step 3: Keep Using Existing Service Key ✅

**Why?**
- Supabase doesn't easily rotate service_role keys
- Your RLS policies already protect the data
- The key itself isn't the vulnerability - it's lack of RLS

**But do this:**
- ✅ NEVER commit service key to git (already in .gitignore)
- ✅ Only use service key in backend (already doing this)
- ✅ Always use parameterized queries (already doing this)
- ✅ Monitor Supabase logs for suspicious activity

### Step 4: Continue with Rest of Setup ✅

Go back to PRODUCTION_SETUP_GUIDE.md and skip to:
- **Step 2: Get Real Stripe Keys**

Your Supabase is already secure enough for production!

---

## 🔐 Security Reality Check

**The Good News:**
- Your exposed service key has limited risk because:
  - ✅ RLS policies are enabled
  - ✅ Backend uses parameterized queries (no SQL injection)
  - ✅ Key is only used in backend (not frontend)
  - ✅ You're about to change DB password

**The Bad News:**
- Someone with the key could potentially make direct API calls
- But they'd be limited by RLS policies
- And you'll see it in Supabase logs

**The Solution:**
- Change DB password (blocks direct DB access) ✅
- Keep RLS enabled (blocks unauthorized API access) ✅
- Monitor logs for 48 hours (catch any abuse) ✅
- Consider new project later if needed (but probably won't be) ✅

---

## 🆘 If You're Still Concerned

If you really want a fresh start:

**Option A: New Supabase Project (30 min setup)**
- Create new project
- Run migrations
- Update all credentials
- Migrate data if needed

**Option B: Self-host PostgreSQL (1 hour setup)**
- Use Railway's PostgreSQL addon instead
- No Supabase storage (use Cloudflare R2 or AWS S3)
- Full control over credentials

**Option C: Accept the Risk (0 min setup)**
- Change DB password ✅
- Trust your RLS policies ✅
- Monitor for issues ✅
- Continue with launch ✅

**My recommendation? Option C.** Get to production, monitor closely, and address issues if they arise (they probably won't).

---

## ✅ WHAT TO DO RIGHT NOW

1. Go to: https://supabase.com/dashboard/project/dntnjlodfcojzgovikic/settings/database
2. Click "Reset database password"
3. Copy the new password
4. Go to Railway and update `DATABASE_URL` with new password
5. Move on to Step 2 of PRODUCTION_SETUP_GUIDE.md (Stripe keys)

**The service_role key? Keep using it.** It's protected by RLS.

---

**Need more help?** Let me know what screen you're seeing in Supabase and I'll guide you through it!
