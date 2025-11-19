"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const jobController_1 = require("../controllers/jobController");
const router = express_1.default.Router();
/**
 * Job Routes
 * /api/jobs/*
 */
// Start a new extraction job
router.post('/start', jobController_1.startJob);
// Get job status
router.get('/:id', jobController_1.getJobStatus);
// Get all jobs for current user
router.get('/', jobController_1.getUserJobs);
exports.default = router;
//# sourceMappingURL=jobRoutes.js.map