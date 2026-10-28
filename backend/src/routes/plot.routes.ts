import { Router } from 'express';
import { plotController } from '../controllers/plot.controller';
import { authenticate, requireRole } from '../middleware/auth';
import { validate } from '../validators';
import {
  createPlotSchema,
  updatePlotSchema,
  plotQuerySchema,
  uuidParamSchema,
} from '../validators/farm.validator';

const router = Router();

// Protect all plot routes with authentication and role boundary
router.use(authenticate);
router.use(requireRole('farmer', 'officer'));

// POST /api/plots (Only farmers can register plots)
router.post('/', requireRole('farmer'), validate(createPlotSchema, 'body'), plotController.create);

// GET /api/plots (Paginated, filtered list; exact GPS for owner, blurred district for officers)
router.get('/', validate(plotQuerySchema, 'query'), plotController.list);

// GET /api/plots/:id (Exact GPS only to owner, 404 for unauthorized)
router.get('/:id', validate(uuidParamSchema, 'params'), plotController.getById);

// PATCH /api/plots/:id (Only plot owner can update)
router.patch(
  '/:id',
  requireRole('farmer'),
  validate(uuidParamSchema, 'params'),
  validate(updatePlotSchema, 'body'),
  plotController.update,
);

// DELETE /api/plots/:id (Only plot owner can delete)
router.delete(
  '/:id',
  requireRole('farmer'),
  validate(uuidParamSchema, 'params'),
  plotController.delete,
);

export const plotRoutes = router;
