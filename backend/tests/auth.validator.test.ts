import { registerSchema, loginSchema } from '../src/validators/auth.validator';

describe('Auth Zod Validators', () => {
  describe('registerSchema', () => {
    const validFarmer = {
      email: 'farmer.new@goviya.lk',
      password: 'SecurePassword123!',
      fullName: 'Kamal Jayawardena',
      phone: '+94771234567',
      role: 'farmer',
    };

    it('should pass with valid farmer input', () => {
      const parsed = registerSchema.safeParse(validFarmer);
      expect(parsed.success).toBe(true);
    });

    it('should pass with valid officer input', () => {
      const parsed = registerSchema.safeParse({
        ...validFarmer,
        email: 'officer.new@goviya.lk',
        role: 'officer',
      });
      expect(parsed.success).toBe(true);
    });

    it('should reject password with less than 8 characters', () => {
      const parsed = registerSchema.safeParse({
        ...validFarmer,
        password: 'short7!',
      });
      expect(parsed.success).toBe(false);
      if (!parsed.success) {
        const passwordIssue = parsed.error.issues.find((i) => i.path.includes('password'));
        expect(passwordIssue).toBeDefined();
        expect(passwordIssue?.message).toContain('at least 8 characters');
      }
    });

    it('should reject registration with admin role', () => {
      const parsed = registerSchema.safeParse({
        ...validFarmer,
        role: 'admin',
      });
      expect(parsed.success).toBe(false);
      if (!parsed.success) {
        const roleIssue = parsed.error.issues.find((i) => i.path.includes('role'));
        expect(roleIssue).toBeDefined();
      }
    });

    it('should reject invalid email format', () => {
      const parsed = registerSchema.safeParse({
        ...validFarmer,
        email: 'invalid-email-string',
      });
      expect(parsed.success).toBe(false);
      if (!parsed.success) {
        const emailIssue = parsed.error.issues.find((i) => i.path.includes('email'));
        expect(emailIssue).toBeDefined();
      }
    });
  });

  describe('loginSchema', () => {
    it('should pass with valid email and password >= 8 characters', () => {
      const parsed = loginSchema.safeParse({
        email: 'user@goviya.lk',
        password: 'password123',
      });
      expect(parsed.success).toBe(true);
    });

    it('should fail when password is less than 8 characters', () => {
      const parsed = loginSchema.safeParse({
        email: 'user@goviya.lk',
        password: '1234567',
      });
      expect(parsed.success).toBe(false);
    });
  });
});
