import argon2 from 'argon2';
import { pool } from '../src/db';
import { authService } from '../src/services/auth.service';

describe('AuthService Unit Tests', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('register', () => {
    it('should hash password with Argon2id and set is_verified: false for officers', async () => {
      const mockUserRow = {
        id: '123e4567-e89b-12d3-a456-426614174001',
        email: 'officer.test@goviya.lk',
        full_name: 'Test Officer',
        phone: null,
        role: 'officer',
        is_verified: false,
        created_at: new Date(),
      };

      const querySpy = jest.spyOn(pool, 'query').mockImplementation(async (text: unknown) => {
        const sql = String(text);
        if (sql.includes('SELECT id FROM users')) {
          return { rows: [], rowCount: 0 } as never;
        }
        if (sql.includes('INSERT INTO users')) {
          return { rows: [mockUserRow], rowCount: 1 } as never;
        }
        if (sql.includes('INSERT INTO refresh_tokens')) {
          return { rows: [], rowCount: 1 } as never;
        }
        return { rows: [], rowCount: 0 } as never;
      });

      const result = await authService.register({
        email: 'officer.test@goviya.lk',
        password: 'Password123!',
        fullName: 'Test Officer',
        role: 'officer',
      });

      expect(result.user.isVerified).toBe(false);
      expect(result.user.role).toBe('officer');
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();

      const insertCall = querySpy.mock.calls.find((call) =>
        String(call[0]).includes('INSERT INTO users'),
      );
      expect(insertCall).toBeDefined();
      const params = insertCall?.[1] as unknown as unknown[];
      const passwordHashPassed = String(params?.[1]);
      expect(passwordHashPassed).toMatch(/^\$argon2id\$/);
    });

    it('should set is_verified: true for farmers', async () => {
      const mockUserRow = {
        id: '123e4567-e89b-12d3-a456-426614174002',
        email: 'farmer.test@goviya.lk',
        full_name: 'Test Farmer',
        phone: '+94770000000',
        role: 'farmer',
        is_verified: true,
        created_at: new Date(),
      };

      jest.spyOn(pool, 'query').mockImplementation(async (text: unknown) => {
        const sql = String(text);
        if (sql.includes('SELECT id FROM users')) {
          return { rows: [], rowCount: 0 } as never;
        }
        if (sql.includes('INSERT INTO users')) {
          return { rows: [mockUserRow], rowCount: 1 } as never;
        }
        if (sql.includes('INSERT INTO refresh_tokens')) {
          return { rows: [], rowCount: 1 } as never;
        }
        return { rows: [], rowCount: 0 } as never;
      });

      const result = await authService.register({
        email: 'farmer.test@goviya.lk',
        password: 'Password123!',
        fullName: 'Test Farmer',
        phone: '+94770000000',
        role: 'farmer',
      });

      expect(result.user.isVerified).toBe(true);
      expect(result.user.role).toBe('farmer');
    });

    it('should reject registration if email already exists', async () => {
      jest.spyOn(pool, 'query').mockImplementation(async () => {
        return { rows: [{ id: 'existing-id' }], rowCount: 1 } as never;
      });

      await expect(
        authService.register({
          email: 'duplicate@goviya.lk',
          password: 'Password123!',
          fullName: 'Duplicate User',
          role: 'farmer',
        }),
      ).rejects.toThrow('An account with this email already exists');
    });
  });

  describe('login & lockout', () => {
    it('should fail with generic INVALID_CREDENTIALS when password does not match', async () => {
      const realPasswordHash = await argon2.hash('CorrectPassword123!', {
        type: argon2.argon2id,
      });

      const mockUser = {
        id: 'user-123',
        email: 'test@goviya.lk',
        password_hash: realPasswordHash,
        full_name: 'Test',
        phone: null,
        role: 'farmer',
        is_verified: true,
        failed_login_attempts: 1,
        locked_until: null,
        created_at: new Date(),
      };

      const querySpy = jest.spyOn(pool, 'query').mockImplementation(async (text: unknown) => {
        const sql = String(text);
        if (sql.includes('SELECT id, email')) {
          return { rows: [mockUser], rowCount: 1 } as never;
        }
        return { rows: [], rowCount: 1 } as never;
      });

      await expect(
        authService.login({
          email: 'test@goviya.lk',
          password: 'WrongPassword123!',
        }),
      ).rejects.toThrow('Invalid email or password');

      const updateCall = querySpy.mock.calls.find((call) =>
        String(call[0]).includes('UPDATE users SET failed_login_attempts'),
      );
      expect(updateCall).toBeDefined();
      const params = (updateCall?.[1] || []) as unknown[];
      expect(params?.[0]).toBe(2);
    });

    it('should lock account on repeated failures (>= 5 attempts)', async () => {
      const realPasswordHash = await argon2.hash('CorrectPassword123!', {
        type: argon2.argon2id,
      });

      const mockUser = {
        id: 'user-lockout',
        email: 'lockout@goviya.lk',
        password_hash: realPasswordHash,
        full_name: 'Lockout Target',
        phone: null,
        role: 'farmer',
        is_verified: true,
        failed_login_attempts: 4, // 5th failure
        locked_until: null,
        created_at: new Date(),
      };

      const querySpy = jest.spyOn(pool, 'query').mockImplementation(async (text: unknown) => {
        const sql = String(text);
        if (sql.includes('SELECT id, email')) {
          return { rows: [mockUser], rowCount: 1 } as never;
        }
        return { rows: [], rowCount: 1 } as never;
      });

      await expect(
        authService.login({
          email: 'lockout@goviya.lk',
          password: 'WrongPasswordAgain!',
        }),
      ).rejects.toThrow('Invalid email or password');

      const updateCall = querySpy.mock.calls.find((call) =>
        String(call[0]).includes('UPDATE users SET failed_login_attempts'),
      );
      expect(updateCall).toBeDefined();
      const params = (updateCall?.[1] || []) as unknown[];
      expect(params?.[0]).toBe(5);
      expect(params?.[1]).toBeInstanceOf(Date);
    });

    it('should reject login with ACCOUNT_LOCKED if account is currently locked', async () => {
      const mockUser = {
        id: 'user-locked',
        email: 'locked@goviya.lk',
        password_hash: 'hash',
        full_name: 'Locked User',
        phone: null,
        role: 'farmer',
        is_verified: true,
        failed_login_attempts: 5,
        locked_until: new Date(Date.now() + 600000),
        created_at: new Date(),
      };

      jest.spyOn(pool, 'query').mockImplementation(async () => {
        return { rows: [mockUser], rowCount: 1 } as never;
      });

      await expect(
        authService.login({
          email: 'locked@goviya.lk',
          password: 'AnyPassword123!',
        }),
      ).rejects.toThrow('Account is temporarily locked');
    });

    it('should record audit log on successful login', async () => {
      const realPassword = 'ValidPassword123!';
      const realPasswordHash = await argon2.hash(realPassword, {
        type: argon2.argon2id,
      });

      const mockUser = {
        id: 'user-success',
        email: 'success@goviya.lk',
        password_hash: realPasswordHash,
        full_name: 'Success Farmer',
        phone: null,
        role: 'farmer',
        is_verified: true,
        failed_login_attempts: 2,
        locked_until: null,
        created_at: new Date(),
      };

      const querySpy = jest.spyOn(pool, 'query').mockImplementation(async (text: unknown) => {
        const sql = String(text);
        if (sql.includes('SELECT id, email')) {
          return { rows: [mockUser], rowCount: 1 } as never;
        }
        return { rows: [], rowCount: 1 } as never;
      });

      const result = await authService.login(
        { email: 'success@goviya.lk', password: realPassword },
        { ipAddress: '192.168.1.100', userAgent: 'JestTestRunner' },
      );

      expect(result.user.email).toBe('success@goviya.lk');

      const auditCall = querySpy.mock.calls.find((call) =>
        String(call[0]).includes('INSERT INTO audit_logs'),
      );
      expect(auditCall).toBeDefined();
      const params = (auditCall?.[1] || []) as unknown[];
      expect(params?.[0]).toBe('user-success');
      expect(params?.[1]).toBe('192.168.1.100');
    });
  });

  describe('refresh token rotation', () => {
    it('should revoke old refresh token and return new rotated token', async () => {
      const rawOldToken = 'raw-old-refresh-token';

      const mockTokenRow = {
        id: 'token-uuid-1',
        user_id: 'user-uuid-1',
        expires_at: new Date(Date.now() + 100000),
        revoked_at: null,
      };

      const mockUserRow = {
        id: 'user-uuid-1',
        email: 'rotate@goviya.lk',
        full_name: 'Rotate User',
        phone: null,
        role: 'farmer',
        is_verified: true,
        created_at: new Date(),
      };

      const querySpy = jest.spyOn(pool, 'query').mockImplementation(async (text: unknown) => {
        const sql = String(text);
        if (sql.includes('SELECT id, user_id, expires_at')) {
          return { rows: [mockTokenRow], rowCount: 1 } as never;
        }
        if (sql.includes('SELECT id, email, full_name')) {
          return { rows: [mockUserRow], rowCount: 1 } as never;
        }
        return { rows: [], rowCount: 1 } as never;
      });

      const result = await authService.refresh(rawOldToken);

      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(result.refreshToken).not.toBe(rawOldToken);

      const revokeCall = querySpy.mock.calls.find((call) =>
        String(call[0]).includes('UPDATE refresh_tokens SET revoked_at'),
      );
      expect(revokeCall).toBeDefined();
    });

    it('should reject already revoked refresh token', async () => {
      const mockTokenRow = {
        id: 'token-uuid-revoked',
        user_id: 'user-uuid-1',
        expires_at: new Date(Date.now() + 100000),
        revoked_at: new Date(),
      };

      jest.spyOn(pool, 'query').mockImplementation(async () => {
        return { rows: [mockTokenRow], rowCount: 1 } as never;
      });

      await expect(authService.refresh('some-revoked-token')).rejects.toThrow(
        'Refresh token has expired or been revoked',
      );
    });
  });

  describe('logout', () => {
    it('should revoke refresh token and write audit log', async () => {
      const querySpy = jest.spyOn(pool, 'query').mockImplementation(async () => {
        return { rows: [], rowCount: 1 } as never;
      });

      await authService.logout('user-123', 'raw-token', {
        ipAddress: '10.0.0.1',
        userAgent: 'LogoutAgent',
      });

      const revokeCall = querySpy.mock.calls.find((call) =>
        String(call[0]).includes('UPDATE refresh_tokens SET revoked_at'),
      );
      expect(revokeCall).toBeDefined();

      const auditCall = querySpy.mock.calls.find((call) =>
        String(call[0]).includes('INSERT INTO audit_logs'),
      );
      expect(auditCall).toBeDefined();
    });
  });
});
