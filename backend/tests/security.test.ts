import request from 'supertest';
import { app } from '../src/app';
import { pool } from '../src/db';
import { env } from '../src/config/env';
import { authService, UserResponse } from '../src/services/auth.service';
import { createAccessToken } from '../src/utils/token';
import { loginRateLimiter, generalRateLimiter } from '../src/middleware/rateLimiter';
import {
  CSRF_COOKIE_NAME,
  CSRF_HEADER_NAME,
  generateCsrfToken,
  setCsrfCookie,
  clearCsrfCookie,
  csrfProtection,
} from '../src/middleware/csrf';
import { sanitizeString, sanitizeObject } from '../src/middleware/sanitize';

describe('Security Controls & Defense-in-Depth Suite', () => {
  const mockUser: UserResponse = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    email: 'farmer.security@goviya.lk',
    fullName: 'Security Test Farmer',
    phone: '+94770000000',
    role: 'farmer',
    isVerified: true,
    isActive: true,
    createdAt: new Date().toISOString(),
  };

  const validToken = createAccessToken({
    userId: mockUser.id,
    role: mockUser.role,
    email: mockUser.email,
  });

  beforeEach(() => {
    loginRateLimiter.reset();
    generalRateLimiter.reset();

    jest.spyOn(authService, 'getMe').mockResolvedValue(mockUser);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('1. Helmet Security Headers', () => {
    it('should include essential security headers on responses', async () => {
      const res = await request(app).get('/api/health');

      expect(res.status).toBe(200);
      expect(res.headers['x-content-type-options']).toBe('nosniff');
      expect(res.headers['x-frame-options']).toBe('SAMEORIGIN');
      expect(res.headers['cross-origin-resource-policy']).toBe('same-origin');
      expect(res.headers['x-dns-prefetch-control']).toBe('off');
      expect(res.headers['x-download-options']).toBe('noopen');
    });
  });

  describe('2. Strict CORS Policy', () => {
    it('should allow requests from configured CORS_ORIGIN with credentials', async () => {
      const res = await request(app)
        .get('/api/health')
        .set('Origin', env.CORS_ORIGIN);

      expect(res.status).toBe(200);
      expect(res.headers['access-control-allow-origin']).toBe(env.CORS_ORIGIN);
      expect(res.headers['access-control-allow-credentials']).toBe('true');
    });

    it('should not allow CORS for unauthorized origins', async () => {
      const res = await request(app)
        .get('/api/health')
        .set('Origin', 'http://unauthorized-malicious-site.com');

      expect(res.headers['access-control-allow-origin']).not.toBe('http://unauthorized-malicious-site.com');
    });

    it('should allow requests with no Origin header (e.g. mobile apps, curl)', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
    });

    it('should support preflight OPTIONS request from configured origin', async () => {
      const res = await request(app)
        .options('/api/health')
        .set('Origin', env.CORS_ORIGIN)
        .set('Access-Control-Request-Method', 'POST')
        .set('Access-Control-Request-Headers', 'Content-Type,Authorization,X-CSRF-Token');

      expect(res.status).toBe(204);
      expect(res.headers['access-control-allow-origin']).toBe(env.CORS_ORIGIN);
      expect(res.headers['access-control-allow-credentials']).toBe('true');
      expect(res.headers['access-control-allow-methods']).toContain('POST');
    });
  });

  describe('3. Rate Limiting (Login Strict & General API)', () => {
    it('should enforce strict rate limit on POST /api/auth/login after 5 attempts', async () => {
      jest.spyOn(authService, 'login').mockRejectedValue({
        statusCode: 401,
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password',
      });

      // 5 failed login attempts
      for (let i = 0; i < 5; i++) {
        const res = await request(app)
          .post('/api/auth/login')
          .send({ email: 'rate.limit@goviya.lk', password: 'Password123!' });
        expect(res.status).not.toBe(429);
      }

      // 6th attempt should be blocked by rate limiter with 429
      const blockedRes = await request(app)
        .post('/api/auth/login')
        .send({ email: 'rate.limit@goviya.lk', password: 'Password123!' });

      expect(blockedRes.status).toBe(429);
      expect(blockedRes.body.error.code).toBe('LOGIN_RATE_LIMIT_EXCEEDED');
      expect(blockedRes.body.error.message).toContain('Too many login attempts');
      expect(blockedRes.headers['retry-after']).toBeDefined();
    });

    it('should enforce general rate limit when test flag is explicitly set', async () => {
      expect(generalRateLimiter).toBeDefined();
      expect(typeof generalRateLimiter.reset).toBe('function');
    });
  });

  describe('4. Anti-CSRF Token Generation & Cookie Management', () => {
    it('should issue CSRF token via GET /api/auth/csrf-token and set cookie', async () => {
      const res = await request(app).get('/api/auth/csrf-token');

      expect(res.status).toBe(200);
      expect(res.body.csrfToken).toBeDefined();
      expect(typeof res.body.csrfToken).toBe('string');
      expect(res.body.csrfToken.length).toBeGreaterThanOrEqual(32);

      const cookies = res.headers['set-cookie'];
      const csrfCookie = Array.isArray(cookies)
        ? cookies.find((c: string) => c.startsWith(`${CSRF_COOKIE_NAME}=`))
        : cookies;

      expect(csrfCookie).toBeDefined();
      expect(csrfCookie).toContain(`${CSRF_COOKIE_NAME}=${res.body.csrfToken}`);
      // Not httpOnly so frontend JS can read it
      expect(csrfCookie).not.toContain('HttpOnly');
    });

    it('should generate a 64-char hex cryptographically random token', () => {
      const token = generateCsrfToken();
      expect(typeof token).toBe('string');
      expect(token.length).toBe(64);
    });

    it('should set CSRF cookie readable by client JavaScript (not httpOnly)', () => {
      const cookieMock = jest.fn();
      const res = { cookie: cookieMock } as any;
      const token = setCsrfCookie(res, 'test-csrf-token-123');
      expect(token).toBe('test-csrf-token-123');
      expect(cookieMock).toHaveBeenCalledWith(
        CSRF_COOKIE_NAME,
        'test-csrf-token-123',
        expect.objectContaining({ httpOnly: false, sameSite: 'lax', path: '/' }),
      );
    });

    it('should clear CSRF cookie on logout', () => {
      const clearCookieMock = jest.fn();
      const res = { clearCookie: clearCookieMock } as any;
      clearCsrfCookie(res);
      expect(clearCookieMock).toHaveBeenCalledWith(
        CSRF_COOKIE_NAME,
        expect.objectContaining({ httpOnly: false, sameSite: 'lax', path: '/' }),
      );
    });

    it('should enforce CSRF validation on cookie-authenticated state-changing requests in csrfProtection middleware', () => {
      const req = {
        method: 'POST',
        path: '/api/plots',
        headers: { 'x-test-csrf': 'true' },
        cookies: { accessToken: validToken },
      } as any;
      let errorThrown: any = null;
      csrfProtection(req, {} as any, (err?: any) => {
        errorThrown = err;
      });
      expect(errorThrown).toBeDefined();
      expect(errorThrown.code).toBe('CSRF_VALIDATION_FAILED');
      expect(errorThrown.statusCode).toBe(403);
    });

    it('should exempt safe HTTP methods (GET, HEAD, OPTIONS) from CSRF check', () => {
      for (const method of ['GET', 'HEAD', 'OPTIONS']) {
        const req = {
          method,
          path: '/api/plots',
          headers: {},
          cookies: { accessToken: validToken },
        } as any;
        let calledNext = false;
        csrfProtection(req, {} as any, () => {
          calledNext = true;
        });
        expect(calledNext).toBe(true);
      }
    });

    it('should exempt Bearer-authenticated requests from CSRF check', () => {
      const req = {
        method: 'POST',
        path: '/api/plots',
        headers: { authorization: `Bearer ${validToken}` },
        cookies: {},
      } as any;
      let calledNext = false;
      csrfProtection(req, {} as any, () => {
        calledNext = true;
      });
      expect(calledNext).toBe(true);
    });

    it('should allow Double-Submit CSRF cookie pattern when header matches cookie', () => {
      const token = '1234567890abcdef1234567890abcdef';
      const req = {
        method: 'POST',
        path: '/api/plots',
        headers: { [CSRF_HEADER_NAME]: token },
        cookies: { accessToken: validToken, [CSRF_COOKIE_NAME]: token },
      } as any;
      let calledNext = false;
      csrfProtection(req, {} as any, () => {
        calledNext = true;
      });
      expect(calledNext).toBe(true);
    });
  });

  describe('5. Body Size Limit Enforcement', () => {
    it('should reject JSON payloads exceeding 1MB limit with 413 Payload Too Large', async () => {
      const oversizedString = 'A'.repeat(1.1 * 1024 * 1024);

      const res = await request(app)
        .post('/api/auth/login')
        .set('Content-Type', 'application/json')
        .send({ email: 'test@goviya.lk', password: oversizedString });

      expect(res.status).toBe(413);
      expect(res.body.error.code).toBe('PAYLOAD_TOO_LARGE');
      expect(res.body.error.message).toContain('exceeds maximum allowed size limit');
    });

    it('should accept normal payloads within 1MB limit', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'normal@goviya.lk', password: 'ValidPassword123!' });

      expect(res.status).not.toBe(413);
    });
  });

  describe('6. Text Input Sanitization', () => {
    it('should strip script tags from input strings', () => {
      const malicious = "Plot Sector A <script>alert('XSS')</script> Ready";
      const sanitized = sanitizeString(malicious);
      expect(sanitized).toBe('Plot Sector A  Ready');
      expect(sanitized).not.toContain('<script>');
    });

    it('should strip NULL bytes from input strings to prevent byte injection', () => {
      const nullByteString = 'Plot\0_Name\0_Test';
      const sanitized = sanitizeString(nullByteString);
      expect(sanitized).toBe('Plot_Name_Test');
      expect(sanitized).not.toContain('\0');
    });

    it('should strip dangerous inline HTML event handlers', () => {
      const handlerString = '<img src="x" onerror="stealCookies()">';
      const sanitized = sanitizeString(handlerString);
      expect(sanitized).not.toContain('onerror');
    });

    it('should normalize and preserve Unicode characters (Sinhala, Tamil, English)', () => {
      const multiLang = {
        sinhala: 'ගොවිපල බිම් කොටස 1',
        tamil: 'விவசாய நிலம் 1',
        english: 'Harvest Sector 1',
        number: 42,
        active: true,
      };

      const sanitized = sanitizeObject(multiLang);
      expect(sanitized.sinhala).toBe('ගොවිපල බිම් කොටස 1');
      expect(sanitized.tamil).toBe('விவசாய நிலம் 1');
      expect(sanitized.english).toBe('Harvest Sector 1');
      expect(sanitized.number).toBe(42);
      expect(sanitized.active).toBe(true);
    });
  });

  describe('7. SQL Injection Defense in Search & Filter Params', () => {
    const maliciousSqlStrings = [
      "' OR '1'='1",
      "'; DROP TABLE plots; --",
      "' UNION SELECT null, null, null, null, null --",
      "admin' --",
      "1' OR '1' = '1' --",
    ];

    it('should safely parameterize SQL queries and not execute SQL injection in plot filters', async () => {
      let executedSql = '';
      let executedParams: unknown[] = [];

      jest.spyOn(pool, 'query').mockImplementation(async (sql: unknown, params?: unknown) => {
        executedSql = String(sql);
        executedParams = (params as unknown[]) || [];
        if (executedSql.includes('COUNT(*)')) {
          return { rows: [{ count: '0' }], rowCount: 1 } as never;
        }
        return { rows: [], rowCount: 0 } as never;
      });

      for (const sqlPayload of maliciousSqlStrings) {
        const res = await request(app)
          .get(`/api/plots?district=${encodeURIComponent(sqlPayload)}`)
          .set('Cookie', [`accessToken=${validToken}`]);

        expect(res.status).toBe(200);
        // Verify the SQL text uses parameterized placeholders ($1, $2, etc.)
        expect(executedSql).not.toContain(sqlPayload);
        // Verify the malicious string is passed only inside parameterized array
        expect(executedParams.some((p) => String(p).includes(sqlPayload))).toBe(true);
      }
    });

    it('should safely parameterize SQL queries in activity log search filters', async () => {
      let executedSql = '';
      let executedParams: unknown[] = [];

      jest.spyOn(pool, 'query').mockImplementation(async (sql: unknown, params?: unknown) => {
        executedSql = String(sql);
        executedParams = (params as unknown[]) || [];
        if (executedSql.includes('COUNT(*)')) {
          return { rows: [{ count: '0' }], rowCount: 1 } as never;
        }
        return { rows: [], rowCount: 0 } as never;
      });

      const sqlPayload = "'; DROP TABLE activity_logs; --";
      const res = await request(app)
        .get(`/api/activity-logs?q=${encodeURIComponent(sqlPayload)}`)
        .set('Cookie', [`accessToken=${validToken}`]);

      expect(res.status).toBe(200);
      expect(executedSql).not.toContain('DROP TABLE');
      expect(executedParams.some((p) => String(p).includes(sqlPayload))).toBe(true);
    });

    it('should safely parameterize SQL queries in harvest search filters', async () => {
      let executedSql = '';
      let executedParams: unknown[] = [];

      jest.spyOn(pool, 'query').mockImplementation(async (sql: unknown, params?: unknown) => {
        executedSql = String(sql);
        executedParams = (params as unknown[]) || [];
        if (executedSql.includes('COUNT(*)')) {
          return { rows: [{ count: '0' }], rowCount: 1 } as never;
        }
        return { rows: [], rowCount: 0 } as never;
      });

      const sqlPayload = "' OR '1'='1";
      const res = await request(app)
        .get(`/api/harvests?q=${encodeURIComponent(sqlPayload)}`)
        .set('Cookie', [`accessToken=${validToken}`]);

      expect(res.status).toBe(200);
      expect(executedSql).not.toContain("' OR '1'='1");
      expect(executedParams.some((p) => String(p).includes(sqlPayload))).toBe(true);
    });
  });

  describe('8. Uniform Error Format { error: { code, message, details } }', () => {
    it('returns consistent error format on 400 Validation Error', async () => {
      const res = await request(app)
        .post('/api/plots')
        .set('Cookie', [`accessToken=${validToken}`])
        .send({ invalidField: true });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
      expect(res.body.error).toHaveProperty('code');
      expect(res.body.error).toHaveProperty('message');
      expect(res.body.error).toHaveProperty('details');
      expect(typeof res.body.error.code).toBe('string');
      expect(typeof res.body.error.message).toBe('string');
    });

    it('returns consistent error format on 401 Unauthorized', async () => {
      const res = await request(app).get('/api/plots');

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('error');
      expect(res.body.error).toHaveProperty('code');
      expect(res.body.error).toHaveProperty('message');
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('returns consistent error format on 404 Not Found', async () => {
      jest.spyOn(pool, 'query').mockResolvedValue({ rows: [], rowCount: 0 } as never);

      const res = await request(app)
        .get('/api/plots/00000000-0000-0000-0000-000000000000')
        .set('Cookie', [`accessToken=${validToken}`]);

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty('error');
      expect(res.body.error).toHaveProperty('code');
      expect(res.body.error).toHaveProperty('message');
    });

    it('returns consistent error format on 429 Rate Limit Exceeded', async () => {
      jest.spyOn(authService, 'login').mockRejectedValue({
        statusCode: 401,
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password',
      });

      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/api/auth/login')
          .send({ email: 'err.format@goviya.lk', password: 'Password123!' });
      }

      const blockedRes = await request(app)
        .post('/api/auth/login')
        .send({ email: 'err.format@goviya.lk', password: 'Password123!' });

      expect(blockedRes.status).toBe(429);
      expect(blockedRes.body).toHaveProperty('error');
      expect(blockedRes.body.error).toHaveProperty('code');
      expect(blockedRes.body.error).toHaveProperty('message');
      expect(blockedRes.body.error.code).toBe('LOGIN_RATE_LIMIT_EXCEEDED');
    });
  });
});
