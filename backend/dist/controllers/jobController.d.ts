import { Request, Response } from 'express';
/**
 * JobController - Handles extraction job API endpoints
 */
/**
 * Start a new extraction job
 * POST /api/jobs/start
 * Body: { uploadAssetId: string, filePath: string }
 */
export declare const startJob: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
/**
 * Get job status and results
 * GET /api/jobs/:id
 */
export declare const getJobStatus: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
/**
 * Get all jobs for current user
 * GET /api/jobs
 */
export declare const getUserJobs: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=jobController.d.ts.map