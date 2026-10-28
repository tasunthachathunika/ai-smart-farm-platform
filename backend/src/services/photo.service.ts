import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import sharp from 'sharp';
import { pool } from '../db';
import { env } from '../config/env';
import { UserResponse } from './auth.service';
import { authzService } from './authz.service';
import { NotFound } from '../utils/errors';
import { writeAuditLog } from '../utils/audit';
import { validateImageFile } from '../middleware/upload';
import { PaginatedResponse, buildPaginatedResponse } from '../utils/pagination';

export interface PhotoResponse {
  id: string;
  plotId: string;
  uploaderId: string;
  originalName: string;
  mimeType: string;
  fileSize: number;
  width: number | null;
  height: number | null;
  caption: string | null;
  createdAt: string;
  url: string;
  thumbnailUrl: string;
}

export interface PhotoFileResult {
  filePath: string;
  mimeType: string;
  fileSize: number;
  originalName: string;
}

export class PhotoService {
  private readonly storageDir: string;

  constructor() {
    this.storageDir = path.isAbsolute(env.PHOTO_STORAGE_DIR)
      ? env.PHOTO_STORAGE_DIR
      : path.resolve(process.cwd(), env.PHOTO_STORAGE_DIR);

    // Ensure the private storage directory exists
    if (!fs.existsSync(this.storageDir)) {
      fs.mkdirSync(this.storageDir, { recursive: true });
    }
  }

  public getStorageDir(): string {
    return this.storageDir;
  }

  /**
   * Uploads, validates, re-encodes, and securely stores a plot photo.
   * Strips all EXIF/GPS metadata, constrains dimensions to max 1280px,
   * generates a 256px thumbnail, and saves with random filenames.
   */
  public async uploadPhoto(
    user: UserResponse,
    plotId: string,
    file: Express.Multer.File,
    caption?: string,
    meta?: { ipAddress?: string; userAgent?: string },
  ): Promise<PhotoResponse> {
    // 1. Authorize user has access to the plot with photos scope
    await authzService.assertPlotAccess(user, plotId, 'photos');

    // 2. Validate MIME type AND magic bytes (detects spoofed extensions)
    validateImageFile(file);

    // 3. Process image with sharp:
    // - .rotate() applies orientation from EXIF before EXIF is discarded
    // - Sharp strips all EXIF and GPS tags by default (since .withMetadata() is NOT called)
    // - Re-encodes as WebP (standardizing format and neutralizing embedded malicious payloads)
    const pipeline = sharp(file.buffer).rotate();

    // Primary image: max 1280px dimension, re-encoded to WebP
    const processedBuffer = await pipeline
      .clone()
      .resize(1280, 1280, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: 85 })
      .toBuffer();

    // Extract processed dimensions
    const processedMeta = await sharp(processedBuffer).metadata();

    // Thumbnail: max 256px dimension, re-encoded to WebP
    const thumbnailBuffer = await sharp(file.buffer)
      .rotate()
      .resize(256, 256, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: 80 })
      .toBuffer();

    // 4. Generate cryptographically random filenames for private storage
    const fileId = crypto.randomUUID();
    const filename = `${fileId}.webp`;
    const thumbnailFilename = `${fileId}-thumb.webp`;

    const mainFilePath = path.join(this.storageDir, filename);
    const thumbFilePath = path.join(this.storageDir, thumbnailFilename);

    // Write to private storage
    await fs.promises.writeFile(mainFilePath, processedBuffer);
    await fs.promises.writeFile(thumbFilePath, thumbnailBuffer);

    // 5. Sanitize original filename for display
    const sanitizedOriginalName =
      path.basename(file.originalname).substring(0, 250) || 'photo.webp';

    // 6. Insert metadata into database
    const { rows } = await pool.query<{
      id: string;
      plot_id: string;
      uploader_id: string;
      filename: string;
      thumbnail_filename: string;
      original_name: string;
      mime_type: string;
      file_size: number;
      width: number | null;
      height: number | null;
      caption: string | null;
      created_at: Date;
    }>(
      `INSERT INTO plot_photos (
        plot_id, uploader_id, filename, thumbnail_filename,
        original_name, mime_type, file_size, width, height, caption
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id, plot_id, uploader_id, filename, thumbnail_filename,
                original_name, mime_type, file_size, width, height, caption, created_at;`,
      [
        plotId,
        user.id,
        filename,
        thumbnailFilename,
        sanitizedOriginalName,
        'image/webp',
        processedBuffer.length,
        processedMeta.width || null,
        processedMeta.height || null,
        caption?.trim() || null,
      ],
    );

    const row = rows[0];

    // 7. Append-only audit logging
    await writeAuditLog({
      userId: user.id,
      action: 'create',
      entityType: 'plot_photos',
      entityId: row.id,
      metadata: {
        plotId,
        filename,
        fileSize: processedBuffer.length,
      },
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
    });

    return this.mapToResponse(row);
  }

  /**
   * Retrieves a paginated list of photos for an authorized plot.
   */
  public async getPlotPhotos(
    user: UserResponse,
    plotId: string,
    query: { page?: number; limit?: number },
    meta?: { ipAddress?: string; userAgent?: string },
  ): Promise<PaginatedResponse<PhotoResponse>> {
    // Authorize plot access with photos scope
    await authzService.assertPlotAccess(user, plotId, 'photos');

    // Audit log if viewed by an officer
    if (user.role === 'officer') {
      await writeAuditLog({
        userId: user.id,
        action: 'plot_viewed_by_officer',
        entityType: 'plot_photos',
        entityId: plotId,
        metadata: { plotId, actionType: 'list_photos' },
        ipAddress: meta?.ipAddress,
        userAgent: meta?.userAgent,
      });
    }

    const page = query.page || 1;
    const limit = query.limit || 10;
    const offset = (page - 1) * limit;

    const countResult = await pool.query<{ count: string }>(
      'SELECT COUNT(*) FROM plot_photos WHERE plot_id = $1;',
      [plotId],
    );
    const totalItems = parseInt(countResult.rows[0].count, 10);

    const { rows } = await pool.query<{
      id: string;
      plot_id: string;
      uploader_id: string;
      filename: string;
      thumbnail_filename: string;
      original_name: string;
      mime_type: string;
      file_size: number;
      width: number | null;
      height: number | null;
      caption: string | null;
      created_at: Date;
    }>(
      `SELECT id, plot_id, uploader_id, filename, thumbnail_filename,
              original_name, mime_type, file_size, width, height, caption, created_at
       FROM plot_photos
       WHERE plot_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3;`,
      [plotId, limit, offset],
    );

    const data = rows.map((r) => this.mapToResponse(r));

    return buildPaginatedResponse(data, totalItems, page, limit);
  }

  /**
   * Retrieves single photo metadata.
   */
  public async getPhotoById(
    user: UserResponse,
    plotId: string,
    photoId: string,
  ): Promise<PhotoResponse> {
    await authzService.assertPlotAccess(user, plotId, 'photos');

    const { rows } = await pool.query<{
      id: string;
      plot_id: string;
      uploader_id: string;
      filename: string;
      thumbnail_filename: string;
      original_name: string;
      mime_type: string;
      file_size: number;
      width: number | null;
      height: number | null;
      caption: string | null;
      created_at: Date;
    }>(
      `SELECT id, plot_id, uploader_id, filename, thumbnail_filename,
              original_name, mime_type, file_size, width, height, caption, created_at
       FROM plot_photos
       WHERE id = $1 AND plot_id = $2;`,
      [photoId, plotId],
    );

    if (rows.length === 0) {
      throw new NotFound('Resource not found');
    }

    return this.mapToResponse(rows[0]);
  }

  /**
   * Serves photo binary file ONLY to authorized users via assertPlotAccess (scope: photos).
   * Validates plot access on every request, checks record existence, and streams from private storage.
   */
  public async getPhotoFile(
    user: UserResponse,
    plotId: string,
    photoId: string,
    options: { isThumb?: boolean; meta?: { ipAddress?: string; userAgent?: string } } = {},
  ): Promise<PhotoFileResult> {
    // 1. Authorize: returns 404 for unauthorized access
    await authzService.assertPlotAccess(user, plotId, 'photos');

    // 2. Fetch photo record
    const { rows } = await pool.query<{
      id: string;
      plot_id: string;
      filename: string;
      thumbnail_filename: string;
      original_name: string;
      mime_type: string;
    }>(
      `SELECT id, plot_id, filename, thumbnail_filename, original_name, mime_type
       FROM plot_photos
       WHERE id = $1 AND plot_id = $2;`,
      [photoId, plotId],
    );

    if (rows.length === 0) {
      throw new NotFound('Resource not found');
    }

    const photo = rows[0];

    // 3. Officer audit trail on read
    if (user.role === 'officer') {
      await writeAuditLog({
        userId: user.id,
        action: 'plot_viewed_by_officer',
        entityType: 'plot_photos',
        entityId: photo.id,
        metadata: { plotId, isThumbnail: !!options.isThumb },
        ipAddress: options.meta?.ipAddress,
        userAgent: options.meta?.userAgent,
      });
    }

    // 4. Resolve absolute path in private storage
    const targetFilename = options.isThumb ? photo.thumbnail_filename : photo.filename;
    const targetPath = path.join(this.storageDir, targetFilename);

    if (!fs.existsSync(targetPath)) {
      throw new NotFound('Resource not found');
    }

    const stats = await fs.promises.stat(targetPath);

    return {
      filePath: targetPath,
      mimeType: photo.mime_type || 'image/webp',
      fileSize: stats.size,
      originalName: photo.original_name,
    };
  }

  private mapToResponse(row: {
    id: string;
    plot_id: string;
    uploader_id: string;
    original_name: string;
    mime_type: string;
    file_size: number;
    width: number | null;
    height: number | null;
    caption: string | null;
    created_at: Date;
  }): PhotoResponse {
    return {
      id: row.id,
      plotId: row.plot_id,
      uploaderId: row.uploader_id,
      originalName: row.original_name,
      mimeType: row.mime_type,
      fileSize: row.file_size,
      width: row.width,
      height: row.height,
      caption: row.caption,
      createdAt:
        row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
      url: `/api/plots/${row.plot_id}/photos/${row.id}/file`,
      thumbnailUrl: `/api/plots/${row.plot_id}/photos/${row.id}/file?size=thumb`,
    };
  }
}

export const photoService = new PhotoService();
