# Product Images Upload to Supabase - Status Report

**Date:** 2025-11-17
**Project:** Stolen Tee iOS
**Task:** Migrate product images from local storage to Supabase Storage

---

## 📊 Current Status: READY TO EXECUTE

Everything is prepared and ready to upload. You just need to run the script with your Supabase key.

---

## ✅ What's Been Completed

### 1. Image Inventory
- ✅ Found **14 product images** in `/Users/brandonshore/stolen/stolen1/frontend/public/assets/`
- ✅ Identified 2 products in database that need updating

### 2. Scripts Created
- ✅ `/Users/brandonshore/stolen/stolen1/backend/scripts/upload-all-products-to-supabase.ts` - Main upload script
- ✅ `/Users/brandonshore/stolen/stolen1/backend/scripts/upload-with-anon-key.ts` - Alternative with anon key
- ✅ `/Users/brandonshore/stolen/stolen1/backend/scripts/manual-upload-curl.sh` - cURL-based upload
- ✅ `/Users/brandonshore/stolen/stolen1/backend/scripts/setup-and-upload.sh` - Interactive wizard

### 3. Documentation Created
- ✅ `/Users/brandonshore/stolen/stolen1/QUICKSTART_UPLOAD.md` - Quick start guide
- ✅ `/Users/brandonshore/stolen/stolen1/UPLOAD_INSTRUCTIONS.md` - Detailed instructions
- ✅ `/Users/brandonshore/stolen/stolen1/GET_SUPABASE_KEY.md` - How to get keys

### 4. Environment Configuration
- ✅ Updated `/Users/brandonshore/stolen/stolen1/backend/.env` with Supabase URL
- ✅ Added placeholder for SUPABASE_SERVICE_KEY (needs your actual key)

---

## 📸 Images to Upload (14 total)

### Product Images
| File | Size | Type | Product |
|------|------|------|---------|
| hoodie-black-front.png | 741 KB | PNG | Hoodie |
| hoodie-black-back.png | 546 KB | PNG | Hoodie |
| black-front.png | 162 KB | PNG | T-Shirt |
| black-back.png | 462 KB | PNG | T-Shirt |
| black-neck.png | 1.0 MB | PNG | T-Shirt |
| navy-front.png | 205 KB | PNG | T-Shirt |
| navy-back.png | 253 KB | PNG | T-Shirt |
| navy-neck.png | 1.5 MB | PNG | T-Shirt |

### Additional Assets
| File | Size | Type | Purpose |
|------|------|------|---------|
| back-tshirt.jpeg | 21 KB | JPEG | Reference |
| blank-tshirt.png | 25 KB | PNG | Template |
| neck-tshirt.jpeg | 222 KB | JPEG | Reference |
| pink-hoodie-model.jpeg | 135 KB | JPEG | Marketing |
| stolentee-logo-white.png | 54 KB | PNG | Logo |
| stolentee-logo.png | 62 KB | PNG | Logo |

**Total Size:** ~5.4 MB

---

## 🎯 What Will Happen When You Run the Script

### Automatic Actions:

1. **Create Supabase Bucket** (if not exists)
   - Name: `product-images`
   - Public: YES
   - Max size: 10 MB

2. **Upload All 14 Images**
   - Destination: `product-images/mockups/`
   - Format: Original filenames preserved
   - Cache: 1 year

3. **Update Database**
   - Update `classic-hoodie` product with 2 image URLs
   - Update `classic-tee` product with 6 image URLs

4. **Verification**
   - Test all uploaded URLs
   - Display final database state

---

## 🚀 How to Execute

### **Option 1: Interactive Wizard (RECOMMENDED)**

```bash
cd /Users/brandonshore/stolen/stolen1/backend/scripts
./setup-and-upload.sh
```

This will:
- Guide you to get your Supabase key
- Auto-update .env file
- Upload all images
- Update database

### **Option 2: Manual Execution**

1. Get your service role key:
   ```bash
   open https://supabase.com/dashboard/project/dntnjlodfcojzgovikic/settings/api
   ```

2. Add to `.env`:
   ```bash
   SUPABASE_SERVICE_KEY=eyJ...your-actual-key
   ```

3. Run upload:
   ```bash
   cd /Users/brandonshore/stolen/stolen1/backend
   npx tsx scripts/upload-all-products-to-supabase.ts
   ```

---

## 📋 Database Updates

The script will automatically run these updates:

### Classic Hoodie
```sql
UPDATE products
SET images = ARRAY[
  'https://dntnjlodfcojzgovikic.supabase.co/storage/v1/object/public/product-images/mockups/hoodie-black-front.png',
  'https://dntnjlodfcojzgovikic.supabase.co/storage/v1/object/public/product-images/mockups/hoodie-black-back.png'
]
WHERE slug = 'classic-hoodie';
```

### Classic T-Shirt
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

---

## 🔗 Quick Access Links

| Resource | URL |
|----------|-----|
| Supabase Dashboard | https://supabase.com/dashboard/project/dntnjlodfcojzgovikic |
| API Settings (Get Keys) | https://supabase.com/dashboard/project/dntnjlodfcojzgovikic/settings/api |
| Storage Buckets | https://supabase.com/dashboard/project/dntnjlodfcojzgovikic/storage/buckets |
| Database Editor | https://supabase.com/dashboard/project/dntnjlodfcojzgovikic/editor |

---

## ✅ Post-Upload Verification

After running the upload, verify with:

```bash
# Test hoodie image
curl -I https://dntnjlodfcojzgovikic.supabase.co/storage/v1/object/public/product-images/mockups/hoodie-black-front.png

# Expected: HTTP/2 200
```

```bash
# Check database
psql postgresql://brandonshore@localhost:5432/stolentee \
  -c "SELECT slug, array_length(images, 1) as image_count FROM products;"

# Expected:
#      slug       | image_count
# ----------------+-------------
#  classic-hoodie |           2
#  classic-tee    |           6
```

---

## 🎨 Final Image URLs

After upload, all images will be accessible at:

```
https://dntnjlodfcojzgovikic.supabase.co/storage/v1/object/public/product-images/mockups/{filename}
```

Examples:
- `https://dntnjlodfcojzgovikic.supabase.co/storage/v1/object/public/product-images/mockups/hoodie-black-front.png`
- `https://dntnjlodfcojzgovikic.supabase.co/storage/v1/object/public/product-images/mockups/black-front.png`
- `https://dntnjlodfcojzgovikic.supabase.co/storage/v1/object/public/product-images/mockups/stolentee-logo.png`

---

## 🔥 READY TO GO!

Everything is set up. Just run:

```bash
cd /Users/brandonshore/stolen/stolen1/backend/scripts
./setup-and-upload.sh
```

And follow the prompts!

---

## 📞 Support

If you encounter issues:

1. Check the service key is correct
2. Verify bucket is PUBLIC
3. Check database connection
4. Review script output for specific errors

All scripts include detailed error messages and troubleshooting hints.