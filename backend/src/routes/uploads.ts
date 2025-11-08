import { Router } from 'express';
import { getSignedUrl, uploadFile, uploadMiddleware, uploadShirtPhoto } from '../controllers/uploadController';

const router = Router();

router.post('/signed-url', getSignedUrl);
router.post('/file', uploadMiddleware, uploadFile);
router.post('/shirt-photo', uploadMiddleware, uploadShirtPhoto);

export default router;
