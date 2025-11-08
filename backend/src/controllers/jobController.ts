import { Request, Response } from 'express';
import jobService from '../services/jobService';
import pool from '../config/database';

/**
 * JobController - Handles extraction job API endpoints
 */

/**
 * Start a new extraction job
 * POST /api/jobs/start
 * Body: { uploadAssetId: string, filePath: string }
 */
export const startJob = async (req: Request, res: Response) => {
  try {
    const { uploadAssetId, filePath } = req.body;

    if (!uploadAssetId || !filePath) {
      return res.status(400).json({
        error: 'Missing required fields: uploadAssetId and filePath',
      });
    }

    // Get user ID from session if authenticated
    const userId = (req as any).user?.id;

    // Create the job
    const jobId = await jobService.createJob({
      userId,
      uploadAssetId,
      filePath,
    });

    return res.status(201).json({
      success: true,
      jobId,
      message: 'Extraction job started',
    });
  } catch (error: any) {
    console.error('Error starting job:', error);
    return res.status(500).json({
      error: 'Failed to start extraction job',
      details: error.message,
    });
  }
};

/**
 * Get job status and results
 * GET /api/jobs/:id
 */
export const getJobStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const jobStatus = await jobService.getJobStatus(id);

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
        const assetsResult = await pool.query(
          `SELECT id, file_url, kind, width, height, dpi
           FROM assets
           WHERE id = ANY($1::uuid[])`,
          [assetIds]
        );

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
  } catch (error: any) {
    console.error('Error fetching job status:', error);
    return res.status(500).json({
      error: 'Failed to fetch job status',
      details: error.message,
    });
  }
};

/**
 * Get all jobs for current user
 * GET /api/jobs
 */
export const getUserJobs = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({
        error: 'Authentication required',
      });
    }

    const result = await pool.query(
      `SELECT id, status, created_at, updated_at, completed_at
       FROM jobs
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 50`,
      [userId]
    );

    return res.json({
      success: true,
      jobs: result.rows,
    });
  } catch (error: any) {
    console.error('Error fetching user jobs:', error);
    return res.status(500).json({
      error: 'Failed to fetch jobs',
      details: error.message,
    });
  }
};
