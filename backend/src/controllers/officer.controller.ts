import { Request, Response, NextFunction } from 'express';
import { officerService } from '../services/officer.service';

export class OfficerController {
  public listPlots = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await officerService.getOfficerPlots(
        req.user!,
        req.query as Record<string, unknown>,
      );
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  public getPlotById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const plot = await officerService.getOfficerPlotById(req.user!, req.params.id, {
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });
      res.status(200).json({ plot });
    } catch (error) {
      next(error);
    }
  };

  public getCropCycles = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await officerService.getPlotCropCycles(
        req.user!,
        req.params.id,
        req.query as Record<string, unknown>,
        {
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
        },
      );
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  public getActivityLogs = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const result = await officerService.getPlotActivityLogs(
        req.user!,
        req.params.id,
        req.query as Record<string, unknown>,
        {
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
        },
      );
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  public getInputApplications = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const result = await officerService.getPlotInputApplications(
        req.user!,
        req.params.id,
        req.query as Record<string, unknown>,
        {
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
        },
      );
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  public getHarvests = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await officerService.getPlotHarvests(
        req.user!,
        req.params.id,
        req.query as Record<string, unknown>,
        {
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
        },
      );
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };
}

export const officerController = new OfficerController();
