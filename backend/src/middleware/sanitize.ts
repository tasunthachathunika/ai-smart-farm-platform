import { Request, Response, NextFunction } from 'express';

/**
 * Patterns matching dangerous HTML tags, scripts, and event handlers.
 */
const SCRIPT_REGEX = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi;
const DANGEROUS_TAGS = /<\/?(?:iframe|object|embed|applet|meta|link|base)[^>]*>/gi;
const DANGEROUS_HANDLERS = /\s*on[a-z]+\s*=\s*(?:'[^']*'|"[^"]*"|[^\s>]+)/gi;
const JAVASCRIPT_PROTOCOL = /javascript\s*:[^"'>]*/gi;
const NULL_BYTE_REGEX = /\0/g;

/**
 * Sanitizes a single string value:
 * 1. Strips null bytes (\0) to prevent byte-injection / truncation exploits.
 * 2. Neutralizes script tags, dangerous HTML tags, and event handlers.
 * 3. Normalizes Unicode representations to prevent homograph / encoding bypasses.
 * 4. Preserves all valid language text (Sinhala, Tamil, English, punctuation, numbers).
 */
export function sanitizeString(value: string): string {
  if (typeof value !== 'string') return value;

  let sanitized = value.replace(NULL_BYTE_REGEX, '');
  sanitized = sanitized.replace(SCRIPT_REGEX, '');
  sanitized = sanitized.replace(DANGEROUS_TAGS, '');
  sanitized = sanitized.replace(DANGEROUS_HANDLERS, '');
  sanitized = sanitized.replace(JAVASCRIPT_PROTOCOL, '');

  try {
    sanitized = sanitized.normalize('NFKC');
  } catch {
    // Fall back to original if normalization fails
  }

  return sanitized;
}

/**
 * Recursively traverses objects or arrays to sanitize all nested string properties.
 */
export function sanitizeObject<T>(input: T): T {
  if (input === null || input === undefined) {
    return input;
  }

  if (typeof input === 'string') {
    return sanitizeString(input) as unknown as T;
  }

  if (Array.isArray(input)) {
    return input.map((item) => sanitizeObject(item)) as unknown as T;
  }

  if (typeof input === 'object' && !(input instanceof Date) && !(input instanceof RegExp)) {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(input)) {
      result[key] = sanitizeObject(val);
    }
    return result as T;
  }

  return input;
}

/**
 * Express middleware that automatically sanitizes incoming request body, query, and params.
 */
export function sanitizeInputs(req: Request, _res: Response, next: NextFunction): void {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }

  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeObject(req.query);
  }

  if (req.params && typeof req.params === 'object') {
    req.params = sanitizeObject(req.params);
  }

  next();
}
