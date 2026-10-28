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
import { createAdvisoryNoteSchema } from '../validators/advisoryNote.validator';
import { advisoryNoteController } from '../controllers/advisoryNote.controller';
import { photoController } from '../controllers/photo.controller';
import { uploadPhotoMiddleware } from '../middleware/upload';
import {
  photoUploadBodySchema,
  photoQuerySchema,
  photoParamSchema,
  photoFileQuerySchema,
} from '../validators/photo.validator';
import { weatherController } from '../controllers/weather.controller';

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

// POST /api/plots/:id/advisory-notes (Extension officer writes advisory notes)
router.post(
  '/:id/advisory-notes',
  requireRole('officer'),
  validate(uuidParamSchema, 'params'),
  validate(createAdvisoryNoteSchema, 'body'),
  advisoryNoteController.create,
);

// GET /api/plots/:id/advisory-notes (Farmer reads, officer reads if active share, blocked after revoke)
router.get(
  '/:id/advisory-notes',
  validate(uuidParamSchema, 'params'),
  advisoryNoteController.listForPlot,
);

// POST /api/plots/:id/photos (Upload photo with multer memory storage, 5MB limit, magic bytes check)
router.post(
  '/:id/photos',
  uploadPhotoMiddleware,
  validate(uuidParamSchema, 'params'),
  validate(photoUploadBodySchema, 'body'),
  photoController.upload,
);

// GET /api/plots/:id/photos (List paginated photos)
router.get(
  '/:id/photos',
  validate(uuidParamSchema, 'params'),
  validate(photoQuerySchema, 'query'),
  photoController.list,
);

// GET /api/plots/:id/photos/:photoId (Get photo metadata)
router.get('/:id/photos/:photoId', validate(photoParamSchema, 'params'), photoController.getById);

// GET /api/plots/:id/photos/:photoId/file (Serve binary image securely only through assertPlotAccess)
router.get(
  '/:id/photos/:photoId/file',
  validate(photoParamSchema, 'params'),
  validate(photoFileQuerySchema, 'query'),
  photoController.serveFile,
);

// GET /api/plots/:id/weather (Weather forecast by district coordinates with caching & fallback)
router.get('/:id/weather', validate(uuidParamSchema, 'params'), weatherController.getPlotWeather);

export const plotRoutes = router;
