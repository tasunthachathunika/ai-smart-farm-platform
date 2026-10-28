import { Request, Response, NextFunction } from 'express';
import { auditService } from '../services/audit.service';

export class AuditController {
  public getFarmerAudit = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const result = await auditService.getFarmerAuditEvents(
        req.user!,
        req.query as Record<string, unknown>,
      );
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };
}

export const auditController = new AuditController();
