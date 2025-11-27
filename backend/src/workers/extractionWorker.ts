import { Worker, QueueEvents } from 'bullmq';
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
      maxRetriesPerRequest: null, // Required by BullMQ for blocking operations
      enableOfflineQueue: false, // Fail fast if Redis is down
    }),
    concurrency: 1, // REDUCED to 1 since Railway runs 2 instances (2 total workers)
    lockDuration: 60000, // Increased to 60s for AI processing
    stalledInterval: 60000, // Check stalled jobs every 60s (less frequent)
    maxStalledCount: 2, // Retry stalled jobs max 2 times before failing
  }
);

// Set up QueueEvents for event-driven architecture (Redis pub/sub)
const queueEvents = new QueueEvents('logo-extraction', {
  connection: new IORedis(redisUrl, {
    maxRetriesPerRequest: null,
  }),
});

// Listen for new jobs being added to the queue
queueEvents.on('added', ({ jobId }) => {
  console.log(`🔔 New job added to queue: ${jobId}`);
});

queueEvents.on('error', (err) => {
  console.error('❌ QueueEvents error:', err);
});

// Idle shutdown timer - exit after 5 minutes of no jobs
let idleTimer: NodeJS.Timeout | null = null;
const IDLE_TIMEOUT = 5 * 60 * 1000; // 5 minutes

const resetIdleTimer = async () => {
  if (idleTimer) clearTimeout(idleTimer);

  idleTimer = setTimeout(async () => {
    console.log('⏰ Worker idle for 5 minutes, checking for pending jobs...');
    try {
      const waitingCount = await worker.getNextJob(''); // Check if jobs exist
      if (!waitingCount) {
        console.log('✅ No pending jobs, shutting down worker to save Redis costs...');
        await queueEvents.close();
        await worker.close();
        process.exit(0);
      } else {
        console.log(`📋 ${waitingCount} jobs pending, staying alive...`);
        resetIdleTimer(); // Reset timer if jobs exist
      }
    } catch (error) {
      console.log('✅ No jobs found, shutting down worker...');
      await queueEvents.close();
      await worker.close();
      process.exit(0);
    }
  }, IDLE_TIMEOUT);
};

// Worker event handlers
worker.on('completed', (job) => {
  console.log(`✅ Worker completed job ${job.id}`);
  resetIdleTimer(); // Reset idle timer after each job
});

worker.on('failed', (job, err) => {
  console.error(`❌ Worker failed job ${job?.id}:`, err.message);
  resetIdleTimer(); // Reset idle timer even on failure
});

worker.on('error', (err) => {
  console.error('❌ Worker error:', err);
});

// Start idle timer
resetIdleTimer();
console.log('⏰ Worker will auto-shutdown after 5 minutes idle (saves Redis costs)');

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('⏸️  SIGTERM received, closing worker and events...');
  await queueEvents.close();
  await worker.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('⏸️  SIGINT received, closing worker and events...');
  await queueEvents.close();
  await worker.close();
  process.exit(0);
});

console.log('✅ Extraction worker is running with event-driven architecture (no polling when idle)');
