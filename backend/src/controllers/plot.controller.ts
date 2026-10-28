import { Request, Response, NextFunction } from 'express';
import { plotService } from '../services/plot.service';

export class PlotController {
  public create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const plot = await plotService.createPlot(req.user!, req.body, {
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });
      res.status(201).json({ plot });
    } catch (error) {
      next(error);
    }
  };

  public list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await plotService.getPlots(req.user!, req.query as Record<string, unknown>);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  public getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const plot = await plotService.getPlotById(req.user!, req.params.id, {
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });
      res.status(200).json({ plot });
    } catch (error) {
      next(error);
    }
  };

  public update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const plot = await plotService.updatePlot(req.user!, req.params.id, req.body, {
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });
      res.status(200).json({ plot });
    } catch (error) {
      next(error);
    }
  };

  public delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await plotService.deletePlot(req.user!, req.params.id, {
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });
      res.status(200).json({ message: 'Plot successfully deleted' });
    } catch (error) {
      next(error);
    }
  };
}

export const plotController = new PlotController();
