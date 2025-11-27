"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateFileSize = exports.validateFileType = exports.deleteAsset = exports.getAssetById = exports.saveFile = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const crypto_1 = __importDefault(require("crypto"));
const sharp_1 = __importDefault(require("sharp"));
const database_1 = __importDefault(require("../config/database"));
const errorHandler_1 = require("../middleware/errorHandler");
const supabaseStorage_1 = require("./supabaseStorage");
const logger_1 = require("../utils/logger");
const UPLOAD_DIR = process.env.LOCAL_STORAGE_PATH || './uploads';
const USE_LOCAL_STORAGE = process.env.USE_LOCAL_STORAGE === 'true';
// Ensure upload directory exists (for local development)
if (!fs_1.default.existsSync(UPLOAD_DIR)) {
    fs_1.default.mkdirSync(UPLOAD_DIR, { recursive: true });
}
// Sanitize filename to prevent path traversal and injection attacks
const sanitizeFilename = (filename) => {
    return filename
        .replace(/\.\./g, '') // Remove parent directory references
        .replace(/[^a-zA-Z0-9._-]/g, '_') // Only allow safe characters
        .substring(0, 100); // Limit length
};
// Validate file extension against whitelist
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.svg', '.pdf'];
const validateExtension = (filename) => {
    const ext = path_1.default.extname(filename).toLowerCase();
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
const compressImage = async (buffer, mimetype) => {
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
        const compressed = await (0, sharp_1.default)(buffer)
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
        logger_1.logger.info('Image compressed successfully', {
            originalSize: `${(originalSize / 1024).toFixed(1)}KB`,
            compressedSize: `${(compressedSize / 1024).toFixed(1)}KB`,
            savings: `${savings}%`,
            duration: `${duration}ms`,
        });
        return compressed;
    }
    catch (error) {
        logger_1.logger.error('Image compression failed, using original', {}, error);
        // On compression failure, return original buffer
        return buffer;
    }
};
const saveFile = async (file, ownerType, ownerId) => {
    // Validate file extension before processing
    if (!validateExtension(file.originalname)) {
        throw new errorHandler_1.ApiError(400, 'Invalid file extension. Allowed types: .jpg, .jpeg, .png, .svg, .pdf');
    }
    // Compress image before upload (infrastructure optimization)
    const compressedBuffer = await compressImage(file.buffer, file.mimetype);
    const hash = crypto_1.default.createHash('md5').update(compressedBuffer).digest('hex');
    let fileUrl;
    // Use Supabase Storage in production, local filesystem in development
    if (!USE_LOCAL_STORAGE && (0, supabaseStorage_1.isSupabaseStorageAvailable)()) {
        // Upload compressed image to Supabase Storage (permanent cloud storage)
        // Create a modified file object with compressed buffer
        const compressedFile = {
            ...file,
            buffer: compressedBuffer,
            size: compressedBuffer.length,
        };
        fileUrl = await (0, supabaseStorage_1.uploadToSupabase)(compressedFile);
        console.log('✅ Uploaded compressed image to Supabase Storage:', fileUrl);
    }
    else {
        // Fallback to local filesystem (development only)
        // Sanitize extension to prevent attacks
        const ext = path_1.default.extname(file.originalname).toLowerCase();
        const filename = `${hash}${ext}`;
        const filepath = path_1.default.join(UPLOAD_DIR, filename);
        fs_1.default.writeFileSync(filepath, compressedBuffer);
        fileUrl = `/uploads/${filename}`;
        console.log('📁 Saved compressed image to local storage:', fileUrl);
    }
    // Create asset record in database
    const result = await database_1.default.query(`INSERT INTO assets (
      owner_type, owner_id, file_url, file_type, file_size, original_name, hash
    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *`, [
        ownerType,
        ownerId || null,
        fileUrl,
        file.mimetype,
        compressedBuffer.length, // Use compressed size
        file.originalname,
        hash
    ]);
    return result.rows[0];
};
exports.saveFile = saveFile;
const getAssetById = async (id) => {
    const result = await database_1.default.query('SELECT * FROM assets WHERE id = $1', [id]);
    if (result.rows.length === 0) {
        return null;
    }
    return result.rows[0];
};
exports.getAssetById = getAssetById;
const deleteAsset = async (id) => {
    const asset = await (0, exports.getAssetById)(id);
    if (!asset) {
        throw new errorHandler_1.ApiError(404, 'Asset not found');
    }
    // Delete file from storage
    if (asset.file_url.startsWith('http')) {
        // Supabase Storage URL - delete from cloud
        await (0, supabaseStorage_1.deleteFromSupabase)(asset.file_url);
    }
    else {
        // Local filesystem path - delete from disk
        const filepath = path_1.default.join(UPLOAD_DIR, path_1.default.basename(asset.file_url));
        if (fs_1.default.existsSync(filepath)) {
            fs_1.default.unlinkSync(filepath);
        }
    }
    // Delete database record
    await database_1.default.query('DELETE FROM assets WHERE id = $1', [id]);
};
exports.deleteAsset = deleteAsset;
const validateFileType = (mimetype) => {
    const allowedTypes = (process.env.ALLOWED_FILE_TYPES || '').split(',');
    return allowedTypes.includes(mimetype) || [
        'image/png',
        'image/jpeg',
        'image/svg+xml',
        'application/pdf'
    ].includes(mimetype);
};
exports.validateFileType = validateFileType;
const validateFileSize = (size) => {
    const maxSize = parseInt(process.env.MAX_FILE_SIZE_MB || '10') * 1024 * 1024;
    return size <= maxSize;
};
exports.validateFileSize = validateFileSize;
//# sourceMappingURL=uploadService.js.map