import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

// Extend Express Request interface to include request ID
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      id: string;
    }
  }
}

/**
 * Request-ID Middleware
 * Assigns a unique correlation ID to each incoming request and sets the X-Request-Id header.
 */
export function requestId(req: Request, res: Response, next: NextFunction): void {
  const incomingId = req.headers['x-request-id'];
  const correlationId =
    typeof incomingId === 'string' && incomingId.trim().length > 0
      ? incomingId.trim()
      : crypto.randomUUID();

  req.id = correlationId;
  res.setHeader('X-Request-Id', correlationId);

  next();
}
