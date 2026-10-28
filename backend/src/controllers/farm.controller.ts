import { Request, Response, NextFunction } from 'express';
import { fieldService } from '../services/field.service';
import { cropCycleService } from '../services/cropCycle.service';
import { activityLogService } from '../services/activityLog.service';

// ----------------------------------------------------
// Fields
// ----------------------------------------------------
export class FieldController {
  public create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const field = await fieldService.createField(req.user!, req.body, {
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });
      res.status(201).json({ field });
    } catch (error) {
      next(error);
    }
  };

  public list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await fieldService.getFields(req.user!, req.query as Record<string, unknown>);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  public getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const field = await fieldService.getFieldById(req.user!, req.params.id);
      res.status(200).json({ field });
    } catch (error) {
      next(error);
    }
  };

  public update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const field = await fieldService.updateField(req.user!, req.params.id, req.body, {
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });
      res.status(200).json({ field });
    } catch (error) {
      next(error);
    }
  };

  public delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await fieldService.deleteField(req.user!, req.params.id, {
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });
      res.status(200).json({ message: 'Field successfully deleted' });
    } catch (error) {
      next(error);
    }
  };
}

export const fieldController = new FieldController();

// ----------------------------------------------------
// Crop Cycles
// ----------------------------------------------------
export class CropCycleController {
  public create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const cycle = await cropCycleService.createCropCycle(req.user!, req.body, {
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });
      res.status(201).json({ cycle });
    } catch (error) {
      next(error);
    }
  };

  public list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await cropCycleService.getCropCycles(
        req.user!,
        req.query as Record<string, unknown>,
      );
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  public getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const cycle = await cropCycleService.getCropCycleById(req.user!, req.params.id);
      res.status(200).json({ cycle });
    } catch (error) {
      next(error);
    }
  };

  public update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const cycle = await cropCycleService.updateCropCycle(req.user!, req.params.id, req.body, {
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });
      res.status(200).json({ cycle });
    } catch (error) {
      next(error);
    }
  };

  public delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await cropCycleService.deleteCropCycle(req.user!, req.params.id, {
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });
      res.status(200).json({ message: 'Crop cycle successfully deleted' });
    } catch (error) {
      next(error);
    }
  };
}

export const cropCycleController = new CropCycleController();

// ----------------------------------------------------
// Activity Logs
// ----------------------------------------------------
export class ActivityLogController {
  public create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const log = await activityLogService.createActivityLog(req.user!, req.body, {
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });
      res.status(201).json({ log });
    } catch (error) {
      next(error);
    }
  };

  public list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await activityLogService.getActivityLogs(
        req.user!,
        req.query as Record<string, unknown>,
      );
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  public getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const log = await activityLogService.getActivityLogById(req.user!, req.params.id);
      res.status(200).json({ log });
    } catch (error) {
      next(error);
    }
  };

  public update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const log = await activityLogService.updateActivityLog(req.user!, req.params.id, req.body, {
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });
      res.status(200).json({ log });
    } catch (error) {
      next(error);
    }
  };

  public delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await activityLogService.deleteActivityLog(req.user!, req.params.id, {
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });
      res.status(200).json({ message: 'Activity log successfully deleted' });
    } catch (error) {
      next(error);
    }
  };
}

export const activityLogController = new ActivityLogController();
