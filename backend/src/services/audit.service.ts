import { pool } from '../db';
import { NotFound, Forbidden } from '../utils/errors';
import { buildPaginatedResponse, PaginatedResponse } from '../utils/pagination';
import { UserResponse } from './auth.service';

export interface AuditEventData {
  id: string;
  userId: string | null;
  actorName?: string | null;
  actorRole?: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

export class AuditService {
  /**
   * Retrieves audit events for the farmer's farm records.
   * Includes:
   * - Shares granted and revoked
   * - Officer reads of shared plots (plot_viewed_by_officer)
   * - AI usage on records (ai_used)
   * - Farmer's own entity creates, updates, and deletes
   */
  public async getFarmerAuditEvents(
    user: UserResponse,
    query: {
      page?: number;
      limit?: number;
      action?: string;
      entityType?: string;
      startDate?: string;
      endDate?: string;
      q?: string;
    },
  ): Promise<PaginatedResponse<AuditEventData>> {
    // 1. Admin privacy boundary: Admins cannot read farm audit records
    if (user.role === 'admin') {
      throw new NotFound('Resource not found');
    }

    if (user.role !== 'farmer') {
      throw new Forbidden('Audit trail is available only to farm owners', 'FORBIDDEN');
    }

    const page = query.page || 1;
    const limit = query.limit || 20;
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    // Filter to events pertaining to this farmer:
    // a) Actions performed by the farmer (user_id = $idx::uuid)
    // b) Actions performed on the farmer's plots (e.g. plot_viewed_by_officer)
    // c) Actions on shared_plots referencing the farmer's plots
    // d) Metadata referencing the farmer's ID or plots
    // Explicit casts prevent Postgres "operator does not exist: text = uuid" errors
    conditions.push(`(
      a.user_id = $${idx}::uuid
      OR a.entity_id::uuid IN (SELECT id FROM plots WHERE farmer_id = $${idx}::uuid)
      OR (a.action = 'plot_viewed_by_officer' AND a.entity_id::uuid IN (SELECT id FROM plots WHERE farmer_id = $${idx}::uuid))
      OR (a.entity_type = 'shared_plots' AND a.entity_id::uuid IN (
          SELECT sp.id FROM shared_plots sp
          JOIN plots p ON p.id = sp.plot_id
          WHERE p.farmer_id = $${idx}::uuid
      ))
      OR ((a.metadata->>'farmerId') = $${idx}::text)
    )`);
    params.push(user.id);
    idx++;

    if (query.action) {
      conditions.push(`a.action = $${idx++}`);
      params.push(query.action);
    }

    if (query.entityType) {
      conditions.push(`a.entity_type = $${idx++}`);
      params.push(query.entityType);
    }

    if (query.startDate) {
      conditions.push(`a.created_at >= $${idx++}`);
      params.push(query.startDate);
    }

    if (query.endDate) {
      conditions.push(`a.created_at <= $${idx++}`);
      params.push(query.endDate);
    }

    if (query.q) {
      conditions.push(
        `(a.action::text ILIKE $${idx} OR a.entity_type ILIKE $${idx} OR a.metadata::text ILIKE $${idx})`,
      );
      idx++;
      params.push(`%${query.q}%`);
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    // Total count
    const countRes = await pool.query<{ count: string }>(
      `SELECT COUNT(*) FROM audit_logs a ${whereClause};`,
      params,
    );
    const total = parseInt(countRes.rows[0].count, 10);

    // Data query with actor information joined
    const dataSql = `
      SELECT a.id, a.user_id, a.action, a.entity_type, a.entity_id,
             a.metadata, a.ip_address, a.user_agent, a.created_at,
             u.full_name AS actor_name, u.role AS actor_role
      FROM audit_logs a
      LEFT JOIN users u ON u.id = a.user_id
      ${whereClause}
      ORDER BY a.created_at DESC
      LIMIT $${idx++} OFFSET $${idx++};
    `;
    const dataParams = [...params, limit, offset];

    const { rows } = await pool.query<{
      id: string;
      user_id: string | null;
      action: string;
      entity_type: string;
      entity_id: string | null;
      metadata: Record<string, unknown> | null;
      ip_address: string | null;
      user_agent: string | null;
      created_at: Date;
      actor_name: string | null;
      actor_role: string | null;
    }>(dataSql, dataParams);

    const events: AuditEventData[] = rows.map((r) => ({
      id: r.id,
      userId: r.user_id,
      actorName: r.actor_name,
      actorRole: r.actor_role,
      action: r.action,
      entityType: r.entity_type,
      entityId: r.entity_id,
      metadata: r.metadata,
      ipAddress: r.ip_address,
      userAgent: r.user_agent,
      createdAt: r.created_at.toISOString(),
    }));

    return buildPaginatedResponse(events, total, page, limit);
  }
}

export const auditService = new AuditService();
