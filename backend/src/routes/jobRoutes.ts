import express from 'express';
import { startJob, getJobStatus, getUserJobs } from '../controllers/jobController';

const router = express.Router();

/**
 * Job Routes
 * /api/jobs/*
 */

// Start a new extraction job
router.post('/start', startJob);

// Get job status
router.get('/:id', getJobStatus);

// Get all jobs for current user
router.get('/', getUserJobs);

export default router;
