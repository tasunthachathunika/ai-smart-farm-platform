import pino from 'pino';
import pinoHttp from 'pino-http';
import { env } from '../config/env';

/**
 * Redaction paths conforming to AGENTS.md Rule 6 and user specifications:
 * (password, token, cookie, gps, notes).
 */
export const redactionPaths = [
  // Passwords
  'password',
  '*.password',
  '*.*.password',
  'body.password',
  'req.body.password',

  // Tokens & Authorization
  'token',
  '*.token',
  '*.*.token',
  'body.token',
  'req.body.token',
  'headers.authorization',
  'req.headers.authorization',

  // Cookies
  'cookie',
  '*.cookie',
  '*.*.cookie',
  'headers.cookie',
  'req.headers.cookie',

  // GPS coordinates & raw ciphertext / IV / tag
  'gps',
  '*.gps',
  '*.*.gps',
  'latitude',
  '*.latitude',
  'longitude',
  '*.longitude',
  'encrypted_gps',
  '*.encrypted_gps',
  'gps_iv',
  '*.gps_iv',
  'gps_auth_tag',
  '*.gps_auth_tag',
  'body.gps',
  'req.body.gps',
  'body.latitude',
  'req.body.latitude',
  'body.longitude',
  'req.body.longitude',

  // Private farm-record notes & text
  'notes',
  '*.notes',
  '*.*.notes',
  'body.notes',
  'req.body.notes',
];

export const logger = pino({
  level: env.NODE_ENV === 'test' ? 'silent' : 'info',
  redact: {
    paths: redactionPaths,
    censor: '[REDACTED]',
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

/**
 * Express HTTP logger middleware using pino-http
 */
export const httpLogger = pinoHttp({
  logger,
  genReqId: (req) => {
    return (req.headers['x-request-id'] as string) || req.id || 'anonymous';
  },
  customLogLevel: (_req, res, err) => {
    if (res.statusCode >= 500 || err) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },
  autoLogging: {
    ignore: (req) => {
      // Don't flood logs with periodic health check polling unless error occurs
      return req.url === '/api/health';
    },
  },
});
