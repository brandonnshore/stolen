# INFRASTRUCTURE QUICK WINS
## Implementation Guides for Critical Optimizations

**Last Updated:** 2025-11-26
**Priority:** IMMEDIATE ACTIONS for Cost Savings

---

## QUICK WIN #1: Self-Hosted Background Removal (rembg)
**Savings:** $2,001/month → $25/month (98.8% reduction)
**Timeline:** 2-3 weeks
**Difficulty:** MEDIUM

### What This Does
Replaces expensive Remove.bg API ($2,001/month at 1,000 users) with self-hosted open-source solution (rembg library) running on Railway for $25/month.

### Implementation Steps

#### Step 1: Create rembg Service (Day 1-2)

**Create new file:** `/Users/brandonshore/stolen/stolen1/rembg-service/app.py`

```python
from flask import Flask, request, send_file, jsonify
from rembg import remove
from PIL import Image
import io
import logging

app = Flask(__name__)
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'rembg-background-removal',
        'version': '1.0.0'
    })

@app.route('/remove', methods=['POST'])
def remove_background():
    """Remove background from uploaded image"""
    try:
        # Check if image file is present
        if 'image_file' not in request.files:
            return jsonify({'error': 'No image file provided'}), 400

        # Read uploaded image
        input_file = request.files['image_file']
        input_image = input_file.read()

        logger.info(f"Processing image: {input_file.filename}, size: {len(input_image)} bytes")

        # Remove background using rembg
        output_image = remove(input_image)

        logger.info(f"Background removed successfully, output size: {len(output_image)} bytes")

        # Return processed image
        return send_file(
            io.BytesIO(output_image),
            mimetype='image/png',
            as_attachment=False,
            download_name='output.png'
        )

    except Exception as e:
        logger.error(f"Error processing image: {str(e)}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    # Run on 0.0.0.0 so Railway can access it
    app.run(host='0.0.0.0', port=5000, debug=False)
```

**Create:** `/Users/brandonshore/stolen/stolen1/rembg-service/requirements.txt`

```txt
Flask==3.0.0
rembg[gpu]==2.0.50
Pillow==10.1.0
gunicorn==21.2.0
```

**Create:** `/Users/brandonshore/stolen/stolen1/rembg-service/Dockerfile`

```dockerfile
FROM python:3.10-slim

WORKDIR /app

# Install system dependencies for image processing
RUN apt-get update && apt-get install -y \
    libgl1-mesa-glx \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY app.py .

# Expose port
EXPOSE 5000

# Run with gunicorn for production
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--workers", "2", "--timeout", "120", "app:app"]
```

**Create:** `/Users/brandonshore/stolen/stolen1/rembg-service/railway.json`

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "DOCKERFILE",
    "dockerfilePath": "Dockerfile"
  },
  "deploy": {
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10,
    "healthcheckPath": "/health",
    "healthcheckTimeout": 100
  }
}
```

#### Step 2: Deploy to Railway (Day 2)

1. **Create new Railway service:**
   ```bash
   cd /Users/brandonshore/stolen/stolen1/rembg-service
   railway init
   railway up
   ```

2. **Configure Railway service:**
   - Service name: `stolen-rembg`
   - RAM: 2GB (required for ML model)
   - Region: Same as backend (for low latency)
   - Copy service URL (e.g., `https://stolen-rembg.up.railway.app`)

3. **Test deployment:**
   ```bash
   # Health check
   curl https://stolen-rembg.up.railway.app/health

   # Test with image
   curl -X POST https://stolen-rembg.up.railway.app/remove \
     -F "image_file=@test-image.jpg" \
     --output test-output.png
   ```

#### Step 3: Update Backend Service (Day 3-4)

**Update:** `/Users/brandonshore/stolen/stolen1/backend/src/services/backgroundRemovalService.ts`

```typescript
import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';

interface RemovalResult {
  success: boolean;
  transparentBuffer?: Buffer;
  error?: string;
}

class BackgroundRemovalService {
  private removeBgApiKey: string = '';
  private rembgEndpoint: string = '';
  private creditsExhausted: boolean = false;
  private useRemoveBg: boolean = false; // Feature flag

  async initialize(): Promise<void> {
    try {
      this.removeBgApiKey = process.env.REMOVEBG_API_KEY || '';
      this.rembgEndpoint = process.env.REMBG_ENDPOINT || 'http://localhost:5000';
      this.useRemoveBg = process.env.USE_REMOVEBG === 'true';

      if (this.useRemoveBg && !this.removeBgApiKey) {
        console.warn('⚠️ Remove.bg API key not configured - will use self-hosted rembg');
        this.useRemoveBg = false;
      }

      console.log('✅ Background removal service initialized', {
        provider: this.useRemoveBg ? 'Remove.bg' : 'Self-hosted rembg',
        endpoint: this.useRemoveBg ? 'api.remove.bg' : this.rembgEndpoint,
      });
    } catch (error) {
      console.error('❌ Failed to initialize background removal service:', error);
      throw error;
    }
  }

  async removeBackground(imagePath: string): Promise<RemovalResult> {
    if (!this.removeBgApiKey && !this.rembgEndpoint) {
      await this.initialize();
    }

    // Route to appropriate service
    if (this.useRemoveBg && this.removeBgApiKey && !this.creditsExhausted) {
      return this.removeBackgroundRemoveBg(imagePath);
    } else {
      return this.removeBackgroundSelfHosted(imagePath);
    }
  }

  /**
   * Self-hosted rembg service (RECOMMENDED for cost savings)
   */
  private async removeBackgroundSelfHosted(imagePath: string): Promise<RemovalResult> {
    try {
      console.log(`🔄 Starting self-hosted rembg background removal for: ${imagePath}`);

      const formData = new FormData();
      formData.append('image_file', fs.createReadStream(imagePath));

      const response = await axios.post(
        `${this.rembgEndpoint}/remove`,
        formData,
        {
          headers: formData.getHeaders(),
          responseType: 'arraybuffer',
          timeout: 120000, // 2 minute timeout (processing can take time)
        }
      );

      const transparentBuffer = Buffer.from(response.data);

      console.log('✅ Self-hosted rembg background removal completed', {
        inputSize: fs.statSync(imagePath).size,
        outputSize: transparentBuffer.length,
      });

      return {
        success: true,
        transparentBuffer,
        error: undefined,
      };
    } catch (error: any) {
      console.error('❌ Self-hosted rembg failed:', error.message);

      // Fallback to original image if service fails
      if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
        console.error('🚨 rembg service is down - returning original image as fallback');
        try {
          const imageBuffer = fs.readFileSync(imagePath);
          return {
            success: true,
            transparentBuffer: imageBuffer,
            error: 'Background removal service unavailable - returned original image',
          };
        } catch (readError) {
          return {
            success: false,
            error: 'Background removal failed and could not read original image',
          };
        }
      }

      return {
        success: false,
        error: error.message || 'Unknown error during background removal',
      };
    }
  }

  /**
   * Remove.bg API (for premium users or fallback)
   */
  private async removeBackgroundRemoveBg(imagePath: string): Promise<RemovalResult> {
    // Skip API call if credits exhausted
    if (this.creditsExhausted) {
      console.log('⚠️ Remove.bg credits exhausted - falling back to self-hosted');
      return this.removeBackgroundSelfHosted(imagePath);
    }

    try {
      console.log(`🔄 Starting Remove.bg background removal for: ${imagePath}`);

      const formData = new FormData();
      formData.append('image_file', fs.createReadStream(imagePath));
      formData.append('size', 'full');
      formData.append('format', 'png');

      const response = await axios.post(
        'https://api.remove.bg/v1.0/removebg',
        formData,
        {
          headers: {
            'X-Api-Key': this.removeBgApiKey,
            ...formData.getHeaders(),
          },
          responseType: 'arraybuffer',
          timeout: 60000,
        }
      );

      const transparentBuffer = Buffer.from(response.data);
      console.log('✅ Remove.bg background removal completed');

      return {
        success: true,
        transparentBuffer,
        error: undefined,
      };
    } catch (error: any) {
      console.error('❌ Remove.bg API failed:', error.message);

      if (error.response) {
        const statusCode = error.response.status;

        if (statusCode === 403) {
          throw new Error('AUTH_FAILED: Remove.bg API key invalid - do not retry');
        } else if (statusCode === 402) {
          this.creditsExhausted = true;
          console.log('🚫 Remove.bg credits exhausted - falling back to self-hosted');
          return this.removeBackgroundSelfHosted(imagePath);
        }
      }

      // Fallback to self-hosted on any error
      console.log('⚠️ Remove.bg failed - falling back to self-hosted rembg');
      return this.removeBackgroundSelfHosted(imagePath);
    }
  }

  /**
   * Reset the credits exhausted flag (for admin panel)
   */
  resetCreditsFlag(): void {
    this.creditsExhausted = false;
    console.log('✅ Remove.bg credits flag reset');
  }

  /**
   * Toggle between Remove.bg and self-hosted (for admin panel)
   */
  setProvider(useRemoveBg: boolean): void {
    this.useRemoveBg = useRemoveBg;
    console.log(`✅ Background removal provider set to: ${useRemoveBg ? 'Remove.bg' : 'Self-hosted rembg'}`);
  }
}

export default new BackgroundRemovalService();
```

**Add environment variable to Railway backend:**
```bash
# Railway dashboard → backend service → Variables
REMBG_ENDPOINT=https://stolen-rembg.up.railway.app
USE_REMOVEBG=false  # Set to true to use Remove.bg instead
```

#### Step 4: Testing & Validation (Day 5-6)

**Test script:** `/Users/brandonshore/stolen/stolen1/backend/scripts/test-rembg.ts`

```typescript
import axios from 'axios';
import fs from 'fs';
import FormData from 'form-data';
import path from 'path';

async function testRembgService() {
  const rembgEndpoint = process.env.REMBG_ENDPOINT || 'http://localhost:5000';
  const testImagePath = path.join(__dirname, '../../test-images/test-shirt.jpg');

  console.log('🧪 Testing rembg service...');
  console.log(`Endpoint: ${rembgEndpoint}`);
  console.log(`Test image: ${testImagePath}`);

  try {
    // Test 1: Health check
    console.log('\n1. Testing health endpoint...');
    const healthRes = await axios.get(`${rembgEndpoint}/health`);
    console.log('✅ Health check passed:', healthRes.data);

    // Test 2: Background removal
    console.log('\n2. Testing background removal...');
    const formData = new FormData();
    formData.append('image_file', fs.createReadStream(testImagePath));

    const startTime = Date.now();
    const removeRes = await axios.post(`${rembgEndpoint}/remove`, formData, {
      headers: formData.getHeaders(),
      responseType: 'arraybuffer',
      timeout: 120000,
    });
    const duration = Date.now() - startTime;

    const outputBuffer = Buffer.from(removeRes.data);
    const outputPath = path.join(__dirname, '../../test-images/test-output.png');
    fs.writeFileSync(outputPath, outputBuffer);

    console.log('✅ Background removal passed:', {
      duration: `${duration}ms`,
      inputSize: `${fs.statSync(testImagePath).size} bytes`,
      outputSize: `${outputBuffer.length} bytes`,
      outputPath,
    });

    // Test 3: Compare quality (manual inspection)
    console.log('\n3. Quality comparison:');
    console.log(`   Input: ${testImagePath}`);
    console.log(`   Output: ${outputPath}`);
    console.log('   👀 Please manually inspect the output image for quality.');

    console.log('\n🎉 All tests passed!');
  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    process.exit(1);
  }
}

testRembgService();
```

**Run test:**
```bash
cd /Users/brandonshore/stolen/stolen1/backend
npx tsx scripts/test-rembg.ts
```

#### Step 5: Gradual Rollout (Day 7-14)

**A/B Testing Strategy:**

1. **Week 1 (10% traffic):**
   - Update environment variable: `USE_REMOVEBG=false` (use rembg)
   - Monitor 10% of jobs
   - Compare quality manually
   - Check error rates

2. **Week 2 (50% traffic):**
   - If quality acceptable, increase to 50%
   - Monitor performance metrics
   - Compare processing times
   - Check user feedback

3. **Week 3 (100% traffic):**
   - Full rollout to all jobs
   - Remove Remove.bg API key (save $2,001/month)
   - Monitor for 1 week
   - Keep Remove.bg as emergency fallback

**Monitoring Checklist:**
- [ ] Processing time (target: <5 seconds)
- [ ] Error rate (target: <1%)
- [ ] Output quality (manual inspection of 10 samples)
- [ ] Railway service health (CPU, memory, crashes)
- [ ] User feedback (any complaints about quality?)

#### Expected Results

**Cost Savings:**
```
Before: Remove.bg at 1,000 users
  - Subscription: $9/month (40 images)
  - Overage: (10,000-40) × $0.20 = $1,992/month
  - Total: $2,001/month 🔴

After: Self-hosted rembg
  - Railway service: $25/month (2GB RAM, 1 instance)
  - Total: $25/month ✅

SAVINGS: $1,976/month (98.8% reduction) 🎉
```

**Quality Comparison:**
```
Remove.bg:     ⭐⭐⭐⭐⭐ (5/5) - Best in class
Self-hosted:   ⭐⭐⭐⭐ (4/5) - Very good, acceptable for most users

Trade-off: 20% quality drop for 98.8% cost savings
Recommendation: ACCEPT for free/standard tier users
                Use Remove.bg for premium tier users only (if needed)
```

**Performance:**
```
Remove.bg API:   2-4 seconds average
Self-hosted:     3-5 seconds average (slightly slower, but acceptable)

Network latency: Reduced (Railway → Railway vs Railway → Remove.bg servers)
```

---

## QUICK WIN #2: Cloudflare R2 Migration
**Savings:** $25/month → $1.03/month (95.9% reduction)
**Timeline:** 1 week
**Difficulty:** MEDIUM

### What This Does
Migrates file storage from Supabase (1GB limit, $25/month for Pro) to Cloudflare R2 (unlimited storage, $0.015/GB, FREE egress).

### Implementation Steps

#### Step 1: Create Cloudflare R2 Bucket (Day 1)

1. **Sign up for Cloudflare account** (if not already):
   - Go to https://dash.cloudflare.com/sign-up
   - Verify email

2. **Create R2 bucket:**
   - Navigate to R2 Object Storage
   - Click "Create bucket"
   - Bucket name: `stolentee-assets`
   - Location: Auto (closest to users)

3. **Generate API credentials:**
   - Go to R2 → Manage R2 API Tokens
   - Click "Create API Token"
   - Token name: `stolentee-backend`
   - Permissions: Read & Write
   - Save credentials:
     - Access Key ID: `xxx`
     - Secret Access Key: `xxx`
     - Endpoint: `https://xxx.r2.cloudflarestorage.com`

4. **Set up custom domain (optional but recommended):**
   - Go to R2 bucket → Settings → Custom Domains
   - Add domain: `assets.stolentee.com`
   - Update DNS (CNAME): `assets.stolentee.com` → `xxx.r2.cloudflarestorage.com`
   - Enable automatic HTTPS

#### Step 2: Update Backend Code (Day 2-3)

**Install dependencies:**
```bash
cd /Users/brandonshore/stolen/stolen1/backend
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

**Create:** `/Users/brandonshore/stolen/stolen1/backend/src/services/r2Storage.ts`

```typescript
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from '../config/env';
import { logger } from '../utils/logger';

class R2StorageService {
  private client: S3Client;
  private bucketName: string;
  private publicDomain: string;

  constructor() {
    this.bucketName = process.env.R2_BUCKET_NAME || 'stolentee-assets';
    this.publicDomain = process.env.R2_PUBLIC_DOMAIN || '';

    this.client = new S3Client({
      region: 'auto',
      endpoint: process.env.R2_ENDPOINT,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
      },
    });

    logger.info('✅ R2 Storage service initialized', {
      bucket: this.bucketName,
      endpoint: process.env.R2_ENDPOINT?.replace(/https?:\/\//, ''),
    });
  }

  /**
   * Upload file to R2
   */
  async uploadFile(file: Express.Multer.File, folder: string = 'uploads'): Promise<string> {
    try {
      const timestamp = Date.now();
      const key = `${folder}/${timestamp}-${file.originalname}`;

      await this.client.send(new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
        // Metadata
        Metadata: {
          originalName: file.originalname,
          uploadedAt: new Date().toISOString(),
        },
      }));

      // Return public URL
      const publicUrl = this.publicDomain
        ? `https://${this.publicDomain}/${key}`
        : `${process.env.R2_ENDPOINT}/${this.bucketName}/${key}`;

      logger.info('✅ File uploaded to R2', {
        key,
        size: file.size,
        url: publicUrl,
      });

      return publicUrl;
    } catch (error) {
      logger.error('❌ Failed to upload file to R2', {}, error as Error);
      throw error;
    }
  }

  /**
   * Upload buffer to R2
   */
  async uploadBuffer(buffer: Buffer, filename: string, mimetype: string, folder: string = 'uploads'): Promise<string> {
    try {
      const timestamp = Date.now();
      const key = `${folder}/${timestamp}-${filename}`;

      await this.client.send(new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: buffer,
        ContentType: mimetype,
        Metadata: {
          uploadedAt: new Date().toISOString(),
        },
      }));

      const publicUrl = this.publicDomain
        ? `https://${this.publicDomain}/${key}`
        : `${process.env.R2_ENDPOINT}/${this.bucketName}/${key}`;

      logger.info('✅ Buffer uploaded to R2', {
        key,
        size: buffer.length,
        url: publicUrl,
      });

      return publicUrl;
    } catch (error) {
      logger.error('❌ Failed to upload buffer to R2', {}, error as Error);
      throw error;
    }
  }

  /**
   * Get signed URL for temporary access (for private files)
   */
  async getSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      const signedUrl = await getSignedUrl(this.client, command, { expiresIn });
      return signedUrl;
    } catch (error) {
      logger.error('❌ Failed to generate signed URL', {}, error as Error);
      throw error;
    }
  }

  /**
   * Delete file from R2
   */
  async deleteFile(key: string): Promise<void> {
    try {
      await this.client.send(new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      }));

      logger.info('✅ File deleted from R2', { key });
    } catch (error) {
      logger.error('❌ Failed to delete file from R2', {}, error as Error);
      throw error;
    }
  }
}

export const r2Storage = new R2StorageService();
export default r2Storage;
```

**Update:** `/Users/brandonshore/stolen/stolen1/backend/src/services/uploadService.ts`

```typescript
// Change from:
import { uploadToSupabase } from './supabaseStorage';

// To:
import { r2Storage } from './r2Storage';

// Update upload function:
async function handleUpload(file: Express.Multer.File): Promise<string> {
  // Upload to R2
  const fileUrl = await r2Storage.uploadFile(file, 'uploads');
  return fileUrl;
}
```

**Add environment variables to Railway:**
```bash
# Railway dashboard → backend service → Variables
R2_ENDPOINT=https://xxx.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=your_access_key
R2_SECRET_ACCESS_KEY=your_secret_key
R2_BUCKET_NAME=stolentee-assets
R2_PUBLIC_DOMAIN=assets.stolentee.com  # Optional but recommended
```

#### Step 3: Data Migration (Day 4-5)

**Create migration script:** `/Users/brandonshore/stolen/stolen1/backend/scripts/migrate-to-r2.ts`

```typescript
import { createClient } from '@supabase/supabase-js';
import { r2Storage } from '../src/services/r2Storage';
import pool from '../src/config/database';
import axios from 'axios';

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_KEY || ''
);

async function migrateToR2() {
  console.log('🔄 Starting migration from Supabase to R2...');

  // Fetch all assets from database
  const { rows: assets } = await pool.query('SELECT * FROM assets ORDER BY created_at DESC');
  console.log(`Found ${assets.length} assets to migrate`);

  let migrated = 0;
  let errors = 0;

  for (const asset of assets) {
    try {
      console.log(`Migrating ${asset.id}: ${asset.file_url}`);

      // Download from Supabase
      const response = await axios.get(asset.file_url, {
        responseType: 'arraybuffer',
        timeout: 30000,
      });
      const buffer = Buffer.from(response.data);

      // Upload to R2
      const newUrl = await r2Storage.uploadBuffer(
        buffer,
        asset.original_name,
        asset.file_type,
        'migrated'
      );

      // Update database
      await pool.query(
        'UPDATE assets SET file_url = $1 WHERE id = $2',
        [newUrl, asset.id]
      );

      migrated++;
      console.log(`✅ Migrated ${asset.id} (${migrated}/${assets.length})`);

      // Rate limit to avoid overwhelming systems
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error: any) {
      errors++;
      console.error(`❌ Failed to migrate ${asset.id}:`, error.message);
      // Continue with next asset
    }
  }

  console.log(`\n🎉 Migration complete!`);
  console.log(`   Migrated: ${migrated}`);
  console.log(`   Errors: ${errors}`);
  console.log(`   Success rate: ${((migrated / assets.length) * 100).toFixed(2)}%`);
}

migrateToR2()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
```

**Run migration:**
```bash
cd /Users/brandonshore/stolen/stolen1/backend
npx tsx scripts/migrate-to-r2.ts
```

#### Step 4: Validation & Cleanup (Day 6-7)

**Validation checklist:**
- [ ] All assets migrated successfully
- [ ] Frontend can load images from R2
- [ ] New uploads go to R2
- [ ] Job processing works with R2 URLs
- [ ] No broken images on site

**Cleanup (after 1 week of successful R2 usage):**
- [ ] Delete old Supabase storage bucket
- [ ] Downgrade Supabase to Free tier (if on Pro)
- [ ] Remove Supabase storage credentials from env
- [ ] Update documentation

#### Expected Results

**Cost Savings:**
```
Before: Supabase Pro
  - Storage: $25/month (100GB included)
  - Bandwidth: Included (200GB)
  - Total: $25/month

After: Cloudflare R2
  - Storage: 57GB × $0.015 = $0.86/month
  - Bandwidth: FREE (zero egress fees) ✅
  - Class A operations (uploads): 30,000 × $0.0045/1000 = $0.14/month
  - Class B operations (downloads): 100,000 × $0.00036/1000 = $0.04/month
  - Total: $1.04/month

SAVINGS: $23.96/month (95.8% reduction) 🎉
```

**Performance Benefits:**
- FREE CDN included (Cloudflare global network)
- Faster image loads worldwide
- Zero egress fees (huge savings at scale)
- Unlimited storage capacity

---

## QUICK WIN #3: Frontend Bundle Optimization
**Savings:** $20/month (stay on Vercel Hobby instead of upgrading to Pro)
**Timeline:** 2-3 days
**Difficulty:** EASY

### What This Does
Optimizes frontend bundle size and bandwidth usage to stay within Vercel Hobby plan limits (100GB/month) at 1,000 users.

### Implementation Steps

#### Step 1: Code Splitting (Day 1)

**Update:** `/Users/brandonshore/stolen/stolen1/frontend/src/App.tsx`

```typescript
import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

// Load critical components immediately
import Layout from './components/Layout';
import LoadingSpinner from './components/LoadingSpinner';

// Lazy load heavy components
const Designer = lazy(() => import('./pages/Designer'));
const Products = lazy(() => import('./pages/Products'));
const Cart = lazy(() => import('./pages/Cart'));
const Checkout = lazy(() => import('./pages/Checkout'));
const Orders = lazy(() => import('./pages/Orders'));
const Upload = lazy(() => import('./pages/Upload'));

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Suspense fallback={<LoadingSpinner />}>
          <Routes>
            <Route path="/" element={<Products />} />
            <Route path="/designer/:productId" element={<Designer />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/upload" element={<Upload />} />
          </Routes>
        </Suspense>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
```

#### Step 2: Image Optimization (Day 2)

**Create:** `/Users/brandonshore/stolen/stolen1/frontend/src/components/OptimizedImage.tsx`

```typescript
import { useState, useEffect } from 'react';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  loading?: 'lazy' | 'eager';
}

export function OptimizedImage({
  src,
  alt,
  width,
  height,
  className = '',
  loading = 'lazy',
}: OptimizedImageProps) {
  const [imageSrc, setImageSrc] = useState<string>(src);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setImageSrc(src);
    setIsLoading(true);
  }, [src]);

  // Generate srcSet for responsive images
  const srcSet = generateSrcSet(src);

  return (
    <div className={`relative ${className}`}>
      {isLoading && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse rounded" />
      )}
      <img
        src={imageSrc}
        srcSet={srcSet}
        alt={alt}
        width={width}
        height={height}
        loading={loading}
        className={`${className} ${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
        onLoad={() => setIsLoading(false)}
      />
    </div>
  );
}

function generateSrcSet(src: string): string {
  // If using Cloudflare R2, can use Cloudflare Image Resizing
  // https://developers.cloudflare.com/images/image-resizing/

  // For now, just return the original src
  // TODO: Implement responsive image generation
  return src;
}
```

**Update all image tags:**
```typescript
// Before:
<img src={product.image} alt={product.name} />

// After:
<OptimizedImage src={product.image} alt={product.name} loading="lazy" />
```

#### Step 3: Bundle Analysis & Tree Shaking (Day 3)

**Add bundle analyzer:**
```bash
cd /Users/brandonshore/stolen/stolen1/frontend
npm install --save-dev rollup-plugin-visualizer
```

**Update:** `/Users/brandonshore/stolen/stolen1/frontend/vite.config.ts`

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  plugins: [
    react(),
    visualizer({
      open: true,
      gzipSize: true,
      brotliSize: true,
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'canvas-vendor': ['fabric', 'konva', 'react-konva'],
          'stripe-vendor': ['@stripe/stripe-js', '@stripe/react-stripe-js'],
        },
      },
    },
    // Minification
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.logs in production
        drop_debugger: true,
      },
    },
  },
});
```

**Build and analyze:**
```bash
npm run build
# Opens bundle analysis in browser
```

**Remove unused dependencies (if found in analysis):**
```bash
# Example: If you find unused packages
npm uninstall <unused-package>
```

#### Expected Results

**Bundle Size Reduction:**
```
Before optimization:
- Total bundle: ~2MB uncompressed (~605KB gzipped)
- Page load: 2.5MB (with assets)

After optimization:
- Total bundle: ~1.5MB uncompressed (~400KB gzipped)
- Page load: 1.8MB (with assets)
- Reduction: 28% smaller

At 1,000 users × 20 page views:
- Before: 50GB/month (needs Vercel Pro $20/month)
- After: 36GB/month (stays on Hobby FREE) ✅

SAVINGS: $20/month 🎉
```

**Performance Improvements:**
- First Contentful Paint: 1.8s → 1.2s (33% faster)
- Time to Interactive: 3.5s → 2.4s (31% faster)
- Lighthouse Score: 75 → 90 (20% improvement)

---

## SUMMARY: Total Savings

**Implementing all 3 Quick Wins:**

| Optimization | Time | Difficulty | Savings/Month |
|--------------|------|-----------|---------------|
| 1. Self-hosted rembg | 2-3 weeks | Medium | $1,976 |
| 2. Cloudflare R2 | 1 week | Medium | $24 |
| 3. Frontend optimization | 2-3 days | Easy | $20 |
| **TOTAL** | **4-5 weeks** | | **$2,020** |

**At 1,000 users:**
- Before: $4,462.81/month
- After: $2,426.84/month
- **Savings: $2,035.97/month (45.6%)** 🎉

**ROI Calculation:**
```
Implementation time: 4-5 weeks
Implementation cost: ~$5,000 (developer time)

Monthly savings: $2,020
Break-even: 2.5 months
First year savings: $24,240 - $5,000 = $19,240 net savings ✅
```

---

## NEXT STEPS

1. **Prioritize based on user count:**
   - < 20 users: Start with rembg (most critical)
   - 20-100 users: Add R2 migration
   - 100+ users: Add frontend optimization

2. **Create implementation tickets:**
   - Assign to developers
   - Set deadlines
   - Track progress

3. **Monitor results:**
   - Track cost savings
   - Measure performance improvements
   - Collect user feedback

4. **Document learnings:**
   - What worked well?
   - What could be improved?
   - Share with team

---

**Questions?** Review full audit: `/Users/brandonshore/stolen/stolen1/INFRASTRUCTURE_SCALING_AUDIT.md`
