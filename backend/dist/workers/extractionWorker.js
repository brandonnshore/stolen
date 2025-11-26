"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const bullmq_1 = require("bullmq");
const ioredis_1 = __importDefault(require("ioredis"));
const jobService_1 = __importDefault(require("../services/jobService"));
const geminiService_1 = __importDefault(require("../services/geminiService"));
const backgroundRemovalService_1 = __importDefault(require("../services/backgroundRemovalService"));
/**
 * Extraction Worker - Processes logo extraction jobs from the queue
 * Run this as a separate process: `node -r ts-node/register src/workers/extractionWorker.ts`
 */
console.log('🚀 Starting extraction worker...');
// Initialize services
(async () => {
    await geminiService_1.default.initialize();
    await backgroundRemovalService_1.default.initialize();
    console.log('✅ Services initialized');
})();
// Create worker to process jobs
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const worker = new bullmq_1.Worker('logo-extraction', async (job) => {
    console.log(`📋 Processing job ${job.id}:`, job.data.jobId);
    try {
        await jobService_1.default.processJob(job.data);
        console.log(`✅ Job ${job.id} completed successfully`);
    }
    catch (error) {
        console.error(`❌ Job ${job.id} failed:`, error.message);
        throw error; // Re-throw so BullMQ can handle retries
    }
}, {
    connection: new ioredis_1.default(redisUrl, {
        maxRetriesPerRequest: null, // Required by BullMQ for blocking operations
    }),
    concurrency: 2, // Process up to 2 jobs concurrently
    lockDuration: 30000, // Lock duration for job processing
    stalledInterval: 30000, // Check for stalled jobs every 30 seconds
    maxStalledCount: 2, // Retry stalled jobs max 2 times before failing
});
// Set up QueueEvents for event-driven architecture (Redis pub/sub)
const queueEvents = new bullmq_1.QueueEvents('logo-extraction', {
    connection: new ioredis_1.default(redisUrl, {
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
//# sourceMappingURL=extractionWorker.js.map