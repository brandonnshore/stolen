import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import pool from '../config/database';
import geminiService from './geminiService';
import backgroundRemovalService from './backgroundRemovalService';
import path from 'path';
import fs from 'fs';
import sharp from 'sharp';

interface CreateJobParams {
  userId?: string;
  uploadAssetId: string;
  filePath: string;
}

interface JobStatusResponse {
  id: string;
  status: 'queued' | 'running' | 'done' | 'error';
  logs?: string;
  errorMessage?: string;
  resultData?: {
    originalAssetId?: string;
    whiteBgAssetId?: string;
    maskAssetId?: string;
    transparentAssetId?: string;
  };
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

/**
 * JobService - Manages logo extraction jobs using BullMQ
 */
class JobService {
  private queue: Queue;

  constructor() {
    // Initialize BullMQ queue with Redis connection from environment
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

    this.queue = new Queue('logo-extraction', {
      connection: new IORedis(redisUrl, {
        maxRetriesPerRequest: null,
      }),
    });

    console.log('✅ Job queue initialized with Redis:', redisUrl.replace(/:[^:]*@/, ':***@'));
  }

  /**
   * Create a new extraction job
   */
  async createJob(params: CreateJobParams): Promise<string> {
    const { userId, uploadAssetId, filePath } = params;

    try {
      // Create job record in database
      const result = await pool.query(
        `INSERT INTO jobs (user_id, upload_asset_id, status, logs)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        [userId || null, uploadAssetId, 'queued', 'Job created']
      );

      const jobId = result.rows[0].id;

      // Add job to BullMQ queue
      await this.queue.add(
        'extract-logo',
        {
          jobId,
          uploadAssetId,
          filePath,
          userId,
        },
        {
          attempts: 3, // Retry up to 3 times
          backoff: {
            type: 'exponential',
            delay: 5000, // Start with 5 second delay
          },
        }
      );

      console.log(`✅ Job created: ${jobId}`);
      return jobId;
    } catch (error: any) {
      console.error('❌ Failed to create job:', error);
      throw new Error(`Failed to create extraction job: ${error.message}`);
    }
  }

  /**
   * Get job status and results
   */
  async getJobStatus(jobId: string): Promise<JobStatusResponse | null> {
    try {
      const result = await pool.query(
        `SELECT id, status, logs, error_message, result_data, created_at, updated_at, completed_at
         FROM jobs
         WHERE id = $1`,
        [jobId]
      );

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
    } catch (error) {
      console.error('❌ Failed to get job status:', error);
      return null;
    }
  }

  /**
   * Process an extraction job (called by worker)
   */
  async processJob(jobData: any): Promise<void> {
    const { jobId, filePath, uploadAssetId, userId } = jobData;

    try {
      // Update job status to 'running'
      await this.updateJobStatus(jobId, 'running', 'Starting extraction process');

      // Step 1: Gemini extraction (recreate logo on white background)
      await this.updateJobStatus(jobId, 'running', 'Step 1: Extracting logo with Gemini');
      const geminiResult = await geminiService.extractLogo(filePath);

      if (!geminiResult.success || !geminiResult.imageBuffer) {
        throw new Error(geminiResult.error || 'Gemini extraction failed');
      }

      // Save white background image to temporary location
      // Generate a temp filename based on upload asset ID
      const uploadsDir = process.env.LOCAL_STORAGE_PATH || path.join(process.cwd(), 'uploads');

      // Ensure uploads directory exists
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      const whiteBgFilename = `${uploadAssetId}_white_bg.png`;
      const whiteBgPath = path.join(uploadsDir, whiteBgFilename);
      fs.writeFileSync(whiteBgPath, geminiResult.imageBuffer);

      // Create asset record for white background image
      const whiteBgAsset = await this.createAsset({
        jobId,
        filePath: whiteBgPath,
        kind: 'white_bg',
        userId,
      });

      // Step 2: Background removal with Remove.bg
      await this.updateJobStatus(jobId, 'running', 'Step 2: Removing background with Remove.bg');
      const removalResult = await backgroundRemovalService.removeBackground(whiteBgPath);

      if (!removalResult.success || !removalResult.transparentBuffer) {
        throw new Error(removalResult.error || 'Background removal failed');
      }

      // Step 3: Process with Sharp to ensure 300 DPI and maximum quality
      await this.updateJobStatus(jobId, 'running', 'Step 3: Setting 300 DPI for print quality');

      // Use the same uploadsDir (already created above)
      const transparentFilename = `${uploadAssetId}_transparent.png`;
      const transparentPath = path.join(uploadsDir, transparentFilename);

      // Process with Sharp: ensure 300 DPI and high quality
      await sharp(removalResult.transparentBuffer)
        .png({
          quality: 100,
          compressionLevel: 0, // No compression for maximum quality
          force: true
        })
        .withMetadata({
          density: 300 // Set to 300 DPI for print quality
        })
        .toFile(transparentPath);

      console.log('✅ Image saved at 300 DPI for print quality');

      // Create asset record for transparent image
      const transparentAsset = await this.createAsset({
        jobId,
        filePath: transparentPath,
        kind: 'transparent',
        userId,
      });

      // Step 4: Verify image quality and dimensions
      await this.updateJobStatus(jobId, 'running', 'Step 4: Verifying print quality');
      const metadata = await sharp(transparentPath).metadata();

      // Mark job as done with result data
      await pool.query(
        `UPDATE jobs
         SET status = $1, logs = $2, result_data = $3, completed_at = NOW()
         WHERE id = $4`,
        [
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
        ]
      );

      console.log(`✅ Job completed: ${jobId}`);
    } catch (error: any) {
      console.error(`❌ Job failed: ${jobId}`, error);

      // Mark job as error
      await pool.query(
        `UPDATE jobs
         SET status = $1, error_message = $2, completed_at = NOW()
         WHERE id = $3`,
        ['error', error.message, jobId]
      );
    }
  }

  /**
   * Helper: Update job status
   */
  private async updateJobStatus(jobId: string, status: string, logs: string): Promise<void> {
    await pool.query(
      `UPDATE jobs SET status = $1, logs = $2 WHERE id = $3`,
      [status, logs, jobId]
    );
  }

  /**
   * Helper: Create asset record and upload file to Supabase
   */
  private async createAsset(params: {
    jobId: string;
    filePath: string;
    kind: string;
    userId?: string;
  }): Promise<any> {
    const { jobId, filePath, kind, userId } = params;
    const fileName = path.basename(filePath);
    const fileStats = fs.statSync(filePath);
    const fileBuffer = fs.readFileSync(filePath);

    // Upload to Supabase Storage
    const { uploadToSupabase } = require('./supabaseStorage');
    const mockFile = {
      buffer: fileBuffer,
      originalname: fileName,
      mimetype: 'image/png',
    };
    const supabaseUrl = await uploadToSupabase(mockFile);

    const result = await pool.query(
      `INSERT INTO assets (
        owner_type, owner_id, file_url, file_type, file_size,
        original_name, kind, job_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id`,
      [
        'job',
        userId || null,
        supabaseUrl, // Use Supabase URL instead of local path
        path.extname(filePath).substring(1),
        fileStats.size,
        fileName,
        kind,
        jobId,
      ]
    );

    return { id: result.rows[0].id, filePath };
  }

  /**
   * Get the queue instance (for worker)
   */
  getQueue(): Queue {
    return this.queue;
  }
}

export default new JobService();
