import { pool } from '../db';
import { logger } from './logger';

export interface AuditLogParams {
  userId?: string;
  action:
    | 'create'
    | 'read'
    | 'update'
    | 'delete'
    | 'login'
    | 'logout'
    | 'share_grant'
    | 'share_revoke'
    | 'plot_viewed_by_officer'
    | 'ai_used';
  entityType: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

export interface Queryable {
  query: typeof pool.query;
}

/**
 * Creates an append-only audit record in audit_logs.
 * Never logs raw secrets, tokens, passwords, or exact GPS coordinates.
 */
export async function writeAuditLog(params: AuditLogParams, db: Queryable = pool): Promise<void> {
  try {
    await db.query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, metadata, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7);`,
      [
        params.userId || null,
        params.action,
        params.entityType,
        params.entityId || null,
        params.metadata ? JSON.stringify(params.metadata) : null,
        params.ipAddress || null,
        params.userAgent || null,
      ],
    );
  } catch (err) {
    logger.error({ err }, 'Failed to insert audit log entry');
    // Audit logging failure should not silently fail critical security operations
    throw err;
  }
}
