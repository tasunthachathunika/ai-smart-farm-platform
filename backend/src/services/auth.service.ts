import argon2 from 'argon2';
import { pool } from '../db';
import { Unauthorized, AppError } from '../utils/errors';
import {
  createAccessToken,
  generateRandomRefreshToken,
  hashToken,
  REFRESH_TOKEN_MAX_AGE_MS,
} from '../utils/token';
import { RegisterInput, LoginInput } from '../validators/auth.validator';

export interface UserResponse {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  role: 'farmer' | 'officer' | 'admin';
  isVerified: boolean;
  isActive?: boolean;
  createdAt: string;
}

export interface AuthResult {
  user: UserResponse;
  accessToken: string;
  refreshToken: string;
}

export interface RequestMetadata {
  ipAddress?: string;
  userAgent?: string;
}

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

export class AuthService {
  /**
   * Register a new farmer or agricultural officer.
   * Uses Argon2id for password hashing.
   * Officers are registered as pending (is_verified = false).
   */
  public async register(input: RegisterInput): Promise<AuthResult> {
    const { email, password, fullName, phone, role } = input;

    // Check if user already exists
    const existing = await pool.query('SELECT id FROM users WHERE email = $1;', [
      email.toLowerCase(),
    ]);
    if (existing.rows.length > 0) {
      throw new AppError(409, 'CONFLICT', 'An account with this email already exists');
    }

    // Hash password with Argon2id
    const passwordHash = await argon2.hash(password, {
      type: argon2.argon2id,
    });

    // Officers register as pending (is_verified = false), farmers verified by default
    const isVerified = role !== 'officer';

    const insertResult = await pool.query<{
      id: string;
      email: string;
      full_name: string;
      phone: string | null;
      role: 'farmer' | 'officer' | 'admin';
      is_verified: boolean;
      created_at: Date;
    }>(
      `INSERT INTO users (email, password_hash, full_name, phone, role, is_verified)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, email, full_name, phone, role, is_verified, created_at;`,
      [email.toLowerCase(), passwordHash, fullName, phone || null, role, isVerified],
    );

    const userRow = insertResult.rows[0];
    const user: UserResponse = {
      id: userRow.id,
      email: userRow.email,
      fullName: userRow.full_name,
      phone: userRow.phone,
      role: userRow.role,
      isVerified: userRow.is_verified,
      isActive: true,
      createdAt: userRow.created_at.toISOString(),
    };

    // Generate tokens
    const accessToken = createAccessToken({
      userId: user.id,
      role: user.role,
      email: user.email,
    });

    const refreshToken = await this.createAndSaveRefreshToken(user.id);

    return { user, accessToken, refreshToken };
  }

  /**
   * Authenticate user with generic errors and account lockout defense.
   */
  public async login(input: LoginInput, metadata?: RequestMetadata): Promise<AuthResult> {
    const { email, password } = input;
    const normalizedEmail = email.toLowerCase();

    // Query user
    const result = await pool.query<{
      id: string;
      email: string;
      password_hash: string;
      full_name: string;
      phone: string | null;
      role: 'farmer' | 'officer' | 'admin';
      is_verified: boolean;
      is_active?: boolean;
      failed_login_attempts: number;
      locked_until: Date | null;
      created_at: Date;
    }>(
      `SELECT id, email, password_hash, full_name, phone, role, is_verified, is_active,
              failed_login_attempts, locked_until, created_at
       FROM users WHERE email = $1;`,
      [normalizedEmail],
    );

    // If user does not exist, return generic error (constant time mitigation)
    if (result.rows.length === 0) {
      await argon2.hash('dummy-password-for-timing-defense', { type: argon2.argon2id });
      throw new Unauthorized('Invalid email or password', 'INVALID_CREDENTIALS');
    }

    const userRow = result.rows[0];

    // Check if account is deactivated
    if (userRow.is_active === false) {
      throw new Unauthorized(
        'Account is deactivated. Please contact an administrator.',
        'ACCOUNT_DEACTIVATED',
      );
    }

    // Check if account is temporarily locked
    if (userRow.locked_until && new Date(userRow.locked_until) > new Date()) {
      throw new Unauthorized(
        'Account is temporarily locked due to repeated failed login attempts. Please try again later.',
        'ACCOUNT_LOCKED',
      );
    }

    // Verify password with Argon2
    const passwordValid = await argon2.verify(userRow.password_hash, password);

    if (!passwordValid) {
      const newFailedCount = userRow.failed_login_attempts + 1;
      let lockoutDate: Date | null = null;

      if (newFailedCount >= MAX_FAILED_ATTEMPTS) {
        lockoutDate = new Date(Date.now() + LOCKOUT_DURATION_MS);
      }

      await pool.query(
        'UPDATE users SET failed_login_attempts = $1, locked_until = $2 WHERE id = $3;',
        [newFailedCount, lockoutDate, userRow.id],
      );

      throw new Unauthorized('Invalid email or password', 'INVALID_CREDENTIALS');
    }

    // Reset failed attempts on successful login
    await pool.query(
      'UPDATE users SET failed_login_attempts = 0, locked_until = NULL WHERE id = $1;',
      [userRow.id],
    );

    // Add audit log entry for login
    await pool.query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, ip_address, user_agent)
       VALUES ($1, 'login', 'users', $1, $2, $3);`,
      [userRow.id, metadata?.ipAddress || null, metadata?.userAgent || null],
    );

    const user: UserResponse = {
      id: userRow.id,
      email: userRow.email,
      fullName: userRow.full_name,
      phone: userRow.phone,
      role: userRow.role,
      isVerified: userRow.is_verified,
      isActive: userRow.is_active ?? true,
      createdAt: userRow.created_at.toISOString(),
    };

    const accessToken = createAccessToken({
      userId: user.id,
      role: user.role,
      email: user.email,
    });

    const refreshToken = await this.createAndSaveRefreshToken(user.id);

    return { user, accessToken, refreshToken };
  }

  /**
   * Rotate refresh token and issue new access token.
   */
  public async refresh(oldRefreshToken: string): Promise<AuthResult> {
    if (!oldRefreshToken) {
      throw new Unauthorized('Refresh token is required', 'INVALID_TOKEN');
    }

    const tokenHash = hashToken(oldRefreshToken);

    const tokenResult = await pool.query<{
      id: string;
      user_id: string;
      expires_at: Date;
      revoked_at: Date | null;
    }>(
      `SELECT id, user_id, expires_at, revoked_at
       FROM refresh_tokens
       WHERE token_hash = $1;`,
      [tokenHash],
    );

    if (tokenResult.rows.length === 0) {
      throw new Unauthorized('Invalid refresh token', 'INVALID_TOKEN');
    }

    const tokenRow = tokenResult.rows[0];

    // Check if token was revoked or expired
    if (tokenRow.revoked_at !== null || new Date(tokenRow.expires_at) <= new Date()) {
      throw new Unauthorized('Refresh token has expired or been revoked', 'INVALID_TOKEN');
    }

    // Revoke old refresh token (Token Rotation)
    await pool.query('UPDATE refresh_tokens SET revoked_at = NOW() WHERE id = $1;', [tokenRow.id]);

    // Fetch user details
    const userResult = await pool.query<{
      id: string;
      email: string;
      full_name: string;
      phone: string | null;
      role: 'farmer' | 'officer' | 'admin';
      is_verified: boolean;
      is_active?: boolean;
      created_at: Date;
    }>(
      `SELECT id, email, full_name, phone, role, is_verified, is_active, created_at
       FROM users WHERE id = $1;`,
      [tokenRow.user_id],
    );

    if (userResult.rows.length === 0) {
      throw new Unauthorized('User no longer exists', 'USER_NOT_FOUND');
    }

    const userRow = userResult.rows[0];

    // Check if account is deactivated
    if (userRow.is_active === false) {
      throw new Unauthorized(
        'Account is deactivated. Please contact an administrator.',
        'ACCOUNT_DEACTIVATED',
      );
    }

    const user: UserResponse = {
      id: userRow.id,
      email: userRow.email,
      fullName: userRow.full_name,
      phone: userRow.phone,
      role: userRow.role,
      isVerified: userRow.is_verified,
      isActive: userRow.is_active ?? true,
      createdAt: userRow.created_at.toISOString(),
    };

    // Issue new access token + new rotated refresh token
    const accessToken = createAccessToken({
      userId: user.id,
      role: user.role,
      email: user.email,
    });

    const newRefreshToken = await this.createAndSaveRefreshToken(user.id);

    return { user, accessToken, refreshToken: newRefreshToken };
  }

  /**
   * Revoke refresh token and create audit log entry for logout.
   */
  public async logout(
    userId: string | undefined,
    refreshToken?: string,
    metadata?: RequestMetadata,
  ): Promise<void> {
    if (refreshToken) {
      const tokenHash = hashToken(refreshToken);
      await pool.query('UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = $1;', [
        tokenHash,
      ]);
    }

    if (userId) {
      await pool.query(
        `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, ip_address, user_agent)
         VALUES ($1, 'logout', 'users', $1, $2, $3);`,
        [userId, metadata?.ipAddress || null, metadata?.userAgent || null],
      );
    }
  }

  /**
   * Get authenticated user profile.
   */
  public async getMe(userId: string): Promise<UserResponse> {
    const result = await pool.query<{
      id: string;
      email: string;
      full_name: string;
      phone: string | null;
      role: 'farmer' | 'officer' | 'admin';
      is_verified: boolean;
      is_active?: boolean;
      created_at: Date;
    }>(
      `SELECT id, email, full_name, phone, role, is_verified, is_active, created_at
       FROM users WHERE id = $1;`,
      [userId],
    );

    if (result.rows.length === 0) {
      throw new Unauthorized('User not found', 'USER_NOT_FOUND');
    }

    const userRow = result.rows[0];

    // Check if account is deactivated
    if (userRow.is_active === false) {
      throw new Unauthorized(
        'Account is deactivated. Please contact an administrator.',
        'ACCOUNT_DEACTIVATED',
      );
    }

    return {
      id: userRow.id,
      email: userRow.email,
      fullName: userRow.full_name,
      phone: userRow.phone,
      role: userRow.role,
      isVerified: userRow.is_verified,
      isActive: userRow.is_active ?? true,
      createdAt: userRow.created_at.toISOString(),
    };
  }

  /**
   * Internal helper: Generate, hash, and store a refresh token.
   */
  private async createAndSaveRefreshToken(userId: string): Promise<string> {
    const rawToken = generateRandomRefreshToken();
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_MAX_AGE_MS);

    await pool.query(
      `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, $3);`,
      [userId, tokenHash, expiresAt],
    );

    return rawToken;
  }
}

export const authService = new AuthService();
