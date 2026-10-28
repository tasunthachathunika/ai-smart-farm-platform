import request from 'supertest';
import { app } from '../src/app';
import { env } from '../src/config/env';

describe('API Documentation & Swagger UI Endpoint Suite', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('GET /api/docs', () => {
    it('serves Swagger UI HTML when SWAGGER_ENABLED is true', async () => {
      const res = await request(app).get('/api/docs/');

      expect(res.status).toBe(200);
      expect(res.text).toContain('Goviya Plus API Documentation');
      expect(res.text).toContain('swagger-ui');
    });

    it('redirects /api/docs to /api/docs/ cleanly', async () => {
      const res = await request(app).get('/api/docs');

      // swaggerUi middleware issues 301 to /api/docs/
      expect([200, 301, 302]).toContain(res.status);
    });

    it('serves OpenAPI 3.0.3 spec as JSON via GET /api/docs/openapi.json', async () => {
      const res = await request(app).get('/api/docs/openapi.json');

      expect(res.status).toBe(200);
      expect(res.body.openapi).toBe('3.0.3');
      expect(res.body.info.title).toBe('Goviya Plus API');
      expect(res.body.paths).toBeDefined();
      expect(Object.keys(res.body.paths).length).toBeGreaterThan(30);
      expect(res.body.tags).toBeDefined();
      expect(res.body.tags.map((t: { name: string }) => t.name)).toContain('Fields & Plots');
      expect(res.body.tags.map((t: { name: string }) => t.name)).toContain('Crop Cycles');
      expect(res.body.tags.map((t: { name: string }) => t.name)).toContain('Activity Logs');
      expect(res.body.tags.map((t: { name: string }) => t.name)).toContain('Inputs');
      expect(res.body.tags.map((t: { name: string }) => t.name)).toContain('Harvests');
      expect(res.body.tags.map((t: { name: string }) => t.name)).toContain('Photos');
      expect(res.body.tags.map((t: { name: string }) => t.name)).toContain('Weather');
      expect(res.body.tags.map((t: { name: string }) => t.name)).toContain('Sharing');
      expect(res.body.tags.map((t: { name: string }) => t.name)).toContain('Audit');
      expect(res.body.tags.map((t: { name: string }) => t.name)).toContain('Officer');
      expect(res.body.tags.map((t: { name: string }) => t.name)).toContain('Advisory Notes');
      expect(res.body.tags.map((t: { name: string }) => t.name)).toContain('AI');
      expect(res.body.tags.map((t: { name: string }) => t.name)).toContain('Admin');
      expect(res.body.tags.map((t: { name: string }) => t.name)).toContain('Health');
    });

    it('serves OpenAPI 3.0.3 spec as YAML via GET /api/docs/openapi.yaml', async () => {
      const res = await request(app).get('/api/docs/openapi.yaml');

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('yaml');
      expect(res.text).toContain('openapi: 3.0.3');
      expect(res.text).toContain('title: Goviya Plus API');
    });

    it('returns 404 with standard error format when SWAGGER_ENABLED is false (e.g. production default)', async () => {
      const originalSwaggerEnabled = env.SWAGGER_ENABLED;
      try {
        (env as { SWAGGER_ENABLED: boolean }).SWAGGER_ENABLED = false;

        const res = await request(app).get('/api/docs/');

        expect(res.status).toBe(404);
        expect(res.body.error).toBeDefined();
        expect(res.body.error.code).toBe('NOT_FOUND');
        expect(res.body.error.message).toContain('disabled');
      } finally {
        (env as { SWAGGER_ENABLED: boolean }).SWAGGER_ENABLED = originalSwaggerEnabled;
      }
    });
  });
});

