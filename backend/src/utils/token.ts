import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { env } from '../config/env';

export interface UserTokenPayload {
  userId: string;
  role: string;
  email: string;
}

/**
 * Access token expires in 15 minutes as requested.
 */
export const ACCESS_TOKEN_EXPIRY = '15m';
export const ACCESS_TOKEN_MAX_AGE_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Refresh token expires in 7 days.
 */
export const REFRESH_TOKEN_EXPIRY_DAYS = 7;
export const REFRESH_TOKEN_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export function createAccessToken(payload: UserTokenPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRY,
  });
}

export function verifyAccessToken(token: string): UserTokenPayload {
  return jwt.verify(token, env.JWT_SECRET) as UserTokenPayload;
}

/**
 * Generate a cryptographically random, high-entropy refresh token string.
 */
export function generateRandomRefreshToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Hash refresh token with SHA-256 before database storage.
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}
