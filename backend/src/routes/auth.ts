import { Router } from 'express';
import { login, register, me, oauthSync } from '../controllers/authController';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { loginValidation, registerValidation, oauthSyncValidation } from '../validators/authValidation';

const router = Router();

router.post('/login', loginValidation, validate, login);
router.post('/register', registerValidation, validate, register);
router.post('/signup', registerValidation, validate, register); // Alias for register
router.post('/oauth/sync', oauthSyncValidation, validate, oauthSync);
router.get('/me', authenticate, me);

export default router;
