"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserJobs = exports.getJobStatus = exports.startJob = void 0;
const jobService_1 = __importDefault(require("../services/jobService"));
const database_1 = __importDefault(require("../config/database"));
/**
 * JobController - Handles extraction job API endpoints
 */
/**
 * Start a new extraction job
 * POST /api/jobs/start
 * Body: { uploadAssetId: string, filePath: string }
 */
const startJob = async (req, res) => {
    try {
        const { uploadAssetId, filePath } = req.body;
        if (!uploadAssetId || !filePath) {
            return res.status(400).json({
                error: 'Missing required fields: uploadAssetId and filePath',
            });
        }
        // Get user ID from session if authenticated
        const userId = req.user?.id;
        // Create the job
        const jobId = await jobService_1.default.createJob({
            userId,
            uploadAssetId,
            filePath,
        });
        return res.status(201).json({
            success: true,
            jobId,
            message: 'Extraction job started',
        });
    }
    catch (error) {
        console.error('Error starting job:', error);
        return res.status(500).json({
            error: 'Failed to start extraction job',
            details: error.message,
        });
    }
};
exports.startJob = startJob;
/**
 * Get job status and results
 * GET /api/jobs/:id
 */
const getJobStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const jobStatus = await jobService_1.default.getJobStatus(id);
        if (!jobStatus) {
            return res.status(404).json({
                error: 'Job not found',
            });
        }
        // If job is done, fetch asset URLs
        let assets = null;
        if (jobStatus.status === 'done' && jobStatus.resultData) {
            const assetIds = [
                jobStatus.resultData.originalAssetId,
                jobStatus.resultData.whiteBgAssetId,
                jobStatus.resultData.transparentAssetId,
            ].filter(Boolean);
            if (assetIds.length > 0) {
                const assetsResult = await database_1.default.query(`SELECT id, file_url, kind, width, height, dpi
           FROM assets
           WHERE id = ANY($1::uuid[])`, [assetIds]);
                assets = assetsResult.rows;
            }
        }
        return res.json({
            success: true,
            job: {
                ...jobStatus,
                assets,
            },
        });
    }
    catch (error) {
        console.error('Error fetching job status:', error);
        return res.status(500).json({
            error: 'Failed to fetch job status',
            details: error.message,
        });
    }
};
exports.getJobStatus = getJobStatus;
/**
 * Get all jobs for current user
 * GET /api/jobs
 */
const getUserJobs = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({
                error: 'Authentication required',
            });
        }
        const result = await database_1.default.query(`SELECT id, status, created_at, updated_at, completed_at
       FROM jobs
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 50`, [userId]);
        return res.json({
            success: true,
            jobs: result.rows,
        });
    }
    catch (error) {
        console.error('Error fetching user jobs:', error);
        return res.status(500).json({
            error: 'Failed to fetch jobs',
            details: error.message,
        });
    }
};
exports.getUserJobs = getUserJobs;
//# sourceMappingURL=jobController.js.map