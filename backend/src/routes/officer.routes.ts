import { Router } from 'express';
import { officerController } from '../controllers/officer.controller';
import { advisoryNoteController } from '../controllers/advisoryNote.controller';
import { photoController } from '../controllers/photo.controller';
import { weatherController } from '../controllers/weather.controller';
import { authenticate, requireRole } from '../middleware/auth';
import { validate } from '../validators';
import { uuidParamSchema } from '../validators/farm.validator';

const router = Router();

router.use(authenticate);
router.use(requireRole('officer'));

// GET /api/officer/plots (only active shares with scopes, blurred district, never exact GPS)
router.get('/plots', officerController.listPlots);

// Read-only endpoints for shared plots
router.get('/plots/:id', validate(uuidParamSchema, 'params'), officerController.getPlotById);
router.get(
  '/plots/:id/crop-cycles',
  validate(uuidParamSchema, 'params'),
  officerController.getCropCycles,
);
router.get(
  '/plots/:id/crop_cycles',
  validate(uuidParamSchema, 'params'),
  officerController.getCropCycles,
);
router.get(
  '/plots/:id/activity-logs',
  validate(uuidParamSchema, 'params'),
  officerController.getActivityLogs,
);
router.get(
  '/plots/:id/activity_logs',
  validate(uuidParamSchema, 'params'),
  officerController.getActivityLogs,
);
router.get(
  '/plots/:id/input-applications',
  validate(uuidParamSchema, 'params'),
  officerController.getInputApplications,
);
router.get(
  '/plots/:id/input_applications',
  validate(uuidParamSchema, 'params'),
  officerController.getInputApplications,
);
router.get(
  '/plots/:id/harvests',
  validate(uuidParamSchema, 'params'),
  officerController.getHarvests,
);
router.get(
  '/plots/:id/advisory-notes',
  validate(uuidParamSchema, 'params'),
  advisoryNoteController.listForPlot,
);

router.get('/plots/:id/photos', validate(uuidParamSchema, 'params'), photoController.list);

router.get(
  '/plots/:id/weather',
  validate(uuidParamSchema, 'params'),
  weatherController.getPlotWeather,
);

export const officerRoutes = router;
