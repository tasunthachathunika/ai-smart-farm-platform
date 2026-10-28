import { Router } from 'express';
import { aiController } from '../controllers/ai.controller';
import { authenticate, requireRole } from '../middleware/auth';
import { aiRateLimiter } from '../middleware/rateLimiter';
import { validate } from '../validators';
import { aiSummaryRequestSchema, aiVisitPrepRequestSchema } from '../validators/ai.validator';

const router = Router();

// Authentication and role boundary
router.use(authenticate);
router.use(requireRole('farmer', 'officer'));

// Apply rate limiting specifically to AI endpoints
router.use(aiRateLimiter);

// POST /api/ai/summary
router.post('/summary', validate(aiSummaryRequestSchema, 'body'), aiController.generateSummary);

// POST /api/ai/visit-prep
router.post(
  '/visit-prep',
  validate(aiVisitPrepRequestSchema, 'body'),
  aiController.generateVisitPrep,
);

export const aiRoutes = router;
