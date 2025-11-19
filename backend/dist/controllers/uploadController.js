"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadShirtPhoto = exports.uploadFile = exports.getSignedUrl = exports.uploadMiddleware = void 0;
const multer_1 = __importDefault(require("multer"));
const uploadService_1 = require("../services/uploadService");
const errorHandler_1 = require("../middleware/errorHandler");
const jobService_1 = __importDefault(require("../services/jobService"));
const storage = multer_1.default.memoryStorage();
const upload = (0, multer_1.default)({ storage });
exports.uploadMiddleware = upload.single('file');
const getSignedUrl = async (req, res, next) => {
    try {
        const { filename, filetype } = req.body;
        if (!filename || !filetype) {
            throw new errorHandler_1.ApiError(400, 'filename and filetype are required');
        }
        // For local storage, we'll just return a placeholder
        // In production with S3, this would generate a presigned URL
        res.status(200).json({
            success: true,
            data: {
                upload_url: `/api/uploads/file`,
                message: 'Use POST /api/uploads/file with multipart form data'
            }
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getSignedUrl = getSignedUrl;
const uploadFile = async (req, res, next) => {
    try {
        if (!req.file) {
            throw new errorHandler_1.ApiError(400, 'No file provided');
        }
        // Validate file type and size
        if (!(0, uploadService_1.validateFileType)(req.file.mimetype)) {
            throw new errorHandler_1.ApiError(400, 'Invalid file type');
        }
        if (!(0, uploadService_1.validateFileSize)(req.file.size)) {
            throw new errorHandler_1.ApiError(400, 'File too large');
        }
        const asset = await (0, uploadService_1.saveFile)(req.file, 'customer');
        res.status(201).json({
            success: true,
            data: { asset }
        });
    }
    catch (error) {
        next(error);
    }
};
exports.uploadFile = uploadFile;
/**
 * Upload shirt photo and start extraction job
 * POST /api/uploads/shirt-photo
 */
const uploadShirtPhoto = async (req, res, next) => {
    try {
        if (!req.file) {
            throw new errorHandler_1.ApiError(400, 'No file provided');
        }
        // Validate file type (only JPG and PNG for shirt photos)
        const validTypes = ['image/jpeg', 'image/png'];
        if (!validTypes.includes(req.file.mimetype)) {
            throw new errorHandler_1.ApiError(400, 'Invalid file type. Please upload JPG or PNG');
        }
        // Validate file size (max 25MB)
        const maxSize = 25 * 1024 * 1024; // 25MB
        if (req.file.size > maxSize) {
            throw new errorHandler_1.ApiError(400, 'File too large. Maximum size is 25MB');
        }
        // Save the uploaded shirt photo
        const asset = await (0, uploadService_1.saveFile)(req.file, 'shirt_upload');
        // Get user ID if authenticated
        const userId = req.user?.id;
        // Automatically start extraction job
        // Note: Pass asset.file_url directly - job service will handle Supabase URLs
        const jobId = await jobService_1.default.createJob({
            userId,
            uploadAssetId: asset.id,
            filePath: asset.file_url, // Can be Supabase URL or local path
        });
        console.log(`✅ Shirt photo uploaded for asset ${asset.id}, job ${jobId} created`);
        res.status(201).json({
            success: true,
            data: {
                asset,
                jobId,
                message: 'Shirt photo uploaded. Extraction started.',
            }
        });
    }
    catch (error) {
        next(error);
    }
};
exports.uploadShirtPhoto = uploadShirtPhoto;
//# sourceMappingURL=uploadController.js.map