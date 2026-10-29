import { Router } from 'express';
import { healthRoutes } from './health.routes';
import { authRoutes } from './auth.routes';
import { plotRoutes } from './plot.routes';
import {
  fieldRouter,
  cropCycleRouter,
  activityLogRouter,
  inputApplicationRouter,
  harvestRouter,
} from './farm.routes';
import { shareRoutes } from './share.routes';
import { auditRoutes } from './audit.routes';
import { officerRoutes } from './officer.routes';
import { aiRoutes } from './ai.routes';
import { adminRoutes } from './admin.routes';
import { docsRoutes } from './docs.routes';

const router = Router();

router.use('/health', healthRoutes);
router.use('/docs', docsRoutes);
router.use('/auth', authRoutes);
router.use('/plots', plotRoutes);
router.use('/fields', fieldRouter);
router.use('/crop-cycles', cropCycleRouter);
router.use('/crop_cycles', cropCycleRouter);
router.use('/activity-logs', activityLogRouter);
router.use('/activity_logs', activityLogRouter);
router.use('/input-applications', inputApplicationRouter);
router.use('/input_applications', inputApplicationRouter);
router.use('/harvests', harvestRouter);
router.use('/shares', shareRoutes);
router.use('/audit', auditRoutes);
router.use('/officer', officerRoutes);
router.use('/ai', aiRoutes);
router.use('/admin', adminRoutes);

export const apiRoutes = router;
