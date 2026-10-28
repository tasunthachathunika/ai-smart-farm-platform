import { Router } from 'express';
import { adminController } from '../controllers/admin.controller';
import { authenticate, requireRole } from '../middleware/auth';
import { validate } from '../validators';
import {
  adminUuidParamSchema,
  adminUserQuerySchema,
  updateUserStatusSchema,
  pendingOfficerQuerySchema,
  verifyOfficerSchema,
  adminAuditQuerySchema,
} from '../validators/admin.validator';

const router = Router();

// Strictly authenticate and restrict to admin role only
router.use(authenticate);
router.use(requireRole('admin'));

// 1. GET /api/admin/users (Metadata only, strictly NO farm data)
router.get('/users', validate(adminUserQuerySchema, 'query'), adminController.listUsers);

// 2. PATCH /api/admin/users/:id/status (Activate or deactivate user account)
router.patch(
  '/users/:id/status',
  validate(adminUuidParamSchema, 'params'),
  validate(updateUserStatusSchema, 'body'),
  adminController.updateUserStatus,
);

// Convenience routes for activate / deactivate
router.patch(
  '/users/:id/activate',
  validate(adminUuidParamSchema, 'params'),
  (req, _res, next) => {
    req.body = { isActive: true };
    next();
  },
  adminController.updateUserStatus,
);

router.patch(
  '/users/:id/deactivate',
  validate(adminUuidParamSchema, 'params'),
  (req, _res, next) => {
    req.body = { isActive: false };
    next();
  },
  adminController.updateUserStatus,
);

// 3. GET /api/admin/officers/pending (Extension officers awaiting verification)
router.get(
  '/officers/pending',
  validate(pendingOfficerQuerySchema, 'query'),
  adminController.listPendingOfficers,
);

// 4. PATCH /api/admin/officers/:id/verify (Approve, reject, or suspend officer)
router.patch(
  '/officers/:id/verify',
  validate(adminUuidParamSchema, 'params'),
  validate(verifyOfficerSchema, 'body'),
  adminController.verifyOfficer,
);

// 5. GET /api/admin/audit (Audit metadata only, strictly no passwords, exact GPS, or private notes)
router.get('/audit', validate(adminAuditQuerySchema, 'query'), adminController.getAuditLogs);

export const adminRoutes = router;
