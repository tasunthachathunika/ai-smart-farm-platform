import request from 'supertest';
import { app } from '../src/app';

describe('GET /api/health', () => {
  it('should return 200 OK with status "ok" and uptime', async () => {
    const response = await request(app).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('status', 'ok');
    expect(response.body).toHaveProperty('uptime');
    expect(typeof response.body.uptime).toBe('number');
    expect(response.body).toHaveProperty('timestamp');
    expect(new Date(response.body.timestamp).getTime()).not.toBeNaN();
  });

  it('should return 404 for undefined routes with consistent error format', async () => {
    const response = await request(app).get('/api/non-existent-route');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      error: {
        code: 'NOT_FOUND',
        message: 'Resource not found',
      },
    });
  });
});
