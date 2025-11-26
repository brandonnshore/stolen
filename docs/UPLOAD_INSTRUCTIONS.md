# Complete Guide: Upload Product Images to Supabase

## Current Status

- **14 product images** found in `/Users/brandonshore/stolen/stolen1/frontend/public/assets/`
- **2 products** in database need image URLs updated
- **Upload scripts** created and ready to run

## STEP 1: Get Your Supabase Keys

### Option A: Service Role Key (Recommended)

1. Open: https://supabase.com/dashboard/project/dntnjlodfcojzgovikic/settings/api

2. Find the **"service_role"** key in the "Project API keys" section
   - Look for the key labeled `service_role` (SECRET)
   - Click to copy the long JWT token

3. Add to `/Users/brandonshore/stolen/stolen1/backend/.env`:
   ```bash
   SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

### Option B: Anon Key (If bucket already exists)

1. Open: https://supabase.com/dashboard/project/dntnjlodfcojzgovikic/settings/api

2. Find the **"anon"** / **"public"** key
   - This is safe to use in frontend code
   - Copy the JWT token

3. Add to `/Users/brandonshore/stolen/stolen1/backend/.env`:
   ```bash
   SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

## STEP 2: Create the Storage Bucket (if needed)

### Option A: Via Dashboard (Easy)

1. Go to: https://supabase.com/dashboard/project/dntnjlodfcojzgovikic/storage/buckets

2. Click **"New bucket"**

3. Configure:
   - **Name**: `product-images`
   - **Public bucket**: ✅ YES (IMPORTANT!)
   - **File size limit**: 10 MB
   - **Allowed MIME types**: `image/png, image/jpeg`

4. Click **"Create bucket"**

### Option B: Via Script (Automatic)

If you have the service role key, the script will create the bucket automatically.

## STEP 3: Run the Upload Script

### If you have SERVICE ROLE key:

```bash
cd /Users/brandonshore/stolen/stolen1/backend
npx tsx scripts/upload-all-products-to-supabase.ts
```

### If you only have ANON key (and bucket exists):

```bash
cd /Users/brandonshore/stolen/stolen1/backend
npx tsx scripts/upload-with-anon-key.ts
```

## STEP 4: Verify Upload

The script will automatically:

1. ✅ Upload all 14 images to `product-images/mockups/`
2. ✅ Update database with Supabase URLs
3. ✅ Display final URLs for verification

### Manual Verification

Test an image URL:
```bash
curl -I https://dntnjlodfcojzgovikic.supabase.co/storage/v1/object/public/product-images/mockups/hoodie-black-front.png
```

Should return: `HTTP/2 200`

## STEP 5: Update iOS App (if needed)

The backend API will now return Supabase URLs automatically. No iOS changes needed if using the API.

## Images to be Uploaded

From `/Users/brandonshore/stolen/stolen1/frontend/public/assets/`:

**Hoodie Images (2):**
- hoodie-black-front.png
- hoodie-black-back.png

**T-Shirt Images (6):**
- black-front.png
- black-back.png
- black-neck.png
- navy-front.png
- navy-back.png
- navy-neck.png

**Other Assets (6):**
- back-tshirt.jpeg
- blank-tshirt.png
- neck-tshirt.jpeg
- pink-hoodie-model.jpeg
- stolentee-logo-white.png
- stolentee-logo.png

**Total: 14 files**

## Expected Supabase URLs

After upload, images will be at:
```
https://dntnjlodfcojzgovikic.supabase.co/storage/v1/object/public/product-images/mockups/{filename}
```

Example:
```
https://dntnjlodfcojzgovikic.supabase.co/storage/v1/object/public/product-images/mockups/hoodie-black-front.png
```

## Database Updates

The script will update:

**classic-hoodie:**
```sql
UPDATE products
SET images = ARRAY[
  'https://dntnjlodfcojzgovikic.supabase.co/storage/v1/object/public/product-images/mockups/hoodie-black-front.png',
  'https://dntnjlodfcojzgovikic.supabase.co/storage/v1/object/public/product-images/mockups/hoodie-black-back.png'
]
WHERE slug = 'classic-hoodie';
```

**classic-tee:**
```sql
UPDATE products
SET images = ARRAY[
  'https://dntnjlodfcojzgovikic.supabase.co/storage/v1/object/public/product-images/mockups/black-front.png',
  'https://dntnjlodfcojzgovikic.supabase.co/storage/v1/object/public/product-images/mockups/black-back.png',
  'https://dntnjlodfcojzgovikic.supabase.co/storage/v1/object/public/product-images/mockups/black-neck.png',
  'https://dntnjlodfcojzgovikic.supabase.co/storage/v1/object/public/product-images/mockups/navy-front.png',
  'https://dntnjlodfcojzgovikic.supabase.co/storage/v1/object/public/product-images/mockups/navy-back.png',
  'https://dntnjlodfcojzgovikic.supabase.co/storage/v1/object/public/product-images/mockups/navy-neck.png'
]
WHERE slug = 'classic-tee';
```

## Troubleshooting

### "Invalid Compact JWS" error
- The key format is wrong or the key is incorrect
- Make sure you copied the entire JWT token
- Check there are no extra spaces or newlines

### "Bucket not found" error
- Create the bucket manually via dashboard
- Use Option B above

### "Permission denied" error
- Make sure the bucket is set to PUBLIC
- Or use the service role key instead of anon key

### Images not loading in app
- Verify the URLs are correct with `curl`
- Check CORS settings in Supabase
- Clear app cache

## Need Help?

- **Supabase Dashboard**: https://supabase.com/dashboard/project/dntnjlodfcojzgovikic
- **Storage Settings**: https://supabase.com/dashboard/project/dntnjlodfcojzgovikic/storage/buckets
- **API Settings**: https://supabase.com/dashboard/project/dntnjlodfcojzgovikic/settings/api