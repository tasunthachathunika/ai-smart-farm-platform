import multer from 'multer';
import { Request, Response, NextFunction } from 'express';
import { ValidationError } from '../utils/errors';

// 5MB limit per file
export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

// Permitted MIME types
export const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);

/**
 * Validates magic bytes (file signature) against supported image formats.
 * Prevents disguised files (e.g., .exe or .html renamed to .jpg).
 */
export function validateMagicBytes(buffer: Buffer): 'jpeg' | 'png' | 'webp' | null {
  if (!buffer || buffer.length < 12) {
    return null;
  }

  // 1. JPEG: starts with FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'jpeg';
  }

  // 2. PNG: starts with 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 && // P
    buffer[2] === 0x4e && // N
    buffer[3] === 0x47 && // G
    buffer[4] === 0x0d && // \r
    buffer[5] === 0x0a && // \n
    buffer[6] === 0x1a && // EOF
    buffer[7] === 0x0a // \n
  ) {
    return 'png';
  }

  // 3. WebP: RIFF (bytes 0-3) + WEBP (bytes 8-11)
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 && // RIFF
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50 // WEBP
  ) {
    return 'webp';
  }

  return null;
}

/**
 * Validates both MIME type and magic bytes.
 * Throws ValidationError if either is invalid or if they contradict each other.
 */
export function validateImageFile(file: Express.Multer.File): {
  detectedFormat: 'jpeg' | 'png' | 'webp';
  mimeType: string;
} {
  const normalizedMime = (file.mimetype || '').toLowerCase();
  if (!ALLOWED_MIME_TYPES.has(normalizedMime)) {
    throw new ValidationError('Invalid MIME type. Only JPEG, PNG, and WebP images are allowed.', {
      mimetype: file.mimetype,
    });
  }

  const detectedFormat = validateMagicBytes(file.buffer);
  if (!detectedFormat) {
    throw new ValidationError(
      'Invalid file content. Magic bytes do not match a valid JPEG, PNG, or WebP image.',
    );
  }

  // Check MIME and magic bytes consistency
  const isJpegMime = normalizedMime === 'image/jpeg' || normalizedMime === 'image/jpg';
  const isPngMime = normalizedMime === 'image/png';
  const isWebpMime = normalizedMime === 'image/webp';

  if (
    (isJpegMime && detectedFormat !== 'jpeg') ||
    (isPngMime && detectedFormat !== 'png') ||
    (isWebpMime && detectedFormat !== 'webp')
  ) {
    throw new ValidationError('MIME type and file signature (magic bytes) mismatch.', {
      declaredMime: file.mimetype,
      detectedFormat,
    });
  }

  return { detectedFormat, mimeType: normalizedMime };
}

// Multer memory storage configuration with 5MB limit
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE_BYTES,
    files: 1,
  },
});

/**
 * Middleware that accepts a single photo upload under either 'photo' or 'file' field.
 */
export function uploadPhotoMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Support both 'photo' and 'file' field names
  upload.fields([
    { name: 'photo', maxCount: 1 },
    { name: 'file', maxCount: 1 },
  ])(req, res, (err) => {
    if (err) {
      if (!req.readableEnded) {
        req.on('data', () => {});
        req.on('end', () => next(err));
        req.on('error', () => next(err));
        req.resume();
        return;
      }
      return next(err);
    }

    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
    const uploadedFile = files?.photo?.[0] || files?.file?.[0];

    if (!uploadedFile) {
      return next(new ValidationError('No photo file uploaded. Expected field "photo" or "file".'));
    }

    // Attach single file to req.file for standard express-multer usage
    req.file = uploadedFile;
    next();
  });
}
