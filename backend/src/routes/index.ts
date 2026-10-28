import { Router } from 'express';
import { healthRoutes } from './health.routes';
import { authRoutes } from './auth.routes';
import { plotRoutes } from './plot.routes';
import { fieldRouter, cropCycleRouter, activityLogRouter } from './farm.routes';

const router = Router();

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/plots', plotRoutes);
router.use('/fields', fieldRouter);
router.use('/crop-cycles', cropCycleRouter);
router.use('/crop_cycles', cropCycleRouter);
router.use('/activity-logs', activityLogRouter);
router.use('/activity_logs', activityLogRouter);

export const apiRoutes = router;
