import { Request, Response, NextFunction } from 'express';
import { shareService } from '../services/share.service';

export class ShareController {
  public create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const shares = await shareService.createShares(req.user!, req.body, {
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });
      res.status(201).json({ shares });
    } catch (error) {
      next(error);
    }
  };

  public list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await shareService.getShares(req.user!, req.query as Record<string, unknown>);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  public revoke = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await shareService.revokeShare(req.user!, req.params.id, {
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };
}

export const shareController = new ShareController();
