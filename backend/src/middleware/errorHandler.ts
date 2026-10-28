import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';
import { formatZodIssues } from '../validators';

/**
 * Central Error Handler Middleware
 * Guarantees standard error response format:
 * { "error": { "code": "...", "message": "...", "details": ... } }
 */
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  const reqId = req.id || (req.headers['x-request-id'] as string);

  // 1. Custom Application Errors (NotFound, Forbidden, Unauthorized, ValidationError, etc.)
  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      logger.error({ err, reqId }, `[${err.code}] ${err.message}`);
    } else {
      logger.warn({ reqId, code: err.code, statusCode: err.statusCode }, err.message);
    }

    res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
      },
    });
    return;
  }

  // 2. Direct Zod Validation Errors
  if (err instanceof ZodError) {
    const details = formatZodIssues(err);
    logger.warn({ reqId, details }, 'Request validation failed');

    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request input',
        details,
      },
    });
    return;
  }

  // 3. Body parser JSON syntax errors (e.g., malformed JSON payload)
  if (
    err instanceof SyntaxError &&
    'status' in err &&
    (err as { status?: number }).status === 400
  ) {
    logger.warn({ reqId }, 'Malformed JSON in request body');
    res.status(400).json({
      error: {
        code: 'BAD_REQUEST',
        message: 'Malformed JSON payload',
      },
    });
    return;
  }

  // 4. Body parser Payload Too Large (413)
  if (
    err &&
    typeof err === 'object' &&
    (('type' in err && (err as { type: string }).type === 'entity.too.large') ||
      ('status' in err && (err as { status: number }).status === 413))
  ) {
    logger.warn({ reqId }, 'Request body size exceeds maximum allowed limit');
    res.status(413).json({
      error: {
        code: 'PAYLOAD_TOO_LARGE',
        message: 'Request payload exceeds maximum allowed size limit',
      },
    });
    return;
  }

  // 4. Multer File Upload Errors (e.g., LIMIT_FILE_SIZE)
  if (
    err &&
    typeof err === 'object' &&
    'name' in err &&
    (err as { name: string }).name === 'MulterError'
  ) {
    const multerErr = err as unknown as { code: string; message: string; field?: string };
    const isOversize = multerErr.code === 'LIMIT_FILE_SIZE';
    logger.warn({ reqId, code: multerErr.code }, multerErr.message);

    res.status(400).json({
      error: {
        code: isOversize ? 'FILE_TOO_LARGE' : 'UPLOAD_ERROR',
        message: isOversize ? 'File size exceeds maximum allowed limit of 5MB' : multerErr.message,
        details: { field: multerErr.field, code: multerErr.code },
      },
    });
    return;
  }

  // 5. Unexpected / Unhandled Internal Errors
  logger.error({ err, reqId }, 'Unhandled server error');

  res.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An internal server error occurred',
    },
  });
}
