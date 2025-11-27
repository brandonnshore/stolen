"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const bullmq_1 = require("bullmq");
const ioredis_1 = __importDefault(require("ioredis"));
const database_1 = __importDefault(require("../config/database"));
const geminiService_1 = __importDefault(require("./geminiService"));
const backgroundRemovalService_1 = __importDefault(require("./backgroundRemovalService"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const sharp_1 = __importDefault(require("sharp"));
const logger_1 = require("../utils/logger");
/**
 * JobService - Manages logo extraction jobs using BullMQ
 */
class JobService {
    constructor() {
        // Initialize BullMQ queue with Redis connection from environment
        const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
        this.queue = new bullmq_1.Queue('logo-extraction', {
            connection: new ioredis_1.default(redisUrl, {
                maxRetriesPerRequest: null,
            }),
        });
        logger_1.logger.info('Job queue initialized with Redis', { redisUrl: redisUrl.replace(/:[^:]*@/, ':***@') });
    }
    /**
     * Create a new extraction job
     */
    async createJob(params) {
        const { userId, uploadAssetId, filePath } = params;
        try {
            // Create job record in database
            const result = await database_1.default.query(`INSERT INTO jobs (user_id, upload_asset_id, status, logs)
         VALUES ($1, $2, $3, $4)
         RETURNING id`, [userId || null, uploadAssetId, 'queued', 'Job created']);
            const jobId = result.rows[0].id;
            // Add job to BullMQ queue
            await this.queue.add('extract-logo', {
                jobId,
                uploadAssetId,
                filePath,
                userId,
            }, {
                attempts: 3, // Retry up to 3 times
                backoff: {
                    type: 'exponential',
                    delay: 5000, // Start with 5 second delay
                },
                removeOnComplete: {
                    age: 86400, // Keep completed jobs for 24 hours (1 day)
                    count: 100 // Keep max 100 most recent completed jobs
                },
                removeOnFail: {
                    age: 604800, // Keep failed jobs for 7 days (for debugging)
                    count: 500 // Keep max 500 most recent failed jobs
                }
            });
            logger_1.logger.info('Job created', { jobId });
            return jobId;
        }
        catch (error) {
            logger_1.logger.error('Failed to create job', {}, error);
            throw new Error(`Failed to create extraction job: ${error.message}`);
        }
    }
    /**
     * Get job status and results
     */
    async getJobStatus(jobId) {
        try {
            const result = await database_1.default.query(`SELECT id, status, logs, error_message, result_data, created_at, updated_at, completed_at
         FROM jobs
         WHERE id = $1`, [jobId]);
            if (result.rows.length === 0) {
                return null;
            }
            const row = result.rows[0];
            return {
                id: row.id,
                status: row.status,
                logs: row.logs,
                errorMessage: row.error_message,
                resultData: row.result_data,
                createdAt: row.created_at,
                updatedAt: row.updated_at,
                completedAt: row.completed_at,
            };
        }
        catch (error) {
            logger_1.logger.error('Failed to get job status', { jobId }, error);
            return null;
        }
    }
    /**
     * Process an extraction job (called by worker)
     */
    async processJob(jobData) {
        const { jobId, filePath, uploadAssetId, userId } = jobData;
        try {
            // Update job status to 'running'
            await this.updateJobStatus(jobId, 'running', 'Starting extraction process');
            // Step 1: Gemini extraction (recreate logo on white background)
            await this.updateJobStatus(jobId, 'running', 'Step 1: Extracting logo with Gemini');
            const geminiResult = await geminiService_1.default.extractLogo(filePath);
            if (!geminiResult.success || !geminiResult.imageBuffer) {
                throw new Error(geminiResult.error || 'Gemini extraction failed');
            }
            // Save white background image to temporary location
            // Generate a temp filename based on upload asset ID
            const uploadsDir = process.env.LOCAL_STORAGE_PATH || path_1.default.join(process.cwd(), 'uploads');
            // Ensure uploads directory exists
            if (!fs_1.default.existsSync(uploadsDir)) {
                fs_1.default.mkdirSync(uploadsDir, { recursive: true });
            }
            const whiteBgFilename = `${uploadAssetId}_white_bg.png`;
            const whiteBgPath = path_1.default.join(uploadsDir, whiteBgFilename);
            fs_1.default.writeFileSync(whiteBgPath, geminiResult.imageBuffer);
            // Create asset record for white background image
            const whiteBgAsset = await this.createAsset({
                jobId,
                filePath: whiteBgPath,
                kind: 'white_bg',
                userId,
            });
            // Step 2: Background removal with Remove.bg
            await this.updateJobStatus(jobId, 'running', 'Step 2: Removing background with Remove.bg');
            const removalResult = await backgroundRemovalService_1.default.removeBackground(whiteBgPath);
            if (!removalResult.success || !removalResult.transparentBuffer) {
                throw new Error(removalResult.error || 'Background removal failed');
            }
            // Step 3: Process with Sharp to ensure 300 DPI and maximum quality
            await this.updateJobStatus(jobId, 'running', 'Step 3: Setting 300 DPI for print quality');
            // Use the same uploadsDir (already created above)
            const transparentFilename = `${uploadAssetId}_transparent.png`;
            const transparentPath = path_1.default.join(uploadsDir, transparentFilename);
            // Process with Sharp: ensure 300 DPI and high quality
            await (0, sharp_1.default)(removalResult.transparentBuffer)
                .png({
                quality: 100,
                compressionLevel: 0, // No compression for maximum quality
                force: true
            })
                .withMetadata({
                density: 300 // Set to 300 DPI for print quality
            })
                .toFile(transparentPath);
            logger_1.logger.info('Image saved at 300 DPI for print quality', { jobId });
            // Create asset record for transparent image
            const transparentAsset = await this.createAsset({
                jobId,
                filePath: transparentPath,
                kind: 'transparent',
                userId,
            });
            // Step 4: Verify image quality and dimensions
            await this.updateJobStatus(jobId, 'running', 'Step 4: Verifying print quality');
            const metadata = await (0, sharp_1.default)(transparentPath).metadata();
            // Mark job as done with result data
            await database_1.default.query(`UPDATE jobs
         SET status = $1, logs = $2, result_data = $3, completed_at = NOW()
         WHERE id = $4`, [
                'done',
                'Extraction completed successfully',
                JSON.stringify({
                    originalAssetId: uploadAssetId,
                    whiteBgAssetId: whiteBgAsset.id,
                    transparentAssetId: transparentAsset.id,
                    metadata: {
                        width: metadata.width,
                        height: metadata.height,
                        format: metadata.format,
                        dpi: metadata.density || 72,
                    },
                }),
                jobId,
            ]);
            logger_1.logger.info('Job completed', { jobId });
        }
        catch (error) {
            logger_1.logger.error('Job failed', { jobId }, error);
            // Don't retry if it's a known unrecoverable error
            if (error.message?.startsWith('CREDITS_EXHAUSTED') ||
                error.message?.startsWith('AUTH_FAILED')) {
                // Mark job as failed without throwing (prevents BullMQ retry)
                await database_1.default.query(`UPDATE jobs
           SET status = $1, error_message = $2, completed_at = NOW()
           WHERE id = $3`, ['error', error.message, jobId]);
                return; // Exit without throwing (prevents BullMQ retry)
            }
            // Mark job as error and throw to trigger BullMQ retry for other errors
            await database_1.default.query(`UPDATE jobs
         SET status = $1, error_message = $2, completed_at = NOW()
         WHERE id = $3`, ['error', error.message, jobId]);
            throw error; // Throw to trigger BullMQ retry for recoverable errors
        }
    }
    /**
     * Helper: Update job status
     */
    async updateJobStatus(jobId, status, logs) {
        await database_1.default.query(`UPDATE jobs SET status = $1, logs = $2 WHERE id = $3`, [status, logs, jobId]);
    }
    /**
     * Helper: Create asset record and upload file to Supabase
     */
    async createAsset(params) {
        const { jobId, filePath, kind, userId } = params;
        const fileName = path_1.default.basename(filePath);
        const fileStats = fs_1.default.statSync(filePath);
        const fileBuffer = fs_1.default.readFileSync(filePath);
        // Upload to Supabase Storage
        const { uploadToSupabase } = require('./supabaseStorage');
        const mockFile = {
            buffer: fileBuffer,
            originalname: fileName,
            mimetype: 'image/png',
        };
        const supabaseUrl = await uploadToSupabase(mockFile);
        const result = await database_1.default.query(`INSERT INTO assets (
        owner_type, owner_id, file_url, file_type, file_size,
        original_name, kind, job_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id`, [
            'job',
            userId || null,
            supabaseUrl, // Use Supabase URL instead of local path
            path_1.default.extname(filePath).substring(1),
            fileStats.size,
            fileName,
            kind,
            jobId,
        ]);
        return { id: result.rows[0].id, filePath };
    }
    /**
     * Get the queue instance (for worker)
     */
    getQueue() {
        return this.queue;
    }
}
exports.default = new JobService();
//# sourceMappingURL=jobService.js.map