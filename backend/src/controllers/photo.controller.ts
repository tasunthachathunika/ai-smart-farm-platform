import { Request, Response, NextFunction } from 'express';
import { photoService } from '../services/photo.service';
import { ValidationError } from '../utils/errors';

export class PhotoController {
  /**
   * POST /api/plots/:id/photos
   * Uploads and processes a photo using multer (memory storage, 5MB limit).
   * Validates MIME and magic bytes, strips EXIF, resizes to max 1280px,
   * generates thumbnail, and saves to private storage.
   */
  public upload = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const plotId = req.params.id;
      if (!req.file) {
        throw new ValidationError('No photo file uploaded');
      }

      const caption = typeof req.body.caption === 'string' ? req.body.caption : undefined;

      const photo = await photoService.uploadPhoto(req.user!, plotId, req.file, caption, {
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });

      res.status(201).json({
        message: 'Photo uploaded and processed successfully',
        data: photo,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/plots/:id/photos
   * Lists paginated photos for an authorized plot.
   */
  public list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const plotId = req.params.id;
      const page = req.query.page ? parseInt(String(req.query.page), 10) : undefined;
      const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : undefined;

      const result = await photoService.getPlotPhotos(
        req.user!,
        plotId,
        { page, limit },
        {
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
        },
      );

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/plots/:id/photos/:photoId
   * Retrieves single photo metadata.
   */
  public getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id: plotId, photoId } = req.params;
      const photo = await photoService.getPhotoById(req.user!, plotId, photoId);

      res.status(200).json({ data: photo });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/plots/:id/photos/:photoId/file
   * Serves photo binary file from private storage ONLY to authorized users.
   * Checks assertPlotAccess (scope: photos) on every request.
   */
  public serveFile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id: plotId, photoId } = req.params;
      const isThumb =
        req.query.size === 'thumb' || req.query.thumb === 'true' || req.query.thumb === '1';

      const fileResult = await photoService.getPhotoFile(req.user!, plotId, photoId, {
        isThumb,
        meta: {
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
        },
      });

      res.setHeader('Content-Type', fileResult.mimeType);
      res.setHeader('Content-Length', String(fileResult.fileSize));
      res.setHeader('Cache-Control', 'private, max-age=86400, no-transform');
      res.setHeader('X-Content-Type-Options', 'nosniff');

      res.sendFile(fileResult.filePath);
    } catch (error) {
      next(error);
    }
  };
}

export const photoController = new PhotoController();
