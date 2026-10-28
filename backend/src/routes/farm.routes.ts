import { Router } from 'express';
import { fieldController } from '../controllers/farm.controller';
import { authenticate, requireRole } from '../middleware/auth';
import { validate } from '../validators';
import {
  createFieldSchema,
  updateFieldSchema,
  fieldQuerySchema,
  uuidParamSchema,
} from '../validators/farm.validator';

// ==========================================
// 1. Fields Router
// ==========================================
export const fieldRouter = Router();
fieldRouter.use(authenticate);
fieldRouter.use(requireRole('farmer', 'officer'));

fieldRouter.post(
  '/',
  requireRole('farmer'),
  validate(createFieldSchema, 'body'),
  fieldController.create,
);
fieldRouter.get('/', validate(fieldQuerySchema, 'query'), fieldController.list);
fieldRouter.get('/:id', validate(uuidParamSchema, 'params'), fieldController.getById);
fieldRouter.patch(
  '/:id',
  requireRole('farmer'),
  validate(uuidParamSchema, 'params'),
  validate(updateFieldSchema, 'body'),
  fieldController.update,
);
fieldRouter.delete(
  '/:id',
  requireRole('farmer'),
  validate(uuidParamSchema, 'params'),
  fieldController.delete,
);
