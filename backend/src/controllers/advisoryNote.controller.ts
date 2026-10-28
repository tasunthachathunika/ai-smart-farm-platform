import { Request, Response, NextFunction } from 'express';
import { advisoryNoteService } from '../services/advisoryNote.service';

export class AdvisoryNoteController {
  public create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const advisoryNote = await advisoryNoteService.createNote(
        req.user!,
        req.params.id,
        req.body,
        {
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
        },
      );
      res.status(201).json({ advisoryNote });
    } catch (error) {
      next(error);
    }
  };

  public listForPlot = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await advisoryNoteService.getNotesForPlot(
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

export const advisoryNoteController = new AdvisoryNoteController();
