import { Router } from 'express';
import { auditController } from '../controllers/audit.controller';
import { authenticate, requireRole } from '../middleware/auth';
import { validate } from '../validators';
import { auditQuerySchema } from '../validators/share.validator';

const router = Router();

router.use(authenticate);
router.use(requireRole('farmer'));

// GET /api/audit - Farmer inspects their own farm audit trail
router.get('/', validate(auditQuerySchema, 'query'), auditController.getFarmerAudit);

export const auditRoutes = router;
