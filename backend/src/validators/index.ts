import { Request, Response, NextFunction } from 'express';
import { ZodTypeAny, ZodError } from 'zod';
import { ValidationError } from '../utils/errors';

export interface ValidationTargets {
  body?: ZodTypeAny;
  query?: ZodTypeAny;
  params?: ZodTypeAny;
}

/**
 * Helper to format Zod validation errors into a clean array
 */
export function formatZodIssues(error: ZodError): Array<{ field: string; message: string }> {
  return error.errors.map((issue) => ({
    field: issue.path.join('.') || 'root',
    message: issue.message,
  }));
}

/**
 * Generic Request Validation Middleware for body, query, and params.
 *
 * Usage examples:
 * 1. Multi-target: validate({ body: myBodySchema, query: myQuerySchema, params: myParamsSchema })
 * 2. Single target: validate(myBodySchema) // validates body by default
 * 3. Specific target: validate(myQuerySchema, 'query')
 */
export function validate(
  schema: ValidationTargets | ZodTypeAny,
  target: 'body' | 'query' | 'params' = 'body',
) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      // Check if schema is a multi-target object { body?: ..., query?: ..., params?: ... }
      const isMultiTarget =
        typeof schema === 'object' &&
        schema !== null &&
        !('_def' in schema) && // Zod schemas contain _def
        ('body' in schema || 'query' in schema || 'params' in schema);

      if (isMultiTarget) {
        const targets = schema as ValidationTargets;

        if (targets.body) {
          req.body = await targets.body.parseAsync(req.body);
        }
        if (targets.query) {
          req.query = await targets.query.parseAsync(req.query);
        }
        if (targets.params) {
          req.params = await targets.params.parseAsync(req.params);
        }
      } else {
        // Single Zod schema targeting specified part of the request
        const zodSchema = schema as ZodTypeAny;
        if (target === 'body') {
          req.body = await zodSchema.parseAsync(req.body);
        } else if (target === 'query') {
          req.query = await zodSchema.parseAsync(req.query);
        } else if (target === 'params') {
          req.params = await zodSchema.parseAsync(req.params);
        }
      }

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        next(new ValidationError('Invalid request input', formatZodIssues(error)));
      } else {
        next(error);
      }
    }
  };
}

// Convenient aliases
export const validateBody = (schema: ZodTypeAny) => validate(schema, 'body');
export const validateQuery = (schema: ZodTypeAny) => validate(schema, 'query');
export const validateParams = (schema: ZodTypeAny) => validate(schema, 'params');
