# QUICKSTART: Upload Product Images to Supabase

## Fastest Way (Interactive Script)

```bash
cd /Users/brandonshore/stolen/stolen1/backend/scripts
./setup-and-upload.sh
```

This will:
1. Open Supabase dashboard to get your key
2. Guide you through bucket creation
3. Upload all images automatically
4. Update database with new URLs

---

## Manual Way (Step by Step)

### 1. Get Service Role Key

```bash
# Open this URL in your browser:
open https://supabase.com/dashboard/project/dntnjlodfcojzgovikic/settings/api
```

Copy the **service_role** key (the long JWT token)

### 2. Add to .env

Edit `/Users/brandonshore/stolen/stolen1/backend/.env` and add:

```bash
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...your-key-here
```

### 3. Create Bucket

```bash
# Open this URL:
open https://supabase.com/dashboard/project/dntnjlodfcojzgovikic/storage/buckets
```

Create bucket:
- Name: `product-images`
- Public: ✅ YES
- Size: 10 MB

### 4. Run Upload

```bash
cd /Users/brandonshore/stolen/stolen1/backend
npx tsx scripts/upload-all-products-to-supabase.ts
```

---

## Alternative: Upload via Shell Script

If Node.js isn't working:

```bash
# Export your key
export SUPABASE_SERVICE_KEY='your-key-here'

# Run upload
cd /Users/brandonshore/stolen/stolen1/backend/scripts
./manual-upload-curl.sh
```

---

## Verify Upload

Check if images are accessible:

```bash
curl -I https://dntnjlodfcojzgovikic.supabase.co/storage/v1/object/public/product-images/mockups/hoodie-black-front.png
```

Should return: `HTTP/2 200`

---

## What Gets Uploaded

**14 images from:** `/Users/brandonshore/stolen/stolen1/frontend/public/assets/`

- hoodie-black-front.png
- hoodie-black-back.png
- black-front.png
- black-back.png
- black-neck.png
- navy-front.png
- navy-back.png
- navy-neck.png
- back-tshirt.jpeg
- blank-tshirt.png
- neck-tshirt.jpeg
- pink-hoodie-model.jpeg
- stolentee-logo-white.png
- stolentee-logo.png

**Uploaded to:** `product-images/mockups/`

**Database updated:** Both `classic-hoodie` and `classic-tee` products

---

## Troubleshooting

**"Invalid Compact JWS"**
- Key is wrong or incomplete
- Make sure you copied the entire key
- Check for extra spaces

**"Bucket not found"**
- Create bucket manually via dashboard
- Make sure it's named exactly `product-images`

**"Permission denied"**
- Bucket must be set to PUBLIC
- Or use service_role key (not anon key)

---

## Quick Links

- API Settings: https://supabase.com/dashboard/project/dntnjlodfcojzgovikic/settings/api
- Storage: https://supabase.com/dashboard/project/dntnjlodfcojzgovikic/storage/buckets
- Database: https://supabase.com/dashboard/project/dntnjlodfcojzgovikic/editor

---

## After Upload

Your images will be at:
```
https://dntnjlodfcojzgovikic.supabase.co/storage/v1/object/public/product-images/mockups/{filename}
```

The database will automatically be updated with these URLs.
Your iOS app will load images from Supabase instead of local files.