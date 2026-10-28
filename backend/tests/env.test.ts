import { envSchema } from '../src/config/env';

describe('Environment Configuration Validation (config/env.ts)', () => {
  const validBaseEnv = {
    PORT: '5000',
    NODE_ENV: 'development',
    DATABASE_URL: 'postgresql://goviya:pass@localhost:5432/goviya_plus',
    JWT_SECRET: 'a-super-secret-jwt-key-with-more-than-32-characters',
    JWT_EXPIRES_IN: '7d',
    GPS_ENCRYPTION_KEY: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
    CORS_ORIGIN: 'http://localhost:3000',
  };

  it('should successfully validate valid environment variables', () => {
    const parsed = envSchema.safeParse(validBaseEnv);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.PORT).toBe(5000);
      expect(parsed.data.NODE_ENV).toBe('development');
      expect(parsed.data.JWT_SECRET).toBe(validBaseEnv.JWT_SECRET);
      expect(parsed.data.GPS_ENCRYPTION_KEY).toBe(validBaseEnv.GPS_ENCRYPTION_KEY);
    }
  });

  it('should fail when JWT_SECRET is less than 32 characters long', () => {
    const invalidEnv = {
      ...validBaseEnv,
      JWT_SECRET: 'short-secret',
    };
    const parsed = envSchema.safeParse(invalidEnv);
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      const issue = parsed.error.issues.find((i) => i.path.includes('JWT_SECRET'));
      expect(issue).toBeDefined();
      expect(issue?.message).toContain('at least 32 characters long');
    }
  });

  it('should fail when GPS_ENCRYPTION_KEY is not 64 characters long', () => {
    const invalidEnv = {
      ...validBaseEnv,
      GPS_ENCRYPTION_KEY: 'too-short-hex-key',
    };
    const parsed = envSchema.safeParse(invalidEnv);
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      const issue = parsed.error.issues.find((i) => i.path.includes('GPS_ENCRYPTION_KEY'));
      expect(issue).toBeDefined();
      expect(issue?.message).toContain('64-character');
    }
  });

  it('should fail when PORT is not a valid number', () => {
    const invalidEnv = {
      ...validBaseEnv,
      PORT: 'invalid-port',
    };
    const parsed = envSchema.safeParse(invalidEnv);
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      const issue = parsed.error.issues.find((i) => i.path.includes('PORT'));
      expect(issue).toBeDefined();
    }
  });
});
