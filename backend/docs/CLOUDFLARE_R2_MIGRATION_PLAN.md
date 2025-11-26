# Cloudflare R2 Storage Migration Plan

## Overview
Migrate from Supabase Storage ($25/month) to Cloudflare R2 ($1/month) for 95.8% cost savings.

## Cost Comparison

### Current: Supabase Pro ($25/month)
- Storage: 100GB included
- Bandwidth: 200GB/month included
- Cost: **$25/month**

### Target: Cloudflare R2 ($1.03/month)
At 1,000 users (57GB storage, 75GB bandwidth):
- Storage: 57GB × $0.015 = **$0.86/month**
- Class A operations (30K uploads): **$0.14/month**
- Class B operations (100K downloads): **$0.04/month**
- Egress bandwidth: **FREE** (zero charges!)
- **Total: $1.04/month**
- **Savings: $23.96/month (95.8%)**

### At Scale (5,000 users, 285GB storage):
- Storage: 285GB × $0.015 = **$4.28/month**
- Operations: **~$0.50/month**
- **Total: $4.78/month** (still 81% cheaper than Supabase)

## Migration Timeline

### Phase 1: Setup (Day 1-2)
1. Create Cloudflare account
2. Enable R2 storage
3. Create bucket: `stolentee-assets`
4. Generate API credentials
5. Configure custom domain: `assets.stolentee.com`
6. Enable CDN (automatic with Cloudflare)

### Phase 2: Code Implementation (Day 3-4)
1. Install AWS SDK: `npm install @aws-sdk/client-s3`
2. Create new storage service: `r2Storage.ts`
3. Update upload endpoints to use R2
4. Add environment variables
5. Test locally with R2

### Phase 3: Data Migration (Day 5)
1. Export all files from Supabase Storage
2. Upload to R2 using migration script
3. Update database URLs in `assets` table
4. Verify all images accessible via new URLs
5. Test frontend image loading

### Phase 4: Production Deployment (Day 6-7)
1. Deploy backend with R2 support
2. Monitor for errors
3. Gradual rollout: 10% → 50% → 100%
4. Keep Supabase as backup for 1 week
5. Delete old Supabase storage

**Total Timeline: 7 days**
**Downtime: Zero** (parallel migration)

## Implementation

### 1. Environment Variables (.env)
```bash
# Cloudflare R2 Configuration
R2_ACCOUNT_ID=your_account_id
R2_ACCESS_KEY_ID=your_access_key
R2_SECRET_ACCESS_KEY=your_secret_key
R2_BUCKET_NAME=stolentee-assets
R2_PUBLIC_DOMAIN=assets.stolentee.com
R2_ENDPOINT=https://your_account_id.r2.cloudflarestorage.com
```

### 2. New R2 Storage Service

Create `backend/src/services/r2Storage.ts`:

```typescript
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import crypto from 'crypto';
import path from 'path';

const r2Client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

const BUCKET_NAME = process.env.R2_BUCKET_NAME || 'stolentee-assets';
const PUBLIC_DOMAIN = process.env.R2_PUBLIC_DOMAIN || 'assets.stolentee.com';

/**
 * Upload file to Cloudflare R2
 * Returns the public URL of the uploaded file
 */
export const uploadToR2 = async (file: Express.Multer.File): Promise<string> => {
  // Generate unique filename
  const hash = crypto.createHash('md5').update(file.buffer).digest('hex');
  const ext = path.extname(file.originalname);
  const filename = `${hash}${ext}`;
  const key = `artwork/${filename}`;

  // Upload to R2
  await r2Client.send(new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: file.buffer,
    ContentType: file.mimetype,
    CacheControl: 'public, max-age=31536000, immutable', // 1 year cache
  }));

  // Return public URL
  return `https://${PUBLIC_DOMAIN}/${key}`;
};

/**
 * Delete file from Cloudflare R2
 */
export const deleteFromR2 = async (fileUrl: string): Promise<void> => {
  try {
    // Extract key from URL
    const url = new URL(fileUrl);
    const key = url.pathname.substring(1); // Remove leading slash

    await r2Client.send(new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    }));

    console.log(`✅ Deleted from R2: ${key}`);
  } catch (error) {
    console.error('Failed to delete from R2:', error);
  }
};

/**
 * Check if R2 is configured and available
 */
export const isR2Available = (): boolean => {
  return Boolean(
    process.env.R2_ENDPOINT &&
    process.env.R2_ACCESS_KEY_ID &&
    process.env.R2_SECRET_ACCESS_KEY
  );
};
```

### 3. Migration Script

Create `backend/src/scripts/migrateToR2.ts`:

```typescript
import { createClient } from '@supabase/supabase-js';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import pool from '../config/database';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

const r2Client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

async function migrateToR2() {
  console.log('Starting migration from Supabase to Cloudflare R2...');

  // Fetch all assets from database
  const { rows: assets } = await pool.query('SELECT * FROM assets ORDER BY created_at');

  console.log(`Found ${assets.length} assets to migrate`);

  let successCount = 0;
  let errorCount = 0;

  for (const asset of assets) {
    try {
      console.log(`\nMigrating asset ${asset.id}: ${asset.original_name}`);

      // Download from Supabase
      const response = await fetch(asset.file_url);
      if (!response.ok) {
        throw new Error(`Failed to download: ${response.statusText}`);
      }

      const buffer = await response.arrayBuffer();
      console.log(`  ✓ Downloaded ${buffer.byteLength} bytes`);

      // Generate R2 key
      const key = `uploads/${asset.id}-${asset.original_name}`;

      // Upload to R2
      await r2Client.send(new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME!,
        Key: key,
        Body: Buffer.from(buffer),
        ContentType: asset.file_type,
        CacheControl: 'public, max-age=31536000, immutable',
      }));

      const newUrl = `https://${process.env.R2_PUBLIC_DOMAIN}/${key}`;
      console.log(`  ✓ Uploaded to R2: ${newUrl}`);

      // Update database
      await pool.query(
        'UPDATE assets SET file_url = $1 WHERE id = $2',
        [newUrl, asset.id]
      );
      console.log(`  ✓ Database updated`);

      successCount++;

    } catch (error) {
      console.error(`  ✗ Failed to migrate ${asset.id}:`, error);
      errorCount++;
    }
  }

  console.log('\n========================================');
  console.log('Migration Summary:');
  console.log(`  Total assets: ${assets.length}`);
  console.log(`  Successful: ${successCount}`);
  console.log(`  Failed: ${errorCount}`);
  console.log('========================================\n');

  await pool.end();
}

// Run migration
migrateToR2().catch(console.error);
```

### 4. Update Upload Service

Update `backend/src/services/uploadService.ts`:

```typescript
import { uploadToR2, isR2Available } from './r2Storage';
import { uploadToSupabase, isSupabaseStorageAvailable } from './supabaseStorage';

export const uploadFile = async (file: Express.Multer.File): Promise<string> => {
  // Prefer R2 if available (95% cost savings)
  if (isR2Available()) {
    console.log('📦 Uploading to Cloudflare R2 (SAVING $0.024 vs Supabase)');
    return uploadToR2(file);
  }

  // Fall back to Supabase
  if (isSupabaseStorageAvailable()) {
    console.log('📦 Uploading to Supabase Storage (fallback)');
    return uploadToSupabase(file);
  }

  throw new Error('No storage service configured');
};
```

## Cloudflare Setup Steps

### 1. Create Cloudflare Account
- Go to https://dash.cloudflare.com
- Sign up or log in
- Navigate to R2 section

### 2. Create R2 Bucket
```bash
# Or via dashboard:
# Dashboard → R2 → Create Bucket
# Name: stolentee-assets
# Location: Automatic
```

### 3. Generate API Credentials
```bash
# Dashboard → R2 → Manage R2 API Tokens
# Create API Token:
# - Permissions: Object Read & Write
# - Scope: Apply to specific bucket (stolentee-assets)
# - TTL: Never expire
```

### 4. Configure Custom Domain
```bash
# Dashboard → R2 → stolentee-assets → Settings → Public Access
# Add custom domain: assets.stolentee.com
# This enables FREE CDN automatically!
```

### 5. DNS Configuration
Add CNAME record in Cloudflare DNS:
```
Type: CNAME
Name: assets
Target: stolentee-assets.r2.cloudflarestorage.com
Proxy: Enabled (orange cloud) ← This enables CDN!
```

## Testing

### Local Testing
```bash
# Set environment variables
export R2_ENDPOINT=https://xxx.r2.cloudflarestorage.com
export R2_ACCESS_KEY_ID=your_key
export R2_SECRET_ACCESS_KEY=your_secret
export R2_BUCKET_NAME=stolentee-assets
export R2_PUBLIC_DOMAIN=assets.stolentee.com

# Test upload
curl -X POST http://localhost:3001/api/uploads/shirt-photo \
  -F "image=@test-image.jpg"
```

### Verify Migration
```bash
# Run migration script
npm run migrate:r2

# Check database
psql $DATABASE_URL -c "SELECT id, file_url FROM assets LIMIT 5;"

# Test image loading
curl -I https://assets.stolentee.com/uploads/test-image.jpg
```

## Rollback Plan

If migration fails:

1. **Revert Code**
   ```bash
   git revert <commit_hash>
   ```

2. **Keep Supabase URLs**
   - Old URLs still work for 1 week
   - No data loss

3. **Database Rollback**
   ```sql
   -- Restore old URLs from backup
   UPDATE assets SET file_url = old_backup.file_url
   FROM old_backup WHERE assets.id = old_backup.id;
   ```

## Monitoring

### Cost Monitoring
```bash
# Check R2 usage and costs
Cloudflare Dashboard → R2 → stolentee-assets → Metrics
```

### Performance Monitoring
```bash
# CDN cache hit rate (should be >80%)
Cloudflare Dashboard → Analytics → Performance
```

### Error Monitoring
```bash
# Check Railway logs for upload errors
railway logs --service backend
```

## Benefits

### Cost Savings
- **Monthly:** $23.96 saved (95.8% reduction)
- **Yearly:** $287.52 saved
- **At 5,000 users:** Still only $4.78/month vs $25+/month

### Performance Benefits
- **FREE CDN:** Global edge network (300+ locations)
- **Zero Egress Fees:** Unlimited bandwidth at no cost
- **Auto Image Optimization:** Cloudflare Polish (optional)
- **DDoS Protection:** Included free
- **SSL/TLS:** Automatic

### Scalability
- **Storage:** Unlimited (pay per GB)
- **Bandwidth:** Unlimited (FREE egress)
- **Requests:** Unlimited (pay per operation)
- **No hard limits** like Supabase

## Success Criteria

Migration is successful when:
- ✅ All assets accessible via R2 URLs
- ✅ Frontend loads images without errors
- ✅ Upload flow works end-to-end
- ✅ CDN cache hit rate > 80%
- ✅ No increase in image load times
- ✅ Cost reduced to ~$1/month
- ✅ Zero downtime during migration

## Support Resources

- **Cloudflare R2 Docs:** https://developers.cloudflare.com/r2/
- **AWS S3 SDK Docs:** https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/
- **Migration Support:** Contact Cloudflare support if issues arise

## Next Steps After Migration

1. **Enable Image Optimization**
   - Cloudflare Polish (automatic WebP conversion)
   - Reduces bandwidth by 30-50%

2. **Configure Cache Rules**
   - Cache product images: 1 year
   - Cache user uploads: 1 month
   - Purge cache on delete

3. **Set Up Monitoring**
   - Track R2 costs daily
   - Monitor CDN hit rates
   - Alert on errors

4. **Delete Supabase Storage**
   - After 1 week of stable operation
   - Confirm all images migrated
   - Cancel Supabase Pro plan
   - **Save $25/month!**
