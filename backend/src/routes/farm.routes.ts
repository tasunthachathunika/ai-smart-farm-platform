import { Router } from 'express';
import {
  fieldController,
  cropCycleController,
  activityLogController,
} from '../controllers/farm.controller';
import { authenticate, requireRole } from '../middleware/auth';
import { validate } from '../validators';
import {
  createFieldSchema,
  updateFieldSchema,
  fieldQuerySchema,
  createCropCycleSchema,
  updateCropCycleSchema,
  cropCycleQuerySchema,
  createActivityLogSchema,
  updateActivityLogSchema,
  activityLogQuerySchema,
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

// ==========================================
// 2. Crop Cycles Router
// ==========================================
export const cropCycleRouter = Router();
cropCycleRouter.use(authenticate);
cropCycleRouter.use(requireRole('farmer', 'officer'));

cropCycleRouter.post('/', validate(createCropCycleSchema, 'body'), cropCycleController.create);
cropCycleRouter.get('/', validate(cropCycleQuerySchema, 'query'), cropCycleController.list);
cropCycleRouter.get('/:id', validate(uuidParamSchema, 'params'), cropCycleController.getById);
cropCycleRouter.patch(
  '/:id',
  validate(uuidParamSchema, 'params'),
  validate(updateCropCycleSchema, 'body'),
  cropCycleController.update,
);
cropCycleRouter.delete('/:id', validate(uuidParamSchema, 'params'), cropCycleController.delete);

// ==========================================
// 3. Activity Logs Router
// ==========================================
export const activityLogRouter = Router();
activityLogRouter.use(authenticate);
activityLogRouter.use(requireRole('farmer', 'officer'));

activityLogRouter.post(
  '/',
  validate(createActivityLogSchema, 'body'),
  activityLogController.create,
);
activityLogRouter.get('/', validate(activityLogQuerySchema, 'query'), activityLogController.list);
activityLogRouter.get('/:id', validate(uuidParamSchema, 'params'), activityLogController.getById);
activityLogRouter.patch(
  '/:id',
  validate(uuidParamSchema, 'params'),
  validate(updateActivityLogSchema, 'body'),
  activityLogController.update,
);
activityLogRouter.delete('/:id', validate(uuidParamSchema, 'params'), activityLogController.delete);
