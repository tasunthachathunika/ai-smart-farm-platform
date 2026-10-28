import { Request, Response, NextFunction } from 'express';
import { Unauthorized, Forbidden, NotFound } from '../utils/errors';
import { verifyAccessToken } from '../utils/token';
import { authService, UserResponse } from '../services/auth.service';
import { authzService, PlotAccessResult, ShareScope } from '../services/authz.service';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: UserResponse;
      plotAccess?: PlotAccessResult;
    }
  }
}

/**
 * Authentication Middleware
 * Validates JWT access token from httpOnly cookie or Authorization header.
 * Verifies active user status in the database on every request per AGENTS.md.
 */
export async function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    let token: string | undefined = req.cookies?.accessToken;

    if (!token && req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      throw new Unauthorized('Authentication required', 'UNAUTHORIZED');
    }

    let payload;
    try {
      payload = verifyAccessToken(token);
    } catch {
      throw new Unauthorized('Invalid or expired token', 'INVALID_TOKEN');
    }

    // Always verify against database per AGENTS.md Rule 1
    const user = await authService.getMe(payload.userId);
    req.user = user;

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Role-Based Access Control Middleware
 */
export function requireRole(...allowedRoles: Array<'farmer' | 'officer' | 'admin'>) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new Unauthorized('Authentication required', 'UNAUTHORIZED'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(new Forbidden('Insufficient permissions', 'FORBIDDEN'));
    }

    next();
  };
}

/**
 * Plot Authorization Middleware
 * Enforces plot access boundaries and attaches plotAccess metadata to req.
 * Returns 404 on any unauthorized access to mask resource existence.
 */
export function authorizePlot(requiredScope: ShareScope = 'view_only') {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new NotFound('Resource not found');
      }

      const plotId = req.params.plotId || req.params.id;
      if (!plotId) {
        throw new NotFound('Resource not found');
      }

      const access = await authzService.assertPlotAccess(req.user, plotId, requiredScope);
      req.plotAccess = access;

      next();
    } catch (error) {
      next(error);
    }
  };
}
