import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import sharp from 'sharp';
import pool from '../config/database';
import { Asset } from '../models/types';
import { ApiError } from '../middleware/errorHandler';
import { uploadToSupabase, deleteFromSupabase, isSupabaseStorageAvailable } from './supabaseStorage';
import { logger } from '../utils/logger';

const UPLOAD_DIR = process.env.LOCAL_STORAGE_PATH || './uploads';
const USE_LOCAL_STORAGE = process.env.USE_LOCAL_STORAGE === 'true';

// Ensure upload directory exists (for local development)
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Sanitize filename to prevent path traversal and injection attacks
const sanitizeFilename = (filename: string): string => {
  return filename
    .replace(/\.\./g, '')  // Remove parent directory references
    .replace(/[^a-zA-Z0-9._-]/g, '_')  // Only allow safe characters
    .substring(0, 100);  // Limit length
};

// Validate file extension against whitelist
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.svg', '.pdf'];
const validateExtension = (filename: string): boolean => {
  const ext = path.extname(filename).toLowerCase();
  return ALLOWED_EXTENSIONS.includes(ext);
};

/**
 * Compress and optimize image before upload
 * Reduces storage costs and bandwidth usage
 *
 * @param buffer - Original image buffer
 * @param mimetype - Image MIME type
 * @returns Compressed image buffer
 */
const compressImage = async (buffer: Buffer, mimetype: string): Promise<Buffer> => {
  const startTime = Date.now();
  const originalSize = buffer.length;

  try {
    // Skip compression for SVG and PDF files (not raster images)
    if (mimetype === 'image/svg+xml' || mimetype === 'application/pdf') {
      return buffer;
    }

    // Compress image using sharp
    // - Resize to max 2000x2000 (preserves aspect ratio)
    // - Convert to JPEG with 85% quality for optimal balance
    // - Strip metadata to reduce size
    const compressed = await sharp(buffer)
      .resize(2000, 2000, {
        fit: 'inside',
        withoutEnlargement: true, // Don't upscale smaller images
      })
      .jpeg({
        quality: 85, // Good balance between quality and size
        progressive: true, // Enable progressive loading
        mozjpeg: true, // Use mozjpeg for better compression
      })
      .toBuffer();

    const compressedSize = compressed.length;
    const savings = ((originalSize - compressedSize) / originalSize * 100).toFixed(1);
    const duration = Date.now() - startTime;

    logger.info('Image compressed successfully', {
      originalSize: `${(originalSize / 1024).toFixed(1)}KB`,
      compressedSize: `${(compressedSize / 1024).toFixed(1)}KB`,
      savings: `${savings}%`,
      duration: `${duration}ms`,
    });

    return compressed;
  } catch (error) {
    logger.error('Image compression failed, using original', {}, error as Error);
    // On compression failure, return original buffer
    return buffer;
  }
};

export const saveFile = async (
  file: Express.Multer.File,
  ownerType: string,
  ownerId?: string
): Promise<Asset> => {
  // Validate file extension before processing
  if (!validateExtension(file.originalname)) {
    throw new ApiError(400, 'Invalid file extension. Allowed types: .jpg, .jpeg, .png, .svg, .pdf');
  }

  // Compress image before upload (infrastructure optimization)
  const compressedBuffer = await compressImage(file.buffer, file.mimetype);
  const hash = crypto.createHash('md5').update(compressedBuffer).digest('hex');
  let fileUrl: string;

  // Use Supabase Storage in production, local filesystem in development
  if (!USE_LOCAL_STORAGE && isSupabaseStorageAvailable()) {
    // Upload compressed image to Supabase Storage (permanent cloud storage)
    // Create a modified file object with compressed buffer
    const compressedFile = {
      ...file,
      buffer: compressedBuffer,
      size: compressedBuffer.length,
    };
    fileUrl = await uploadToSupabase(compressedFile as Express.Multer.File);
    console.log('✅ Uploaded compressed image to Supabase Storage:', fileUrl);
  } else {
    // Fallback to local filesystem (development only)
    // Sanitize extension to prevent attacks
    const ext = path.extname(file.originalname).toLowerCase();
    const filename = `${hash}${ext}`;
    const filepath = path.join(UPLOAD_DIR, filename);
    fs.writeFileSync(filepath, compressedBuffer);
    fileUrl = `/uploads/${filename}`;
    console.log('📁 Saved compressed image to local storage:', fileUrl);
  }

  // Create asset record in database
  const result = await pool.query(
    `INSERT INTO assets (
      owner_type, owner_id, file_url, file_type, file_size, original_name, hash
    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *`,
    [
      ownerType,
      ownerId || null,
      fileUrl,
      file.mimetype,
      compressedBuffer.length, // Use compressed size
      file.originalname,
      hash
    ]
  );

  return result.rows[0];
};

export const getAssetById = async (id: string): Promise<Asset | null> => {
  const result = await pool.query(
    'SELECT * FROM assets WHERE id = $1',
    [id]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0];
};

export const deleteAsset = async (id: string): Promise<void> => {
  const asset = await getAssetById(id);

  if (!asset) {
    throw new ApiError(404, 'Asset not found');
  }

  // Delete file from storage
  if (asset.file_url.startsWith('http')) {
    // Supabase Storage URL - delete from cloud
    await deleteFromSupabase(asset.file_url);
  } else {
    // Local filesystem path - delete from disk
    const filepath = path.join(UPLOAD_DIR, path.basename(asset.file_url));
    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
    }
  }

  // Delete database record
  await pool.query('DELETE FROM assets WHERE id = $1', [id]);
};

export const validateFileType = (mimetype: string): boolean => {
  const allowedTypes = (process.env.ALLOWED_FILE_TYPES || '').split(',');
  return allowedTypes.includes(mimetype) || [
    'image/png',
    'image/jpeg',
    'image/svg+xml',
    'application/pdf'
  ].includes(mimetype);
};

export const validateFileSize = (size: number): boolean => {
  const maxSize = parseInt(process.env.MAX_FILE_SIZE_MB || '10') * 1024 * 1024;
  return size <= maxSize;
};
