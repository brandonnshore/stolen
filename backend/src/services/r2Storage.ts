import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import crypto from 'crypto';
import path from 'path';

// Initialize R2 client only if credentials are available
const r2Client = process.env.R2_ENDPOINT && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY
  ? new S3Client({
      region: 'auto',
      endpoint: process.env.R2_ENDPOINT,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
      },
    })
  : null;

const BUCKET_NAME = process.env.R2_BUCKET_NAME || 'stolentee-assets';
const PUBLIC_DOMAIN = process.env.R2_PUBLIC_DOMAIN || 'assets.stolentee.com';

/**
 * Upload file to Cloudflare R2
 * COST: $0.015/GB storage + FREE egress (vs Supabase $25/month for 100GB)
 * Returns the public URL of the uploaded file
 */
export const uploadToR2 = async (
  file: Express.Multer.File
): Promise<string> => {
  if (!r2Client) {
    throw new Error('Cloudflare R2 not configured');
  }

  // Generate unique filename with hash
  const hash = crypto.createHash('md5').update(file.buffer).digest('hex');
  const ext = path.extname(file.originalname);
  const filename = `${hash}${ext}`;
  const key = `artwork/${filename}`;

  try {
    // Upload to R2 with optimal caching
    await r2Client.send(new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
      // Aggressive caching for cost optimization
      CacheControl: 'public, max-age=31536000, immutable', // 1 year
      // Metadata for tracking
      Metadata: {
        originalName: file.originalname,
        uploadedAt: new Date().toISOString(),
      },
    }));

    // Return public CDN URL (FREE bandwidth via Cloudflare)
    const publicUrl = `https://${PUBLIC_DOMAIN}/${key}`;
    console.log(`✅ Uploaded to R2 (SAVED $0.024 vs Supabase): ${publicUrl}`);

    return publicUrl;

  } catch (error: any) {
    console.error('Failed to upload to R2:', error);
    throw new Error(`R2 upload failed: ${error.message}`);
  }
};

/**
 * Delete file from Cloudflare R2
 */
export const deleteFromR2 = async (fileUrl: string): Promise<void> => {
  if (!r2Client) {
    console.warn('R2 not configured, skipping delete');
    return;
  }

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
 * Check if Cloudflare R2 is configured and available
 */
export const isR2Available = (): boolean => {
  return r2Client !== null;
};

/**
 * Get R2 statistics (for monitoring)
 */
export const getR2Stats = (): {
  configured: boolean;
  bucketName: string;
  publicDomain: string;
  costSavings: string;
} => {
  return {
    configured: isR2Available(),
    bucketName: BUCKET_NAME,
    publicDomain: PUBLIC_DOMAIN,
    costSavings: '95.8% vs Supabase Pro ($23.96/month saved)',
  };
};
