import { Queue } from 'bullmq';
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
declare class JobService {
    private queue;
    constructor();
    /**
     * Create a new extraction job
     */
    createJob(params: CreateJobParams): Promise<string>;
    /**
     * Get job status and results
     */
    getJobStatus(jobId: string): Promise<JobStatusResponse | null>;
    /**
     * Process an extraction job (called by worker)
     */
    processJob(jobData: any): Promise<void>;
    /**
     * Helper: Update job status
     */
    private updateJobStatus;
    /**
     * Helper: Create asset record and upload file to Supabase
     */
    private createAsset;
    /**
     * Get the queue instance (for worker)
     */
    getQueue(): Queue;
}
declare const _default: JobService;
export default _default;
//# sourceMappingURL=jobService.d.ts.map