import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { saveFile, validateFileType, validateFileSize } from '../services/uploadService';
import { ApiError } from '../middleware/errorHandler';

const storage = multer.memoryStorage();
const upload = multer({ storage });

export const uploadMiddleware = upload.single('file');

export const getSignedUrl = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { filename, filetype } = req.body;

    if (!filename || !filetype) {
      throw new ApiError(400, 'filename and filetype are required');
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
  } catch (error) {
    next(error);
  }
};

export const uploadFile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) {
      throw new ApiError(400, 'No file provided');
    }

    // Validate file type and size
    if (!validateFileType(req.file.mimetype)) {
      throw new ApiError(400, 'Invalid file type');
    }

    if (!validateFileSize(req.file.size)) {
      throw new ApiError(400, 'File too large');
    }

    const asset = await saveFile(req.file, 'customer');

    res.status(201).json({
      success: true,
      data: { asset }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Upload shirt photo and start extraction job
 * POST /api/uploads/shirt-photo
 */
export const uploadShirtPhoto = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) {
      throw new ApiError(400, 'No file provided');
    }

    // Validate file type (only JPG and PNG for shirt photos)
    const validTypes = ['image/jpeg', 'image/png'];
    if (!validTypes.includes(req.file.mimetype)) {
      throw new ApiError(400, 'Invalid file type. Please upload JPG or PNG');
    }

    // Validate file size (max 25MB)
    const maxSize = 25 * 1024 * 1024; // 25MB
    if (req.file.size > maxSize) {
      throw new ApiError(400, 'File too large. Maximum size is 25MB');
    }

    // Save the uploaded shirt photo
    const asset = await saveFile(req.file, 'shirt_upload');

    // TODO: Automatically start extraction job (disabled to avoid remove.bg API costs)
    // const jobId = await jobService.createJob({
    //   userId,
    //   uploadAssetId: asset.id,
    //   filePath,
    // });

    console.log(`✅ Shirt photo uploaded for asset ${asset.id}`);

    res.status(201).json({
      success: true,
      data: {
        asset,
        jobId: null,
        message: 'Shirt photo uploaded successfully.',
      }
    });
  } catch (error) {
    next(error);
  }
};
