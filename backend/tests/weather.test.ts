import request from 'supertest';
import { app } from '../src/app';
import { pool } from '../src/db';
import {
  weatherService,
  DISTRICT_COORDINATES,
  getDistrictCoordinates,
} from '../src/services/weather.service';
import { createAccessToken } from '../src/utils/token';
import { authService, UserResponse } from '../src/services/auth.service';
import { Unauthorized } from '../src/utils/errors';

describe('Weather Service & District-Level Forecast Suite', () => {
  const farmerA: UserResponse = {
    id: '11111111-1111-4111-8111-111111111111',
    email: 'farmer.a@goviya.lk',
    fullName: 'Farmer A',
    phone: '+94771111111',
    role: 'farmer',
    isVerified: true,
    createdAt: new Date().toISOString(),
  };

  const farmerB: UserResponse = {
    id: '22222222-2222-4222-8222-222222222222',
    email: 'farmer.b@goviya.lk',
    fullName: 'Farmer B',
    phone: '+94772222222',
    role: 'farmer',
    isVerified: true,
    createdAt: new Date().toISOString(),
  };

  const verifiedOfficer: UserResponse = {
    id: '33333333-3333-4333-8333-333333333333',
    email: 'officer@goviya.lk',
    fullName: 'Officer Kamal',
    phone: '+94773333333',
    role: 'officer',
    isVerified: true,
    createdAt: new Date().toISOString(),
  };

  const adminUser: UserResponse = {
    id: '44444444-4444-4444-8444-444444444444',
    email: 'admin@goviya.lk',
    fullName: 'Admin User',
    phone: '+94774444444',
    role: 'admin',
    isVerified: true,
    createdAt: new Date().toISOString(),
  };

  const plotA = {
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    farmer_id: farmerA.id,
    name: 'Anuradhapura Paddy Field',
    district: 'Anuradhapura',
    encrypted_gps: 'sensitive-encrypted-gps-data-must-never-be-sent-to-api',
  };

  let farmerAToken: string;
  let farmerBToken: string;
  let officerToken: string;
  let adminToken: string;

  const mockOpenMeteoPayload = {
    latitude: 8.31,
    longitude: 80.4,
    current: {
      time: '2026-10-27T10:00',
      temperature_2m: 31.5,
      relative_humidity_2m: 68,
      apparent_temperature: 36.2,
      is_day: 1,
      precipitation: 0.0,
      rain: 0.0,
      weather_code: 1,
      wind_speed_10m: 14.2,
      wind_direction_10m: 180,
    },
    daily: {
      time: ['2026-10-27', '2026-10-28'],
      weather_code: [1, 61],
      temperature_2m_max: [33.0, 31.0],
      temperature_2m_min: [24.0, 23.5],
      precipitation_sum: [0.0, 4.2],
    },
  };

  beforeAll(() => {
    farmerAToken = createAccessToken({
      userId: farmerA.id,
      role: farmerA.role,
      email: farmerA.email,
    });
    farmerBToken = createAccessToken({
      userId: farmerB.id,
      role: farmerB.role,
      email: farmerB.email,
    });
    officerToken = createAccessToken({
      userId: verifiedOfficer.id,
      role: verifiedOfficer.role,
      email: verifiedOfficer.email,
    });
    adminToken = createAccessToken({
      userId: adminUser.id,
      role: adminUser.role,
      email: adminUser.email,
    });
  });

  beforeEach(() => {
    jest.spyOn(authService, 'getMe').mockImplementation(async (userId: string) => {
      if (userId === farmerA.id) return farmerA;
      if (userId === farmerB.id) return farmerB;
      if (userId === verifiedOfficer.id) return verifiedOfficer;
      if (userId === adminUser.id) return adminUser;
      throw new Unauthorized('User not found');
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('1. District Lookup Table & GPS Privacy Protection', () => {
    it('contains all 25 administrative districts of Sri Lanka', () => {
      const expectedDistricts = [
        'ampara',
        'anuradhapura',
        'badulla',
        'batticaloa',
        'colombo',
        'galle',
        'gampaha',
        'hambantota',
        'jaffna',
        'kalutara',
        'kandy',
        'kegalle',
        'kilinochchi',
        'kurunegala',
        'mannar',
        'matale',
        'matara',
        'monaragala',
        'mullaitivu',
        'nuwara_eliya',
        'polonnaruwa',
        'puttalam',
        'ratnapura',
        'trincomalee',
        'vavuniya',
      ];

      for (const d of expectedDistricts) {
        expect(DISTRICT_COORDINATES[d]).toBeDefined();
        expect(DISTRICT_COORDINATES[d].latitude).toBeGreaterThan(5);
        expect(DISTRICT_COORDINATES[d].latitude).toBeLessThan(10);
        expect(DISTRICT_COORDINATES[d].longitude).toBeGreaterThan(79);
        expect(DISTRICT_COORDINATES[d].longitude).toBeLessThan(82);
      }
    });

    it('resolves district coordinates regardless of casing or whitespace', () => {
      const coords1 = getDistrictCoordinates('Anuradhapura');
      const coords2 = getDistrictCoordinates('  anuradhapura  ');
      const coords3 = getDistrictCoordinates('Nuwara Eliya');
      const coords4 = getDistrictCoordinates('nuwara-eliya');

      expect(coords1.latitude).toBeCloseTo(8.3114, 2);
      expect(coords2.latitude).toBe(coords1.latitude);
      expect(coords3.latitude).toBeCloseTo(6.9497, 2);
      expect(coords4.latitude).toBe(coords3.latitude);
    });

    it('falls back safely to Sri Lanka center if district is unmapped', () => {
      const coords = getDistrictCoordinates('Unknown-District-XYZ');
      expect(coords.latitude).toBeCloseTo(7.8731, 2);
      expect(coords.longitude).toBeCloseTo(80.7718, 2);
    });
  });

  describe('2. Weather API Live Fetch & Caching in weather_data', () => {
    it('fetches live weather from Open-Meteo, saves to weather_data cache, and returns lastUpdated', async () => {
      let savedToDb = false;

      // Mock database queries
      jest.spyOn(pool, 'query').mockImplementation(async (sql: unknown, params?: unknown) => {
        const queryText = String(sql);
        const p = (params || []) as unknown[];

        // Farmer plot access check
        if (queryText.includes('FROM plots WHERE id = $1')) {
          return { rows: [plotA], rowCount: 1 } as never;
        }

        // Cache lookup: no cache exists
        if (queryText.includes('FROM weather_data')) {
          return { rows: [], rowCount: 0 } as never;
        }

        // Cache insert
        if (queryText.includes('INSERT INTO weather_data')) {
          savedToDb = true;
          expect(p[0]).toBe('Anuradhapura');
          return {
            rows: [{ id: 'cache-111', fetched_at: new Date('2026-10-27T10:00:00Z') }],
            rowCount: 1,
          } as never;
        }

        return { rows: [], rowCount: 0 } as never;
      });

      // Mock Open-Meteo live API fetch
      const fetchSpy = jest
        .spyOn(weatherService, 'fetchOpenMeteo')
        .mockResolvedValueOnce(mockOpenMeteoPayload);

      const response = await request(app)
        .get(`/api/plots/${plotA.id}/weather`)
        .set('Cookie', [`accessToken=${farmerAToken}`]);

      expect(response.status).toBe(200);
      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(savedToDb).toBe(true);

      const data = response.body.data;
      expect(data.plotId).toBe(plotA.id);
      expect(data.district).toBe('Anuradhapura');
      expect(data.coordinates.latitude).toBeCloseTo(8.3114, 2);
      expect(data.current.temperature).toBe(31.5);
      expect(data.current.weatherDescription).toBe('Mainly clear');
      expect(data.isCached).toBe(false);
      expect(data.isFallback).toBe(false);
      expect(data.lastUpdated).toBeDefined();
    });

    it('returns fresh cached weather data without calling external API', async () => {
      const recentTimestamp = new Date(Date.now() - 5 * 60 * 1000); // 5 minutes old (< 30 min TTL)

      jest.spyOn(pool, 'query').mockImplementation(async (sql: unknown) => {
        const queryText = String(sql);

        if (queryText.includes('FROM plots WHERE id = $1')) {
          return { rows: [plotA], rowCount: 1 } as never;
        }

        if (queryText.includes('FROM weather_data')) {
          return {
            rows: [
              {
                id: 'cache-existing',
                district: 'Anuradhapura',
                data: mockOpenMeteoPayload,
                fetched_at: recentTimestamp,
              },
            ],
            rowCount: 1,
          } as never;
        }

        return { rows: [], rowCount: 0 } as never;
      });

      const fetchSpy = jest.spyOn(weatherService, 'fetchOpenMeteo');

      const response = await request(app)
        .get(`/api/plots/${plotA.id}/weather`)
        .set('Cookie', [`accessToken=${farmerAToken}`]);

      expect(response.status).toBe(200);
      expect(fetchSpy).not.toHaveBeenCalled(); // Cached result, no external API call!

      const data = response.body.data;
      expect(data.isCached).toBe(true);
      expect(data.isFallback).toBe(false);
      expect(data.current.temperature).toBe(31.5);
      expect(data.lastUpdated).toBe(recentTimestamp.toISOString());
    });
  });

  describe('3. API Failure, Timeout & Fallback to Cache', () => {
    it('falls back to cached copy when Open-Meteo API fails (network error)', async () => {
      const expiredTimestamp = new Date(Date.now() - 45 * 60 * 1000); // 45 minutes old (> 30 min TTL)

      jest.spyOn(pool, 'query').mockImplementation(async (sql: unknown) => {
        const queryText = String(sql);

        if (queryText.includes('FROM plots WHERE id = $1')) {
          return { rows: [plotA], rowCount: 1 } as never;
        }

        if (queryText.includes('FROM weather_data')) {
          return {
            rows: [
              {
                id: 'cache-fallback',
                district: 'Anuradhapura',
                data: mockOpenMeteoPayload,
                fetched_at: expiredTimestamp,
              },
            ],
            rowCount: 1,
          } as never;
        }

        return { rows: [], rowCount: 0 } as never;
      });

      // Simulate API network failure
      jest
        .spyOn(weatherService, 'fetchOpenMeteo')
        .mockRejectedValueOnce(new Error('Fetch failed: network unreachable'));

      const response = await request(app)
        .get(`/api/plots/${plotA.id}/weather`)
        .set('Cookie', [`accessToken=${farmerAToken}`]);

      expect(response.status).toBe(200);

      const data = response.body.data;
      expect(data.isCached).toBe(true);
      expect(data.isFallback).toBe(true); // Fallback active!
      expect(data.current.temperature).toBe(31.5);
      expect(data.lastUpdated).toBe(expiredTimestamp.toISOString());
    });

    it('falls back to cached copy when Open-Meteo API times out', async () => {
      const cachedTimestamp = new Date(Date.now() - 40 * 60 * 1000);

      jest.spyOn(pool, 'query').mockImplementation(async (sql: unknown) => {
        const queryText = String(sql);

        if (queryText.includes('FROM plots WHERE id = $1')) {
          return { rows: [plotA], rowCount: 1 } as never;
        }

        if (queryText.includes('FROM weather_data')) {
          return {
            rows: [
              {
                id: 'cache-fallback-timeout',
                district: 'Anuradhapura',
                data: mockOpenMeteoPayload,
                fetched_at: cachedTimestamp,
              },
            ],
            rowCount: 1,
          } as never;
        }

        return { rows: [], rowCount: 0 } as never;
      });

      // Simulate AbortError on timeout
      const abortError = new Error('The operation was aborted');
      abortError.name = 'AbortError';
      jest.spyOn(weatherService, 'fetchOpenMeteo').mockRejectedValueOnce(abortError);

      const response = await request(app)
        .get(`/api/plots/${plotA.id}/weather`)
        .set('Cookie', [`accessToken=${farmerAToken}`]);

      expect(response.status).toBe(200);
      expect(response.body.data.isFallback).toBe(true);
      expect(response.body.data.lastUpdated).toBe(cachedTimestamp.toISOString());
    });

    it('returns 503 SERVICE_UNAVAILABLE when API fails and no cached copy exists', async () => {
      jest.spyOn(pool, 'query').mockImplementation(async (sql: unknown) => {
        const queryText = String(sql);

        if (queryText.includes('FROM plots WHERE id = $1')) {
          return { rows: [plotA], rowCount: 1 } as never;
        }

        if (queryText.includes('FROM weather_data')) {
          return { rows: [], rowCount: 0 } as never; // No cache
        }

        return { rows: [], rowCount: 0 } as never;
      });

      jest
        .spyOn(weatherService, 'fetchOpenMeteo')
        .mockRejectedValueOnce(new Error('Connection timeout'));

      const response = await request(app)
        .get(`/api/plots/${plotA.id}/weather`)
        .set('Cookie', [`accessToken=${farmerAToken}`]);

      expect(response.status).toBe(503);
      expect(response.body.error.code).toBe('SERVICE_UNAVAILABLE');
      expect(response.body.error.message).toContain('unavailable');
    });
  });

  describe('4. Authorization & Officer Delegation Audit Access Control', () => {
    it('returns 404 when Farmer B attempts to access Farmer A plot weather (IDOR prevention)', async () => {
      jest.spyOn(pool, 'query').mockImplementation(async (sql: unknown) => {
        const queryText = String(sql);
        if (queryText.includes('FROM plots WHERE id = $1')) {
          return { rows: [plotA], rowCount: 1 } as never; // Owned by farmerA, requester is farmerB
        }
        return { rows: [], rowCount: 0 } as never;
      });

      const response = await request(app)
        .get(`/api/plots/${plotA.id}/weather`)
        .set('Cookie', [`accessToken=${farmerBToken}`]);

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });

    it('allows verified officer with active share to view weather and writes audit log', async () => {
      let auditWritten = false;

      jest.spyOn(pool, 'query').mockImplementation(async (sql: unknown) => {
        const queryText = String(sql);
        if (queryText.includes('SELECT is_verified FROM users')) {
          return { rows: [{ is_verified: true }], rowCount: 1 } as never;
        }
        if (queryText.includes('FROM shared_plots sp')) {
          return {
            rows: [
              {
                id: 'share-valid',
                scope: 'view_only',
                expires_at: null,
                revoked_at: null,
              },
            ],
            rowCount: 1,
          } as never;
        }
        if (queryText.includes('FROM plots WHERE id = $1')) {
          return { rows: [plotA], rowCount: 1 } as never;
        }
        if (queryText.includes('FROM weather_data')) {
          return {
            rows: [
              {
                id: 'cache-officer',
                district: 'Anuradhapura',
                data: mockOpenMeteoPayload,
                fetched_at: new Date(),
              },
            ],
            rowCount: 1,
          } as never;
        }
        if (queryText.includes('INSERT INTO audit_logs')) {
          auditWritten = true;
          return { rows: [], rowCount: 1 } as never;
        }
        return { rows: [], rowCount: 0 } as never;
      });

      const response = await request(app)
        .get(`/api/plots/${plotA.id}/weather`)
        .set('Cookie', [`accessToken=${officerToken}`]);

      expect(response.status).toBe(200);
      expect(response.body.data.district).toBe('Anuradhapura');
      expect(auditWritten).toBe(true);
    });

    it('returns 404 when officer share has been revoked', async () => {
      jest.spyOn(pool, 'query').mockImplementation(async (sql: unknown) => {
        const queryText = String(sql);
        if (queryText.includes('SELECT is_verified FROM users')) {
          return { rows: [{ is_verified: true }], rowCount: 1 } as never;
        }
        if (queryText.includes('FROM shared_plots sp')) {
          // Share was revoked, so active check returns empty
          return { rows: [], rowCount: 0 } as never;
        }
        return { rows: [], rowCount: 0 } as never;
      });

      const response = await request(app)
        .get(`/api/plots/${plotA.id}/weather`)
        .set('Cookie', [`accessToken=${officerToken}`]);

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });

    it('returns 404 for admin user trying to access plot weather (Admin privacy boundary)', async () => {
      const response = await request(app)
        .get(`/api/plots/${plotA.id}/weather`)
        .set('Cookie', [`accessToken=${adminToken}`]);

      expect([403, 404]).toContain(response.status);
    });
  });
});
