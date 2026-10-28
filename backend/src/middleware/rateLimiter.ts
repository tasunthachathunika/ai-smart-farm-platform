import { Request, Response, NextFunction } from 'express';

interface RateLimitRecord {
  timestamps: number[];
}

export interface RateLimiterOptions {
  windowMs: number;
  maxRequests: number;
  keyPrefix?: string;
  code?: string;
  message?: (retryAfterSeconds: number) => string;
  keyGenerator?: (req: Request) => string;
  skip?: (req: Request) => boolean;
}

export interface RateLimiterMiddleware {
  (req: Request, res: Response, next: NextFunction): void;
  reset: () => void;
}

/**
 * Creates an in-memory rate limiter middleware.
 * Uses custom key generator or defaults to user ID (if authenticated) or client IP.
 */
export function createRateLimiter(options: RateLimiterOptions): RateLimiterMiddleware {
  const hits = new Map<string, RateLimitRecord>();
  const {
    windowMs,
    maxRequests,
    keyPrefix = 'rl',
    code = 'RATE_LIMIT_EXCEEDED',
    message,
    keyGenerator,
    skip,
  } = options;

  // Cleanup expired entries every 5 minutes
  setInterval(
    () => {
      const now = Date.now();
      for (const [key, record] of hits.entries()) {
        record.timestamps = record.timestamps.filter((ts) => now - ts < windowMs);
        if (record.timestamps.length === 0) {
          hits.delete(key);
        }
      }
    },
    5 * 60 * 1000,
  ).unref();

  const middleware: RateLimiterMiddleware = (req: Request, res: Response, next: NextFunction): void => {
    // Check if request should skip rate limiting
    if (skip && skip(req)) {
      return next();
    }

    const identifier = keyGenerator
      ? keyGenerator(req)
      : req.user?.id || req.ip || req.socket.remoteAddress || 'unknown';
    const key = `${keyPrefix}:${identifier}`;
    const now = Date.now();

    let record = hits.get(key);
    if (!record) {
      record = { timestamps: [] };
      hits.set(key, record);
    }

    // Keep timestamps within current sliding window
    record.timestamps = record.timestamps.filter((ts) => now - ts < windowMs);

    if (record.timestamps.length >= maxRequests) {
      const oldestHit = record.timestamps[0];
      const retryAfterSeconds = Math.ceil((oldestHit + windowMs - now) / 1000) || 1;

      res.setHeader('Retry-After', String(retryAfterSeconds));
      res.setHeader('X-RateLimit-Limit', String(maxRequests));
      res.setHeader('X-RateLimit-Remaining', '0');

      const defaultMessage = `Too many requests. Please try again in ${retryAfterSeconds} seconds.`;
      const responseMessage = message ? message(retryAfterSeconds) : defaultMessage;

      res.status(429).json({
        error: {
          code,
          message: responseMessage,
          details: { retryAfterSeconds },
        },
      });
      return;
    }

    record.timestamps.push(now);
    const remaining = maxRequests - record.timestamps.length;

    res.setHeader('X-RateLimit-Limit', String(maxRequests));
    res.setHeader('X-RateLimit-Remaining', String(remaining));

    next();
  };

  middleware.reset = () => {
    hits.clear();
  };

  return middleware;
}

/**
 * 1. AI Rate Limiter:
 * Strict limit on AI summary and visit-prep generation (10 requests per minute).
 */
export const aiRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 10,
  keyPrefix: 'ai',
  message: (retryAfter) => `Too many AI requests. Please try again in ${retryAfter} seconds.`,
});

/**
 * 2. Login Strict Rate Limiter:
 * Defense against credential stuffing and brute-force attacks (5 attempts per 15 minutes per IP).
 */
export const loginRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 5,
  keyPrefix: 'login',
  code: 'LOGIN_RATE_LIMIT_EXCEEDED',
  keyGenerator: (req) => req.ip || req.socket.remoteAddress || 'unknown',
  message: (retryAfter) =>
    `Too many login attempts from this IP address. Please try again in ${retryAfter} seconds.`,
});

/**
 * 3. General API Rate Limiter:
 * Protects all /api endpoints from DoS and scraping (300 requests per 15 minutes).
 * Automatically bypassed in test mode unless x-test-rate-limit header is provided.
 */
export const generalRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 300,
  keyPrefix: 'general',
  skip: (req) => process.env.NODE_ENV === 'test' && req.headers['x-test-rate-limit'] !== 'true',
  message: (retryAfter) => `Too many requests. Please try again in ${retryAfter} seconds.`,
});
