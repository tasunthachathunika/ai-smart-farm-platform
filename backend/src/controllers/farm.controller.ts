import { Request, Response, NextFunction } from 'express';
import { fieldService } from '../services/field.service';

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
