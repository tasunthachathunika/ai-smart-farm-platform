import { Request, Response, NextFunction } from 'express';
import { weatherService } from '../services/weather.service';

export class WeatherController {
  /**
   * GET /api/plots/:id/weather
   * Fetches weather using Open-Meteo by district coordinates.
   * Uses district lookup table (never farmer's exact GPS).
   * Caches results in weather_data, returns last-updated time,
   * and falls back to cached copy if API fails or times out.
   */
  public getPlotWeather = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const plotId = req.params.id;
      const forceRefresh = req.query.refresh === 'true' || req.query.refresh === '1';

      const weather = await weatherService.getPlotWeather(req.user!, plotId, {
        forceRefresh,
        meta: {
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
        },
      });

      res.status(200).json({ data: weather });
    } catch (error) {
      next(error);
    }
  };
}

export const weatherController = new WeatherController();
