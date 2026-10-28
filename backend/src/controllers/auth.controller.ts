import { Request, Response, NextFunction, CookieOptions } from 'express';
import { authService } from '../services/auth.service';
import { env } from '../config/env';
import { ACCESS_TOKEN_MAX_AGE_MS, REFRESH_TOKEN_MAX_AGE_MS } from '../utils/token';
import { setCsrfCookie, clearCsrfCookie } from '../middleware/csrf';

const isProduction = env.NODE_ENV === 'production';

export const baseCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: 'lax',
  path: '/',
};

export function setAuthCookies(res: Response, accessToken: string, refreshToken: string): void {
  res.cookie('accessToken', accessToken, {
    ...baseCookieOptions,
    maxAge: ACCESS_TOKEN_MAX_AGE_MS,
  });

  res.cookie('refreshToken', refreshToken, {
    ...baseCookieOptions,
    maxAge: REFRESH_TOKEN_MAX_AGE_MS,
  });

  // Set CSRF token cookie readable by client
  setCsrfCookie(res);
}

export function clearAuthCookies(res: Response): void {
  res.clearCookie('accessToken', baseCookieOptions);
  res.clearCookie('refreshToken', baseCookieOptions);
  clearCsrfCookie(res);
}

export class AuthController {
  public register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await authService.register(req.body);
      setAuthCookies(res, result.accessToken, result.refreshToken);
      res.status(201).json({ user: result.user });
    } catch (error) {
      next(error);
    }
  };

  public login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await authService.login(req.body, {
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });
      setAuthCookies(res, result.accessToken, result.refreshToken);
      res.status(200).json({ user: result.user });
    } catch (error) {
      next(error);
    }
  };

  public refresh = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const oldRefreshToken = req.cookies?.refreshToken || req.body?.refreshToken;

      const result = await authService.refresh(oldRefreshToken);
      setAuthCookies(res, result.accessToken, result.refreshToken);
      res.status(200).json({ user: result.user });
    } catch (error) {
      next(error);
    }
  };

  public logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
      await authService.logout(req.user?.id, refreshToken, {
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });
      clearAuthCookies(res);
      res.status(200).json({ message: 'Successfully logged out' });
    } catch (error) {
      next(error);
    }
  };

  public getMe = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      res.status(200).json({ user: req.user });
    } catch (error) {
      next(error);
    }
  };

  public getCsrfToken = (req: Request, res: Response): void => {
    const token = setCsrfCookie(res);
    res.status(200).json({ csrfToken: token });
  };
}

export const authController = new AuthController();
