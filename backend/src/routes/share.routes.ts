import { Router } from 'express';
import { shareController } from '../controllers/share.controller';
import { authenticate, requireRole } from '../middleware/auth';
import { validate } from '../validators';
import { createShareSchema, shareQuerySchema } from '../validators/share.validator';
import { uuidParamSchema } from '../validators/farm.validator';

const router = Router();

router.use(authenticate);
router.use(requireRole('farmer', 'officer'));

// POST /api/shares - Farmer grants access to plots to a verified officer
router.post(
  '/',
  requireRole('farmer'),
  validate(createShareSchema, 'body'),
  shareController.create,
);

// GET /api/shares - List shares (farmer sees their plot shares; officer sees shares granted to them)
router.get('/', validate(shareQuerySchema, 'query'), shareController.list);

// DELETE /api/shares/:id - Revoke share in transaction with audit logging
router.delete('/:id', validate(uuidParamSchema, 'params'), shareController.revoke);

export const shareRoutes = router;
