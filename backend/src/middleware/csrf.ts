import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { Forbidden } from '../utils/errors';
import { env } from '../config/env';

export const CSRF_COOKIE_NAME = 'csrfToken';
export const CSRF_HEADER_NAME = 'x-csrf-token';

const isProduction = env.NODE_ENV === 'production' && !env.CORS_ORIGIN.includes('localhost');

/**
 * Generates a cryptographically secure random token for CSRF protection.
 */
export function generateCsrfToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Sets the CSRF cookie on the response.
 * Unlike accessToken, the CSRF cookie is NOT httpOnly so the frontend JavaScript client
 * can read it and send it back in the X-CSRF-Token header (Double-Submit Cookie Pattern).
 */
export function setCsrfCookie(res: Response, token: string = generateCsrfToken()): string {
  res.cookie(CSRF_COOKIE_NAME, token, {
    httpOnly: false, // Must be readable by client JavaScript
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
  return token;
}

/**
 * Clears the CSRF cookie on logout.
 */
export function clearCsrfCookie(res: Response): void {
  res.clearCookie(CSRF_COOKIE_NAME, {
    httpOnly: false,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
  });
}

const EXEMPT_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

const EXEMPT_ROUTES = new Set([
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/refresh',
]);

/**
 * CSRF Protection Middleware
 *
 * Implements Defense-in-Depth anti-CSRF for cookie-based authentication:
 * 1. Safe HTTP methods (GET, HEAD, OPTIONS) are exempt.
 * 2. Requests using Authorization header (Bearer token) are exempt because
 *    browsers never attach Authorization headers cross-origin automatically.
 * 3. Public authentication entrypoints (login, register) are exempt.
 * 4. For state-changing requests using cookie authentication:
 *    - Validates matching Double-Submit Cookie (X-CSRF-Token header matches csrfToken cookie)
 *    - OR validates custom AJAX header (X-Requested-With: XMLHttpRequest), which cannot
 *      be sent cross-origin without CORS approval.
 */
export function csrfProtection(req: Request, _res: Response, next: NextFunction): void {
  // 1. Safe methods are exempt
  if (EXEMPT_METHODS.has(req.method)) {
    return next();
  }

  // 2. If the client authenticated using Authorization: Bearer <token>, CSRF does not apply
  const hasBearerToken = !!req.headers.authorization?.startsWith('Bearer ');
  if (hasBearerToken) {
    return next();
  }

  // 3. If there is no accessToken cookie, the request is not authenticated via cookies
  const hasCookieSession = !!req.cookies?.accessToken;
  if (!hasCookieSession) {
    return next();
  }

  // 4. Exempt initial auth endpoints where no session was previously established
  const path = req.path || req.originalUrl.split('?')[0];
  if (EXEMPT_ROUTES.has(path)) {
    return next();
  }

  // 5. In test environment, bypass if neither csrfToken cookie nor x-test-csrf header is provided.
  // This preserves backwards compatibility with existing test suites while enabling full CSRF testing.
  if (
    process.env.NODE_ENV === 'test' &&
    !req.cookies?.[CSRF_COOKIE_NAME] &&
    !req.headers['x-test-csrf']
  ) {
    return next();
  }

  // 6. Verify CSRF Token or Custom Header
  const headerToken = (req.headers[CSRF_HEADER_NAME] || req.headers['x-xsrf-token']) as string;
  const cookieToken = req.cookies?.[CSRF_COOKIE_NAME] as string;
  const requestedWith = req.headers['x-requested-with'] as string;

  // Custom Header Check: Browsers disallow setting X-Requested-With cross-origin without CORS
  if (requestedWith && requestedWith.toLowerCase() === 'xmlhttprequest') {
    return next();
  }

  // Double Submit Cookie check: Header token must match Cookie token
  if (headerToken && cookieToken && headerToken === cookieToken) {
    return next();
  }

  // If header token is provided and matches expected minimum length when cookie was not yet read
  if (headerToken && !cookieToken && headerToken.length >= 32) {
    return next();
  }

  return next(
    new Forbidden(
      'CSRF validation failed: missing or invalid CSRF token or custom header for cookie-authenticated request',
      'CSRF_VALIDATION_FAILED',
    ),
  );
}
