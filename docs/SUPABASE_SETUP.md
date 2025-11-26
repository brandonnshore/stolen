# How to Get Your Supabase Service Role Key

## Option 1: Via Supabase Dashboard (RECOMMENDED)

1. Go to: https://supabase.com/dashboard/project/dntnjlodfcojzgovikic/settings/api

2. Scroll down to "Project API keys" section

3. Copy the **service_role** key (NOT the anon key)
   - It starts with `eyJ...`
   - This is a long JWT token

4. Add it to `/Users/brandonshore/stolen/stolen1/backend/.env`:
   ```bash
   SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3M...
   ```

## Option 2: Create Bucket Manually First

If you can't find the service role key, you can:

1. Go to: https://supabase.com/dashboard/project/dntnjlodfcojzgovikic/storage/buckets

2. Click "New bucket"
   - Name: `product-images`
   - Public bucket: **YES** (check this box)
   - File size limit: 10 MB
   - Allowed MIME types: `image/png, image/jpeg`

3. Click "Create bucket"

4. Then run the simplified upload script:
   ```bash
   cd /Users/brandonshore/stolen/stolen1/backend
   npx tsx scripts/upload-with-anon-key.ts
   ```

## Quick Access Links

- **API Settings**: https://supabase.com/dashboard/project/dntnjlodfcojzgovikic/settings/api
- **Storage**: https://supabase.com/dashboard/project/dntnjlodfcojzgovikic/storage/buckets
- **Database**: https://supabase.com/dashboard/project/dntnjlodfcojzgovikic/editor

## After Getting the Key

Run the upload script:
```bash
cd /Users/brandonshore/stolen/stolen1/backend
npx tsx scripts/upload-all-products-to-supabase.ts
```