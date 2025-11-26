import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import jobService from '../services/jobService';
import geminiService from '../services/geminiService';
import backgroundRemovalService from '../services/backgroundRemovalService';

/**
 * Extraction Worker - Processes logo extraction jobs from the queue
 * Run this as a separate process: `node -r ts-node/register src/workers/extractionWorker.ts`
 */

console.log('🚀 Starting extraction worker...');

// Initialize services
(async () => {
  await geminiService.initialize();
  await backgroundRemovalService.initialize();
  console.log('✅ Services initialized');
})();

// Create worker to process jobs
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

const worker = new Worker(
  'logo-extraction',
  async (job) => {
    console.log(`📋 Processing job ${job.id}:`, job.data.jobId);

    try {
      await jobService.processJob(job.data);
      console.log(`✅ Job ${job.id} completed successfully`);
    } catch (error: any) {
      console.error(`❌ Job ${job.id} failed:`, error.message);
      throw error; // Re-throw so BullMQ can handle retries
    }
  },
  {
    connection: new IORedis(redisUrl, {
      maxRetriesPerRequest: 3, // Limit Redis connection retries (safer than null)
    }),
    concurrency: 2, // Process up to 2 jobs concurrently
    maxStalledCount: 2, // Retry stalled jobs max 2 times before failing
    stalledInterval: 30000, // Check for stalled jobs every 30 seconds
    drainDelay: 30, // Wait 30 seconds between polls when queue is empty (reduces Redis polling from 5s to 30s)
  }
);

// Worker event handlers
worker.on('completed', (job) => {
  console.log(`✅ Worker completed job ${job.id}`);
});

worker.on('failed', (job, err) => {
  console.error(`❌ Worker failed job ${job?.id}:`, err.message);
});

worker.on('error', (err) => {
  console.error('❌ Worker error:', err);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('⏸️  SIGTERM received, closing worker...');
  await worker.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('⏸️  SIGINT received, closing worker...');
  await worker.close();
  process.exit(0);
});

console.log('✅ Extraction worker is running and waiting for jobs');
