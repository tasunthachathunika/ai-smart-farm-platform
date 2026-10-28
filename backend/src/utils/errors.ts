export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

/**
 * Base Application Error
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: unknown;
  public readonly isOperational: boolean;

  constructor(statusCode: number, code: string, message: string, details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;

    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * 404 Not Found Error
 */
export class NotFound extends AppError {
  constructor(message = 'Resource not found', code = 'NOT_FOUND', details?: unknown) {
    super(404, code, message, details);
  }
}
export const NotFoundError = NotFound;

/**
 * 403 Forbidden Error
 */
export class Forbidden extends AppError {
  constructor(message = 'Access forbidden', code = 'FORBIDDEN', details?: unknown) {
    super(403, code, message, details);
  }
}
export const ForbiddenError = Forbidden;

/**
 * 401 Unauthorized Error
 */
export class Unauthorized extends AppError {
  constructor(message = 'Authentication required', code = 'UNAUTHORIZED', details?: unknown) {
    super(401, code, message, details);
  }
}
export const UnauthorizedError = Unauthorized;

/**
 * 400 Validation Error
 */
export class ValidationError extends AppError {
  constructor(message = 'Validation failed', details?: unknown, code = 'VALIDATION_ERROR') {
    super(400, code, message, details);
  }
}

/**
 * 503 Service Unavailable Error
 */
export class ServiceUnavailable extends AppError {
  constructor(
    message = 'Service temporarily unavailable',
    code = 'SERVICE_UNAVAILABLE',
    details?: unknown,
  ) {
    super(503, code, message, details);
  }
}
