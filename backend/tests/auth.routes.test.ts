import request from 'supertest';
import { app } from '../src/app';
import { authService, UserResponse } from '../src/services/auth.service';
import { createAccessToken } from '../src/utils/token';

function extractCookies(res: request.Response): string[] {
  const header = res.headers['set-cookie'];
  if (!header) return [];
  if (Array.isArray(header)) return header;
  return [header];
}

describe('Auth HTTP Routes & Cookie Suite', () => {
  const mockUser: UserResponse = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    email: 'farmer.route@goviya.lk',
    fullName: 'Route Test Farmer',
    phone: '+94770000000',
    role: 'farmer',
    isVerified: true,
    createdAt: new Date().toISOString(),
  };

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('POST /api/auth/register', () => {
    it('should register user and set httpOnly accessToken and refreshToken cookies', async () => {
      jest.spyOn(authService, 'register').mockResolvedValueOnce({
        user: mockUser,
        accessToken: 'mock-access-token-jwt',
        refreshToken: 'mock-refresh-token-hex',
      });

      const res = await request(app).post('/api/auth/register').send({
        email: 'farmer.route@goviya.lk',
        password: 'Password123!',
        fullName: 'Route Test Farmer',
        role: 'farmer',
      });

      expect(res.status).toBe(201);
      expect(res.body.user).toEqual(mockUser);

      const cookies = extractCookies(res);
      expect(cookies.length).toBeGreaterThanOrEqual(2);

      const accessCookie = cookies.find((c) => c.startsWith('accessToken='));
      const refreshCookie = cookies.find((c) => c.startsWith('refreshToken='));

      expect(accessCookie).toContain('HttpOnly');
      expect(refreshCookie).toContain('HttpOnly');
      expect(accessCookie).toContain('mock-access-token-jwt');
      expect(refreshCookie).toContain('mock-refresh-token-hex');
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login and set auth cookies', async () => {
      jest.spyOn(authService, 'login').mockResolvedValueOnce({
        user: mockUser,
        accessToken: 'login-access-token',
        refreshToken: 'login-refresh-token',
      });

      const res = await request(app).post('/api/auth/login').send({
        email: 'farmer.route@goviya.lk',
        password: 'Password123!',
      });

      expect(res.status).toBe(200);
      expect(res.body.user.email).toBe(mockUser.email);

      const cookies = extractCookies(res);
      expect(cookies.some((c) => c.includes('accessToken=login-access-token'))).toBe(true);
      expect(cookies.some((c) => c.includes('refreshToken=login-refresh-token'))).toBe(true);
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('should rotate tokens and update cookies', async () => {
      jest.spyOn(authService, 'refresh').mockResolvedValueOnce({
        user: mockUser,
        accessToken: 'rotated-access-token',
        refreshToken: 'rotated-refresh-token',
      });

      const res = await request(app)
        .post('/api/auth/refresh')
        .set('Cookie', ['refreshToken=old-refresh-token']);

      expect(res.status).toBe(200);
      const cookies = extractCookies(res);
      expect(cookies.some((c) => c.includes('accessToken=rotated-access-token'))).toBe(true);
      expect(cookies.some((c) => c.includes('refreshToken=rotated-refresh-token'))).toBe(true);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should clear cookies and revoke refresh token', async () => {
      const logoutSpy = jest.spyOn(authService, 'logout').mockResolvedValueOnce();

      const res = await request(app)
        .post('/api/auth/logout')
        .set('Cookie', ['refreshToken=active-refresh-token']);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Successfully logged out');
      expect(logoutSpy).toHaveBeenCalled();

      const cookies = extractCookies(res);
      expect(cookies.some((c) => c.includes('accessToken=;'))).toBe(true);
      expect(cookies.some((c) => c.includes('refreshToken=;'))).toBe(true);
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return 401 when unauthenticated', async () => {
      const res = await request(app).get('/api/auth/me');

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should return current user profile when valid accessToken cookie is provided', async () => {
      const validToken = createAccessToken({
        userId: mockUser.id,
        role: mockUser.role,
        email: mockUser.email,
      });

      jest.spyOn(authService, 'getMe').mockResolvedValueOnce(mockUser);

      const res = await request(app)
        .get('/api/auth/me')
        .set('Cookie', [`accessToken=${validToken}`]);

      expect(res.status).toBe(200);
      expect(res.body.user).toEqual(mockUser);
    });
  });
});
