import { Request, Response, NextFunction } from 'express';
import { adminService } from '../services/admin.service';
import {
  AdminUserQuery,
  PendingOfficerQuery,
  AdminAuditQuery,
  VerifyOfficerInput,
} from '../validators/admin.validator';

export class AdminController {
  /**
   * GET /api/admin/users
   * List users (metadata only, strictly no farm data).
   */
  public listUsers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await adminService.getUsers(req.query as unknown as AdminUserQuery);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  /**
   * PATCH /api/admin/users/:id/status
   * Activate or deactivate a user account.
   */
  public updateUserStatus = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const { id } = req.params;
      const { isActive } = req.body;

      const user = await adminService.setUserStatus(req.user!, id, isActive, {
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });

      res.status(200).json({
        message: isActive ? 'User activated successfully' : 'User deactivated successfully',
        user,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/admin/officers/pending
   * List extension officers awaiting verification.
   */
  public listPendingOfficers = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const result = await adminService.getPendingOfficers(
        req.query as unknown as PendingOfficerQuery,
      );
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  /**
   * PATCH /api/admin/officers/:id/verify
   * Verify an extension officer (approve, reject, or suspend).
   */
  public verifyOfficer = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const { id } = req.params;
      const { action, reason } = req.body as VerifyOfficerInput;

      const officer = await adminService.verifyOfficer(req.user!, id, action, reason, {
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });

      res.status(200).json({
        message: `Officer status successfully updated to ${action}`,
        officer,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/admin/audit
   * System audit logs (metadata only).
   */
  public getAuditLogs = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await adminService.getAuditLogs(req.query as unknown as AdminAuditQuery);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };
}

export const adminController = new AdminController();
