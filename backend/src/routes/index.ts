import { Router } from 'express';
import { healthRoutes } from './health.routes';
import { authRoutes } from './auth.routes';
import { plotRoutes } from './plot.routes';
import { fieldRouter } from './farm.routes';

const router = Router();

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/plots', plotRoutes);
router.use('/fields', fieldRouter);

export const apiRoutes = router;
