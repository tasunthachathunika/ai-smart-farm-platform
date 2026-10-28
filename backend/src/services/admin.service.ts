import { pool } from '../db';
import { NotFound, Forbidden } from '../utils/errors';
import { writeAuditLog } from '../utils/audit';
import { buildPaginatedResponse, PaginatedResponse } from '../utils/pagination';
import { UserResponse } from './auth.service';
import {
  AdminUserQuery,
  PendingOfficerQuery,
  AdminAuditQuery,
} from '../validators/admin.validator';

export interface AdminUserResponse {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  role: 'farmer' | 'officer' | 'admin';
  isVerified: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AdminAuditLogEntry {
  id: string;
  userId: string | null;
  userEmail?: string | null;
  userName?: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

export interface RequestMetadata {
  ipAddress?: string;
  userAgent?: string;
}

// Sensitive keys that must never appear in audit metadata returned to admins
const REDACTED_METADATA_KEYS = new Set([
  'password',
  'password_hash',
  'token',
  'accessToken',
  'refreshToken',
  'cookie',
  'cookies',
  'gps',
  'exact_gps',
  'encrypted_gps',
  'latitude',
  'longitude',
  'notes',
  'private_notes',
]);

/**
 * Strips any sensitive fields or private farm notes from audit metadata.
 */
function sanitizeAuditMetadata(
  meta: Record<string, unknown> | null,
): Record<string, unknown> | null {
  if (!meta || typeof meta !== 'object') return null;

  const sanitized: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(meta)) {
    if (!REDACTED_METADATA_KEYS.has(key.toLowerCase())) {
      sanitized[key] = val;
    }
  }
  return sanitized;
}

export class AdminService {
  /**
   * List all registered users (metadata only, strictly NO farm data).
   * Supports search query (name/email/phone) and filtering by role or status.
   */
  public async getUsers(query: AdminUserQuery): Promise<PaginatedResponse<AdminUserResponse>> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    // Filter by role
    if (query.role) {
      conditions.push(`role = $${paramIndex++}`);
      values.push(query.role);
    }

    // Filter by active status
    if (query.status === 'active') {
      conditions.push(`is_active = true`);
    } else if (query.status === 'deactivated') {
      conditions.push(`is_active = false`);
    }

    // Search query
    if (query.q) {
      conditions.push(
        `(full_name ILIKE $${paramIndex} OR email ILIKE $${paramIndex} OR phone ILIKE $${paramIndex})`,
      );
      values.push(`%${query.q}%`);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Total count for pagination
    const countResult = await pool.query<{ count: string }>(
      `SELECT COUNT(*) FROM users ${whereClause};`,
      values,
    );
    const total = parseInt(countResult.rows[0].count, 10);

    // Fetch paginated users (strictly user account metadata, zero farm data)
    const dataValues = [...values, limit, offset];
    const dataResult = await pool.query<{
      id: string;
      email: string;
      full_name: string;
      phone: string | null;
      role: 'farmer' | 'officer' | 'admin';
      is_verified: boolean;
      is_active: boolean;
      created_at: Date;
      updated_at: Date;
    }>(
      `SELECT id, email, full_name, phone, role, is_verified, is_active, created_at, updated_at
       FROM users
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex++};`,
      dataValues,
    );

    const users: AdminUserResponse[] = dataResult.rows.map((row) => ({
      id: row.id,
      email: row.email,
      fullName: row.full_name,
      phone: row.phone,
      role: row.role,
      isVerified: row.is_verified,
      isActive: row.is_active,
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
    }));

    return buildPaginatedResponse(users, total, page, limit);
  }

  /**
   * Activate or deactivate a user account.
   * When deactivated, all active refresh tokens are immediately revoked.
   */
  public async setUserStatus(
    adminUser: UserResponse,
    targetUserId: string,
    isActive: boolean,
    metadata?: RequestMetadata,
  ): Promise<AdminUserResponse> {
    // Check if target user exists
    const checkResult = await pool.query<{
      id: string;
      email: string;
      full_name: string;
      role: 'farmer' | 'officer' | 'admin';
      is_active: boolean;
    }>('SELECT id, email, full_name, role, is_active FROM users WHERE id = $1;', [targetUserId]);

    if (checkResult.rows.length === 0) {
      throw new NotFound('User not found');
    }

    const targetUser = checkResult.rows[0];

    // Prevent admin from deactivating their own account
    if (adminUser.id === targetUserId && !isActive) {
      throw new Forbidden('Admins cannot deactivate their own account', 'SELF_DEACTIVATION_FORBIDDEN');
    }

    // Update user status
    const updateResult = await pool.query<{
      id: string;
      email: string;
      full_name: string;
      phone: string | null;
      role: 'farmer' | 'officer' | 'admin';
      is_verified: boolean;
      is_active: boolean;
      created_at: Date;
      updated_at: Date;
    }>(
      `UPDATE users
       SET is_active = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING id, email, full_name, phone, role, is_verified, is_active, created_at, updated_at;`,
      [isActive, targetUserId],
    );

    // If deactivated, revoke all refresh tokens immediately
    if (!isActive) {
      await pool.query(
        'UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL;',
        [targetUserId],
      );
    }

    // Record audit event
    await writeAuditLog({
      userId: adminUser.id,
      action: 'update',
      entityType: 'users',
      entityId: targetUserId,
      metadata: {
        field: 'is_active',
        previousValue: targetUser.is_active,
        newValue: isActive,
        targetEmail: targetUser.email,
      },
      ipAddress: metadata?.ipAddress,
      userAgent: metadata?.userAgent,
    });

    const row = updateResult.rows[0];
    return {
      id: row.id,
      email: row.email,
      fullName: row.full_name,
      phone: row.phone,
      role: row.role,
      isVerified: row.is_verified,
      isActive: row.is_active,
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
    };
  }

  /**
   * List pending agricultural officers awaiting verification.
   */
  public async getPendingOfficers(
    query: PendingOfficerQuery,
  ): Promise<PaginatedResponse<AdminUserResponse>> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const offset = (page - 1) * limit;

    const conditions: string[] = ["role = 'officer'", 'is_verified = false'];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (query.q) {
      conditions.push(
        `(full_name ILIKE $${paramIndex} OR email ILIKE $${paramIndex} OR phone ILIKE $${paramIndex})`,
      );
      values.push(`%${query.q}%`);
      paramIndex++;
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const countResult = await pool.query<{ count: string }>(
      `SELECT COUNT(*) FROM users ${whereClause};`,
      values,
    );
    const total = parseInt(countResult.rows[0].count, 10);

    const dataValues = [...values, limit, offset];
    const dataResult = await pool.query<{
      id: string;
      email: string;
      full_name: string;
      phone: string | null;
      role: 'farmer' | 'officer' | 'admin';
      is_verified: boolean;
      is_active: boolean;
      created_at: Date;
      updated_at: Date;
    }>(
      `SELECT id, email, full_name, phone, role, is_verified, is_active, created_at, updated_at
       FROM users
       ${whereClause}
       ORDER BY created_at ASC
       LIMIT $${paramIndex++} OFFSET $${paramIndex++};`,
      dataValues,
    );

    const officers: AdminUserResponse[] = dataResult.rows.map((row) => ({
      id: row.id,
      email: row.email,
      fullName: row.full_name,
      phone: row.phone,
      role: row.role,
      isVerified: row.is_verified,
      isActive: row.is_active,
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
    }));

    return buildPaginatedResponse(officers, total, page, limit);
  }

  /**
   * Verify an agricultural extension officer.
   * Actions:
   * - approve: sets is_verified = true, is_active = true, locked_until = NULL
   * - reject: sets is_verified = false
   * - suspend: sets is_verified = false, is_active = false, and revokes tokens
   */
  public async verifyOfficer(
    adminUser: UserResponse,
    officerId: string,
    action: 'approve' | 'reject' | 'suspend',
    reason?: string,
    metadata?: RequestMetadata,
  ): Promise<AdminUserResponse> {
    const checkResult = await pool.query<{
      id: string;
      email: string;
      full_name: string;
      role: string;
      is_verified: boolean;
      is_active: boolean;
    }>('SELECT id, email, full_name, role, is_verified, is_active FROM users WHERE id = $1;', [
      officerId,
    ]);

    if (checkResult.rows.length === 0 || checkResult.rows[0].role !== 'officer') {
      throw new NotFound('Officer not found');
    }

    const officer = checkResult.rows[0];

    let updateQuery = '';
    const updateParams: unknown[] = [officerId];

    if (action === 'approve') {
      updateQuery = `
        UPDATE users
        SET is_verified = true, is_active = true, locked_until = NULL, updated_at = NOW()
        WHERE id = $1
        RETURNING id, email, full_name, phone, role, is_verified, is_active, created_at, updated_at;
      `;
    } else if (action === 'reject') {
      updateQuery = `
        UPDATE users
        SET is_verified = false, updated_at = NOW()
        WHERE id = $1
        RETURNING id, email, full_name, phone, role, is_verified, is_active, created_at, updated_at;
      `;
    } else if (action === 'suspend') {
      updateQuery = `
        UPDATE users
        SET is_verified = false, is_active = false, updated_at = NOW()
        WHERE id = $1
        RETURNING id, email, full_name, phone, role, is_verified, is_active, created_at, updated_at;
      `;
    }

    const updateResult = await pool.query<{
      id: string;
      email: string;
      full_name: string;
      phone: string | null;
      role: 'farmer' | 'officer' | 'admin';
      is_verified: boolean;
      is_active: boolean;
      created_at: Date;
      updated_at: Date;
    }>(updateQuery, updateParams);

    // If suspended, revoke all active refresh tokens immediately
    if (action === 'suspend') {
      await pool.query(
        'UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL;',
        [officerId],
      );
    }

    // Record audit event
    await writeAuditLog({
      userId: adminUser.id,
      action: 'update',
      entityType: 'users',
      entityId: officerId,
      metadata: {
        officerVerification: action,
        reason: reason || null,
        officerEmail: officer.email,
      },
      ipAddress: metadata?.ipAddress,
      userAgent: metadata?.userAgent,
    });

    const row = updateResult.rows[0];
    return {
      id: row.id,
      email: row.email,
      fullName: row.full_name,
      phone: row.phone,
      role: row.role,
      isVerified: row.is_verified,
      isActive: row.is_active,
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
    };
  }

  /**
   * System audit log inspection for administrators (metadata only).
   * Strict adherence to AGENTS.md Rules 2 & 6:
   * Admins must never see private farm records, passwords, tokens, cookies, or exact GPS.
   */
  public async getAuditLogs(
    query: AdminAuditQuery,
  ): Promise<PaginatedResponse<AdminAuditLogEntry>> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (query.userId) {
      conditions.push(`a.user_id = $${paramIndex++}`);
      values.push(query.userId);
    }

    if (query.action) {
      conditions.push(`a.action = $${paramIndex++}`);
      values.push(query.action);
    }

    if (query.entityType) {
      conditions.push(`a.entity_type = $${paramIndex++}`);
      values.push(query.entityType);
    }

    if (query.startDate) {
      conditions.push(`a.created_at >= $${paramIndex++}`);
      values.push(new Date(query.startDate));
    }

    if (query.endDate) {
      conditions.push(`a.created_at <= $${paramIndex++}`);
      values.push(new Date(query.endDate));
    }

    if (query.q) {
      conditions.push(
        `(a.entity_type ILIKE $${paramIndex} OR a.action::text ILIKE $${paramIndex})`,
      );
      values.push(`%${query.q}%`);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await pool.query<{ count: string }>(
      `SELECT COUNT(*) FROM audit_logs a ${whereClause};`,
      values,
    );
    const total = parseInt(countResult.rows[0].count, 10);

    const dataValues = [...values, limit, offset];
    const dataResult = await pool.query<{
      id: string;
      user_id: string | null;
      user_email: string | null;
      user_name: string | null;
      action: string;
      entity_type: string;
      entity_id: string | null;
      metadata: Record<string, unknown> | null;
      ip_address: string | null;
      user_agent: string | null;
      created_at: Date;
    }>(
      `SELECT a.id, a.user_id, a.action, a.entity_type, a.entity_id, a.metadata,
              a.ip_address, a.user_agent, a.created_at,
              u.email AS user_email, u.full_name AS user_name
       FROM audit_logs a
       LEFT JOIN users u ON a.user_id = u.id
       ${whereClause}
       ORDER BY a.created_at DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex++};`,
      dataValues,
    );

    const entries: AdminAuditLogEntry[] = dataResult.rows.map((row) => ({
      id: row.id,
      userId: row.user_id,
      userEmail: row.user_email,
      userName: row.user_name,
      action: row.action,
      entityType: row.entity_type,
      entityId: row.entity_id,
      metadata: sanitizeAuditMetadata(row.metadata),
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
      createdAt: row.created_at.toISOString(),
    }));

    return buildPaginatedResponse(entries, total, page, limit);
  }
}

export const adminService = new AdminService();
