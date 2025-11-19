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
        maxRetriesPerRequest: null,
    }),
    concurrency: 2, // Process up to 2 jobs concurrently
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
//# sourceMappingURL=extractionWorker.js.map