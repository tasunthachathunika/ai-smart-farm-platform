import request from 'supertest';
import { app } from '../src/app';
import { pool } from '../src/db';
import { aiService, STATUTORY_AI_DISCLAIMER } from '../src/services/ai.service';
import { mockLLMProvider } from '../src/services/ai/mockProvider';
import { createAccessToken } from '../src/utils/token';
import { authService, UserResponse } from '../src/services/auth.service';
import { aiRateLimiter } from '../src/middleware/rateLimiter';

describe('AI Routes Integration Tests (POST /api/ai/summary & POST /api/ai/visit-prep)', () => {
  const farmerUser: UserResponse = {
    id: 'f1111111-1111-4111-8111-111111111111',
    email: 'test.farmer@goviya.lk',
    fullName: 'Test Farmer',
    phone: '+94770000001',
    role: 'farmer',
    isVerified: true,
    createdAt: new Date().toISOString(),
  };

  const testPlot = {
    id: 'a1111111-1111-4111-8111-111111111111',
    farmer_id: farmerUser.id,
    name: 'Weligepola Paddy Field',
    district: 'Ratnapura',
    area_ha: '1.75',
    soil_type: 'Clay Loam',
    irrigation_source: 'Stream',
  };

  let validAuthCookie: string;
  let validAuthHeader: string;

  beforeAll(() => {
    const token = createAccessToken({
      userId: farmerUser.id,
      role: farmerUser.role,
      email: farmerUser.email,
    });
    validAuthCookie = `accessToken=${token}`;
    validAuthHeader = `Bearer ${token}`;
  });

  beforeEach(() => {
    mockLLMProvider.reset();
    aiRateLimiter.reset();
    aiService.setProvider(mockLLMProvider);

    // Mock authService.getMe
    jest.spyOn(authService, 'getMe').mockImplementation(async (userId: string) => {
      if (userId === farmerUser.id) return farmerUser;
      throw new Error('User not found in test mock');
    });

    // Mock database pool.query for plot, cycles, logs, and weather
    jest.spyOn(pool, 'query').mockImplementation(async (text: any, params?: any): Promise<any> => {
      const q = typeof text === 'string' ? text : text.text;

      // Plot ownership query
      if (q.includes('FROM plots') && q.includes('id = $1')) {
        return {
          rows: [
            {
              id: testPlot.id,
              farmer_id: testPlot.farmer_id,
              name: testPlot.name,
              district: testPlot.district,
              area_ha: testPlot.area_ha,
              soil_type: testPlot.soil_type,
              irrigation_source: testPlot.irrigation_source,
            },
          ],
          rowCount: 1,
        };
      }

      // Crop cycles
      if (q.includes('FROM crop_cycles')) {
        return {
          rows: [
            {
              id: 'c1111111-1111-4111-8111-111111111111',
              crop_name: 'Paddy Bg 352',
              variety: 'Bg 352',
              start_date: '2026-09-01',
              end_date: null,
              status: 'active',
              estimated_yield_kg: '4500.00',
            },
          ],
          rowCount: 1,
        };
      }

      // Farm logs
      if (q.includes('FROM farm_logs')) {
        return {
          rows: [
            {
              id: 'l1111111-1111-4111-8111-111111111111',
              log_type: 'irrigation',
              log_date: '2026-10-15',
              notes: 'Water level maintained at 5cm after weeding.',
            },
          ],
          rowCount: 1,
        };
      }

      // Inputs
      if (q.includes('FROM inputs')) {
        return {
          rows: [
            {
              id: 'i1111111-1111-4111-8111-111111111111',
              input_type: 'organic',
              name: 'Compost tea',
              quantity: '50.00',
              unit: 'l',
              application_date: '2026-09-20',
            },
          ],
          rowCount: 1,
        };
      }

      // Harvests
      if (q.includes('FROM harvests')) {
        return { rows: [], rowCount: 0 };
      }

      // Advisory notes
      if (q.includes('FROM advisory_notes')) {
        return { rows: [], rowCount: 0 };
      }

      // Weather data
      if (q.includes('FROM weather_data')) {
        return {
          rows: [
            {
              data: {
                current: {
                  temperature_2m: 29.5,
                  relative_humidity_2m: 78,
                  weather_code: 61,
                  precipitation: 2.5,
                },
              },
              fetched_at: new Date().toISOString(),
            },
          ],
          rowCount: 1,
        };
      }

      // Insert into ai_analyses
      if (q.includes('INSERT INTO ai_analyses')) {
        return {
          rows: [{ id: 'a1111111-1111-4111-8111-111111111111' }],
          rowCount: 1,
        };
      }

      // Audit logs
      if (q.includes('INSERT INTO audit_logs')) {
        return {
          rows: [{ id: 'au111111-1111-4111-8111-111111111111' }],
          rowCount: 1,
        };
      }

      return { rows: [], rowCount: 0 };
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('POST /api/ai/summary', () => {
    it('returns 200 OK with records summary and statutory disclaimer for authorized farmer', async () => {
      const response = await request(app)
        .post('/api/ai/summary')
        .set('Cookie', [validAuthCookie])
        .set('Authorization', validAuthHeader)
        .send({
          plotId: testPlot.id,
          userPrompt: 'Summarize recent water management activities',
          customTopic: 'Soil moisture levels',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('analysisId');
      expect(response.body.plotId).toBe(testPlot.id);
      expect(response.body.analysisType).toBe('summary');
      expect(response.body.data).toHaveProperty('summary');
      expect(response.body.data).toHaveProperty('keyObservations');
      expect(response.body.data).toHaveProperty('suggestedOfficerQuestions');
      expect(response.body.disclaimer).toBe(STATUTORY_AI_DISCLAIMER);
    });

    it('returns 400 Bad Request on validation error (invalid UUID)', async () => {
      const response = await request(app)
        .post('/api/ai/summary')
        .set('Cookie', [validAuthCookie])
        .set('Authorization', validAuthHeader)
        .send({
          plotId: 'invalid-non-uuid',
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.details).toBeDefined();
    });

    it('returns 400 Bad Request on missing plotId in body', async () => {
      const response = await request(app)
        .post('/api/ai/summary')
        .set('Cookie', [validAuthCookie])
        .set('Authorization', validAuthHeader)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns 401 Unauthorized when request lacks authentication token', async () => {
      const response = await request(app)
        .post('/api/ai/summary')
        .send({
          plotId: testPlot.id,
        });

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });

    it('returns 400 Safety Refusal when user asks for chemical dosage or pesticide prescription', async () => {
      const response = await request(app)
        .post('/api/ai/summary')
        .set('Cookie', [validAuthCookie])
        .set('Authorization', validAuthHeader)
        .send({
          plotId: testPlot.id,
          userPrompt: 'What dosage of Roundup should I spray per hectare?',
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.message).toMatch(/chemical dosages|cannot be processed/i);
      expect(mockLLMProvider.callCount).toBe(0); // Guardrail must block LLM invocation
    });
  });

  describe('POST /api/ai/visit-prep', () => {
    it('returns 200 OK with visit preparation briefing, focus areas, custom topic, and disclaimer', async () => {
      const response = await request(app)
        .post('/api/ai/visit-prep')
        .set('Cookie', [validAuthCookie])
        .set('Authorization', validAuthHeader)
        .send({
          plotId: testPlot.id,
          focusAreas: ['Crop Health', 'Water Management', 'Pest Scouting'],
          customTopic: 'Sluice gate drainage',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('analysisId');
      expect(response.body.plotId).toBe(testPlot.id);
      expect(response.body.analysisType).toBe('visit_prep');
      expect(response.body.data).toHaveProperty('purpose');
      expect(response.body.data).toHaveProperty('timelineSummary');
      expect(response.body.data).toHaveProperty('discussionQuestions');
      expect(response.body.data).toHaveProperty('inspectionsRecommended');
      expect(response.body.disclaimer).toBe(STATUTORY_AI_DISCLAIMER);
    });

    it('returns 400 Bad Request on validation error (invalid UUID)', async () => {
      const response = await request(app)
        .post('/api/ai/visit-prep')
        .set('Cookie', [validAuthCookie])
        .set('Authorization', validAuthHeader)
        .send({
          plotId: 'not-a-uuid',
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns 401 Unauthorized when unauthenticated', async () => {
      const response = await request(app)
        .post('/api/ai/visit-prep')
        .send({
          plotId: testPlot.id,
        });

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });

    it('returns 400 Safety Refusal when focus areas request chemical pesticide recommendation', async () => {
      const response = await request(app)
        .post('/api/ai/visit-prep')
        .set('Cookie', [validAuthCookie])
        .set('Authorization', validAuthHeader)
        .send({
          plotId: testPlot.id,
          focusAreas: ['recommend a pesticide for brown planthopper'],
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(mockLLMProvider.callCount).toBe(0);
    });
  });
});
