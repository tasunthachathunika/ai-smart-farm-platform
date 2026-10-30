import request from 'supertest';
import { app } from '../src/app';
import { authService, UserResponse } from '../src/services/auth.service';
import { createAccessToken } from '../src/utils/token';
import { AppError, Unauthorized, Forbidden } from '../src/utils/errors';

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

    it('should reject registration with invalid email', async () => {
      const res = await request(app).post('/api/auth/register').send({
        email: 'not-an-email',
        password: 'Password123!',
        fullName: 'Invalid Email Farmer',
        role: 'farmer',
      });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(JSON.stringify(res.body.error.details)).toContain('Invalid email');
    });

    it('should reject registration with short password (< 8 characters)', async () => {
      const res = await request(app).post('/api/auth/register').send({
        email: 'shortpass@goviya.lk',
        password: '123',
        fullName: 'Short Password Farmer',
        role: 'farmer',
      });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(JSON.stringify(res.body.error.details)).toContain('at least 8 characters');
    });

    it('should reject registration if email already exists (duplicate email)', async () => {
      jest.spyOn(authService, 'register').mockRejectedValueOnce(
        new AppError(409, 'CONFLICT', 'An account with this email already exists'),
      );

      const res = await request(app).post('/api/auth/register').send({
        email: 'farmer.route@goviya.lk',
        password: 'Password123!',
        fullName: 'Duplicate Farmer',
        role: 'farmer',
      });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('CONFLICT');
      expect(res.body.error.message).toContain('already exists');
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

    it('should return generic error message on invalid password to prevent user enumeration', async () => {
      jest.spyOn(authService, 'login').mockRejectedValueOnce(
        new Unauthorized('Invalid email or password', 'INVALID_CREDENTIALS'),
      );

      const res = await request(app).post('/api/auth/login').send({
        email: 'farmer.route@goviya.lk',
        password: 'WrongPassword!',
      });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
      expect(res.body.error.message).toBe('Invalid email or password');
    });

    it('should return lockout error after repeated failed login attempts', async () => {
      jest.spyOn(authService, 'login').mockRejectedValueOnce(
        new Forbidden(
          'Account is temporarily locked due to repeated failed login attempts. Please try again in 15 minutes.',
          'ACCOUNT_LOCKED',
        ),
      );

      const res = await request(app).post('/api/auth/login').send({
        email: 'farmer.route@goviya.lk',
        password: 'Password123!',
      });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('ACCOUNT_LOCKED');
      expect(res.body.error.message).toContain('locked');
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

    it('should reject reused or already-revoked refresh token', async () => {
      jest.spyOn(authService, 'refresh').mockRejectedValueOnce(
        new Unauthorized('Refresh token has expired or been revoked', 'INVALID_REFRESH_TOKEN'),
      );

      const res = await request(app)
        .post('/api/auth/refresh')
        .set('Cookie', ['refreshToken=reused-old-token']);

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('INVALID_REFRESH_TOKEN');
      expect(res.body.error.message).toContain('revoked');
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

  describe('PATCH /api/auth/profile', () => {
    it('should return 401 when unauthenticated', async () => {
      const res = await request(app).patch('/api/auth/profile').send({
        fullName: 'Updated Name',
      });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should return 400 when fullName is too short', async () => {
      const validToken = createAccessToken({
        userId: mockUser.id,
        role: mockUser.role,
        email: mockUser.email,
      });

      jest.spyOn(authService, 'getMe').mockResolvedValueOnce(mockUser);

      const res = await request(app)
        .patch('/api/auth/profile')
        .set('Cookie', [`accessToken=${validToken}`])
        .send({ fullName: 'A' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should update profile successfully for authenticated user', async () => {
      const validToken = createAccessToken({
        userId: mockUser.id,
        role: mockUser.role,
        email: mockUser.email,
      });

      const updatedUser = {
        ...mockUser,
        fullName: 'Sunil Updated Bandara',
        phone: '+94771234567',
      };

      jest.spyOn(authService, 'getMe').mockResolvedValueOnce(mockUser);
      jest.spyOn(authService, 'updateProfile').mockResolvedValueOnce(updatedUser);

      const res = await request(app)
        .patch('/api/auth/profile')
        .set('Cookie', [`accessToken=${validToken}`])
        .send({
          fullName: 'Sunil Updated Bandara',
          phone: '+94771234567',
        });

      expect(res.status).toBe(200);
      expect(res.body.user).toEqual(updatedUser);
      expect(res.body.message).toBe('Profile updated successfully');
    });
  });
});
