import { Request, Response, NextFunction } from 'express';
import { aiService } from '../services/ai.service';

export class AIController {
  /**
   * POST /api/ai/summary
   * Generates a responsible farm record summary with grounding and safety filters.
   */
  public generateSummary = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const { plotId, cycleId, userPrompt } = req.body;

      const result = await aiService.generateSummary(req.user!, plotId, cycleId, userPrompt, {
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/ai/visit-prep
   * Generates visit prep questions and discussion items for extension officers.
   */
  public generateVisitPrep = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const { plotId, cycleId, focusAreas } = req.body;

      const result = await aiService.generateVisitPrep(req.user!, plotId, cycleId, focusAreas, {
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };
}

export const aiController = new AIController();
