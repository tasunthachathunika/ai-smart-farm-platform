import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { validate } from '../validators';
import { registerSchema, loginSchema } from '../validators/auth.validator';
import { authenticate } from '../middleware/auth';
import { loginRateLimiter } from '../middleware/rateLimiter';

const router = Router();

// GET /api/auth/csrf-token (Issue / refresh anti-CSRF token)
router.get('/csrf-token', authController.getCsrfToken);

// POST /api/auth/register
router.post('/register', validate(registerSchema), authController.register);

// POST /api/auth/login (Strict login rate limiting)
router.post('/login', loginRateLimiter, validate(loginSchema), authController.login);

// POST /api/auth/refresh
router.post('/refresh', authController.refresh);

// POST /api/auth/logout
router.post('/logout', authController.logout);

// GET /api/auth/me (Protected route)
router.get('/me', authenticate, authController.getMe);

export const authRoutes = router;
