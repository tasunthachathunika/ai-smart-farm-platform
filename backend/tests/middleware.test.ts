import express, { Request, Response } from 'express';
import request from 'supertest';
import { z } from 'zod';
import { requestId } from '../src/middleware/requestId';
import { errorHandler } from '../src/middleware/errorHandler';
import { validate, validateBody } from '../src/validators';
import { NotFound, Forbidden, Unauthorized, ValidationError, AppError } from '../src/utils/errors';
import { requireRole } from '../src/middleware/auth';

describe('Middleware Suite', () => {
  describe('Request-ID Middleware', () => {
    const testApp = express();
    testApp.use(requestId);
    testApp.get('/test-id', (req: Request, res: Response) => {
      res.json({ id: req.id });
    });

    it('should generate a UUID if X-Request-Id header is not provided', async () => {
      const res = await request(testApp).get('/test-id');

      expect(res.status).toBe(200);
      expect(res.headers['x-request-id']).toBeDefined();
      expect(res.body.id).toBe(res.headers['x-request-id']);
      expect(res.body.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      );
    });

    it('should preserve existing X-Request-Id header if provided by client', async () => {
      const clientReqId = 'custom-correlation-id-12345';
      const res = await request(testApp).get('/test-id').set('X-Request-Id', clientReqId);

      expect(res.status).toBe(200);
      expect(res.headers['x-request-id']).toBe(clientReqId);
      expect(res.body.id).toBe(clientReqId);
    });
  });

  describe('Generic Validate Middleware', () => {
    const testApp = express();
    testApp.use(express.json());

    const bodySchema = z.object({
      cropName: z.string().min(2),
      areaHa: z.number().positive(),
    });

    const querySchema = z.object({
      district: z.string().min(1),
    });

    const paramsSchema = z.object({
      plotId: z.string().uuid(),
    });

    // Multi-target route
    testApp.post(
      '/plots/:plotId/crops',
      validate({
        body: bodySchema,
        query: querySchema,
        params: paramsSchema,
      }),
      (req: Request, res: Response) => {
        res.json({
          body: req.body,
          query: req.query,
          params: req.params,
        });
      },
    );

    // Single target route
    testApp.post(
      '/simple',
      validateBody(z.object({ name: z.string() })),
      (req: Request, res: Response) => {
        res.json(req.body);
      },
    );

    testApp.use(errorHandler);

    it('should pass validation when body, query, and params are valid', async () => {
      const validUuid = '123e4567-e89b-12d3-a456-426614174000';
      const res = await request(testApp)
        .post(`/plots/${validUuid}/crops?district=Kurunegala`)
        .send({
          cropName: 'Bg 358 White Samba',
          areaHa: 2.5,
        });

      expect(res.status).toBe(200);
      expect(res.body.body.cropName).toBe('Bg 358 White Samba');
      expect(res.body.query.district).toBe('Kurunegala');
      expect(res.body.params.plotId).toBe(validUuid);
    });

    it('should return 400 with details when body input fails validation', async () => {
      const validUuid = '123e4567-e89b-12d3-a456-426614174000';
      const res = await request(testApp)
        .post(`/plots/${validUuid}/crops?district=Kurunegala`)
        .send({
          cropName: 'A', // too short
          areaHa: -1, // not positive
        });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.message).toBe('Invalid request input');
      expect(Array.isArray(res.body.error.details)).toBe(true);
      expect(res.body.error.details.length).toBeGreaterThanOrEqual(2);
    });

    it('should return 400 when params fail validation', async () => {
      const res = await request(testApp).post('/plots/invalid-uuid/crops?district=Kandy').send({
        cropName: 'Tomato',
        areaHa: 1.0,
      });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(JSON.stringify(res.body.error.details)).toContain('plotId');
    });
  });

  describe('Central Error Handler & Custom Error Classes', () => {
    const testApp = express();
    testApp.use(requestId);

    testApp.get('/throw-not-found', () => {
      throw new NotFound('Plot not found');
    });

    testApp.get('/throw-forbidden', () => {
      throw new Forbidden('You do not have permission to view this plot');
    });

    testApp.get('/throw-unauthorized', () => {
      throw new Unauthorized('Session expired');
    });

    testApp.get('/throw-validation', () => {
      throw new ValidationError('Invalid plot boundary', [
        { field: 'boundary', message: 'Invalid polygon' },
      ]);
    });

    testApp.get('/throw-custom-app-error', () => {
      throw new AppError(409, 'CONFLICT', 'Resource already exists');
    });

    testApp.get('/throw-unexpected', () => {
      throw new Error('Database unexpected failure');
    });

    testApp.use(errorHandler);

    it('should handle NotFound error with 404', async () => {
      const res = await request(testApp).get('/throw-not-found');

      expect(res.status).toBe(404);
      expect(res.body).toEqual({
        error: {
          code: 'NOT_FOUND',
          message: 'Plot not found',
        },
      });
    });

    it('should handle Forbidden error with 403', async () => {
      const res = await request(testApp).get('/throw-forbidden');

      expect(res.status).toBe(403);
      expect(res.body).toEqual({
        error: {
          code: 'FORBIDDEN',
          message: 'You do not have permission to view this plot',
        },
      });
    });

    it('should handle Unauthorized error with 401', async () => {
      const res = await request(testApp).get('/throw-unauthorized');

      expect(res.status).toBe(401);
      expect(res.body).toEqual({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Session expired',
        },
      });
    });

    it('should handle ValidationError with 400 and details', async () => {
      const res = await request(testApp).get('/throw-validation');

      expect(res.status).toBe(400);
      expect(res.body).toEqual({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid plot boundary',
          details: [{ field: 'boundary', message: 'Invalid polygon' }],
        },
      });
    });

    it('should handle custom AppError with specified code and status', async () => {
      const res = await request(testApp).get('/throw-custom-app-error');

      expect(res.status).toBe(409);
      expect(res.body).toEqual({
        error: {
          code: 'CONFLICT',
          message: 'Resource already exists',
        },
      });
    });

    it('should mask unexpected errors with 500 INTERNAL_SERVER_ERROR', async () => {
      const res = await request(testApp).get('/throw-unexpected');

      expect(res.status).toBe(500);
      expect(res.body).toEqual({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An internal server error occurred',
        },
      });
      // Ensure stack trace or internal error message is never leaked
      expect(JSON.stringify(res.body)).not.toContain('Database unexpected failure');
    });
  });

  describe('RBAC Middleware (requireRole)', () => {
    const rbacApp = express();

    rbacApp.get(
      '/admin-only',
      (req, _res, next) => {
        req.user = {
          id: 'user-1',
          email: 'officer@goviya.lk',
          fullName: 'Officer',
          phone: null,
          role: 'officer',
          isVerified: true,
          createdAt: new Date().toISOString(),
        };
        next();
      },
      requireRole('admin'),
      (_req, res) => {
        res.json({ ok: true });
      },
    );

    rbacApp.get(
      '/officer-allowed',
      (req, _res, next) => {
        req.user = {
          id: 'user-1',
          email: 'officer@goviya.lk',
          fullName: 'Officer',
          phone: null,
          role: 'officer',
          isVerified: true,
          createdAt: new Date().toISOString(),
        };
        next();
      },
      requireRole('officer', 'farmer'),
      (_req, res) => {
        res.json({ ok: true });
      },
    );

    rbacApp.use(errorHandler);

    it('should return 403 when user does not have required role', async () => {
      const res = await request(rbacApp).get('/admin-only');
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('should proceed when user has an allowed role', async () => {
      const res = await request(rbacApp).get('/officer-allowed');
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
    });
  });
});
