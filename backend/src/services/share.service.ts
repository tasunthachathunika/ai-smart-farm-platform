import { pool } from '../db';
import { NotFound, Forbidden, ValidationError } from '../utils/errors';
import { writeAuditLog } from '../utils/audit';
import { buildPaginatedResponse, PaginatedResponse } from '../utils/pagination';
import { UserResponse } from './auth.service';
import { ShareScope } from './authz.service';

export interface SharedPlotData {
  id: string;
  plotId: string;
  plotName?: string;
  district?: string;
  officerId: string;
  officerName?: string;
  officerEmail?: string;
  farmerId?: string;
  farmerName?: string;
  scope: ShareScope;
  scopes?: string[];
  grantedAt: string;
  expiresAt: string | null;
  revokedAt: string | null;
  revokedBy: string | null;
}

export function resolveHighestScope(scopes?: string[], singleScope?: ShareScope): ShareScope {
  const combined = [...(scopes || []), ...(singleScope ? [singleScope] : [])];
  if (combined.includes('full')) return 'full';
  if (combined.includes('advisory') || combined.includes('advisory_notes')) return 'advisory';
  return 'view_only';
}

export class ShareService {
  /**
   * Farmer grants access to one or more plots to a verified extension officer.
   */
  public async createShares(
    user: UserResponse,
    data: {
      officerId: string;
      plotIds: string[];
      scopes?: string[];
      scope?: ShareScope;
      expiresAt?: string | null;
    },
    meta?: { ipAddress?: string; userAgent?: string },
  ): Promise<SharedPlotData[]> {
    if (user.role !== 'farmer') {
      throw new Forbidden('Only registered farmers can grant plot access', 'FORBIDDEN');
    }

    // 1. Verify officer exists, has role 'officer', and is verified by administration
    const { rows: officerRows } = await pool.query<{
      id: string;
      role: string;
      is_verified: boolean;
      full_name: string;
      email: string;
    }>('SELECT id, role, is_verified, full_name, email FROM users WHERE id = $1;', [
      data.officerId,
    ]);

    if (officerRows.length === 0 || officerRows[0].role !== 'officer') {
      throw new ValidationError('Specified extension officer does not exist', [
        { field: 'officerId', message: 'No valid officer found with this ID' },
      ]);
    }

    const officer = officerRows[0];
    if (!officer.is_verified) {
      throw new Forbidden(
        'Selected extension officer is not verified by administration',
        'OFFICER_NOT_VERIFIED',
      );
    }

    // 2. Verify all plotIds belong to this farmer
    const { rows: plotRows } = await pool.query<{
      id: string;
      name: string;
      district: string;
      farmer_id: string;
    }>('SELECT id, name, district, farmer_id FROM plots WHERE id = ANY($1);', [data.plotIds]);

    const ownedPlotsMap = new Map(plotRows.map((p) => [p.id, p]));

    for (const plotId of data.plotIds) {
      const plot = ownedPlotsMap.get(plotId);
      if (!plot || plot.farmer_id !== user.id) {
        // Return 404 to avoid leaking existence of plots (AGENTS.md Rule 1)
        throw new NotFound('Resource not found');
      }
    }

    const highestScope = resolveHighestScope(data.scopes, data.scope);
    const expiresAt = data.expiresAt ? new Date(data.expiresAt) : null;

    const client = await pool.connect();
    const createdShares: SharedPlotData[] = [];

    try {
      await client.query('BEGIN');

      for (const plotId of data.plotIds) {
        const plot = ownedPlotsMap.get(plotId)!;

        // If an active share already exists, revoke the previous one before inserting the new delegation
        await client.query(
          `UPDATE shared_plots
           SET revoked_at = NOW(), revoked_by = $1
           WHERE plot_id = $2 AND officer_id = $3 AND revoked_at IS NULL;`,
          [user.id, plotId, data.officerId],
        );

        const scopesArray = data.scopes && data.scopes.length > 0 ? data.scopes : [highestScope];

        const { rows } = await client.query<{
          id: string;
          plot_id: string;
          officer_id: string;
          scope: ShareScope;
          scopes?: string[];
          granted_at: Date;
          expires_at: Date | null;
          revoked_at: Date | null;
          revoked_by: string | null;
        }>(
          `INSERT INTO shared_plots (plot_id, officer_id, scope, scopes, granted_by, expires_at)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING id, plot_id, officer_id, scope, scopes, granted_at, expires_at, revoked_at, revoked_by;`,
          [plotId, data.officerId, highestScope, scopesArray, user.id, expiresAt],
        );

        const row = rows[0];

        // Audit log in same transaction
        await writeAuditLog(
          {
            userId: user.id,
            action: 'share_grant',
            entityType: 'shared_plots',
            entityId: row.id,
            metadata: {
              plotId: plot.id,
              plotName: plot.name,
              officerId: officer.id,
              officerName: officer.full_name,
              scope: row.scope,
              scopes: scopesArray,
              expiresAt:
                row.expires_at instanceof Date
                  ? !isNaN(row.expires_at.getTime())
                    ? row.expires_at.toISOString()
                    : null
                  : row.expires_at && !isNaN(new Date(String(row.expires_at)).getTime())
                    ? new Date(String(row.expires_at)).toISOString()
                    : null,
            },
            ipAddress: meta?.ipAddress,
            userAgent: meta?.userAgent,
          },
          client,
        );

        createdShares.push({
          id: row.id,
          plotId: row.plot_id,
          plotName: plot.name,
          district: plot.district,
          officerId: row.officer_id,
          officerName: officer.full_name,
          officerEmail: officer.email,
          scope: row.scope,
          scopes: row.scopes || scopesArray,
          grantedAt:
            row.granted_at instanceof Date
              ? row.granted_at.toISOString()
              : new Date().toISOString(),
          expiresAt:
            row.expires_at instanceof Date
              ? row.expires_at.toISOString()
              : row.expires_at
                ? new Date(String(row.expires_at)).toISOString()
                : null,
          revokedAt: null,
          revokedBy: null,
        });
      }

      await client.query('COMMIT');
      return createdShares;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * List Shares
   * Farmers see shares for their plots.
   * Officers see shares delegated to them.
   * Admins are denied with 404 (Admin privacy boundary).
   */
  public async getShares(
    user: UserResponse,
    query: {
      page?: number;
      limit?: number;
      status?: 'active' | 'revoked' | 'expired' | 'all';
      plotId?: string;
      officerId?: string;
    },
  ): Promise<PaginatedResponse<SharedPlotData>> {
    if (user.role === 'admin') {
      throw new NotFound('Resource not found');
    }

    const page = query.page || 1;
    const limit = query.limit || 10;
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (user.role === 'farmer') {
      conditions.push(`p.farmer_id = $${idx++}`);
      params.push(user.id);
    } else if (user.role === 'officer') {
      conditions.push(`sp.officer_id = $${idx++}`);
      params.push(user.id);
    }

    if (query.plotId) {
      conditions.push(`sp.plot_id = $${idx++}`);
      params.push(query.plotId);
    }

    if (query.officerId && user.role === 'farmer') {
      conditions.push(`sp.officer_id = $${idx++}`);
      params.push(query.officerId);
    }

    const status = query.status || 'all';
    if (status === 'active') {
      conditions.push('sp.revoked_at IS NULL AND (sp.expires_at IS NULL OR sp.expires_at > NOW())');
    } else if (status === 'revoked') {
      conditions.push('sp.revoked_at IS NOT NULL');
    } else if (status === 'expired') {
      conditions.push('sp.revoked_at IS NULL AND sp.expires_at <= NOW()');
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRes = await pool.query<{ count: string }>(
      `SELECT COUNT(*)
       FROM shared_plots sp
       JOIN plots p ON p.id = sp.plot_id
       ${whereClause};`,
      params,
    );
    const total = parseInt(countRes.rows[0].count, 10);

    const dataSql = `
      SELECT sp.id, sp.plot_id, sp.officer_id, sp.scope, sp.scopes, sp.granted_at, sp.expires_at,
             sp.revoked_at, sp.revoked_by,
             p.name AS plot_name, p.district, p.farmer_id,
             u_off.full_name AS officer_name, u_off.email AS officer_email,
             u_farm.full_name AS farmer_name
      FROM shared_plots sp
      JOIN plots p ON p.id = sp.plot_id
      JOIN users u_off ON u_off.id = sp.officer_id
      JOIN users u_farm ON u_farm.id = p.farmer_id
      ${whereClause}
      ORDER BY sp.granted_at DESC
      LIMIT $${idx++} OFFSET $${idx++};
    `;
    params.push(limit, offset);

    const { rows } = await pool.query<{
      id: string;
      plot_id: string;
      officer_id: string;
      scope: ShareScope;
      scopes?: string[];
      granted_at: Date;
      expires_at: Date | null;
      revoked_at: Date | null;
      revoked_by: string | null;
      plot_name: string;
      district: string;
      farmer_id: string;
      officer_name: string;
      officer_email: string;
      farmer_name: string;
    }>(dataSql, params);

    const shares: SharedPlotData[] = rows.map((r) => ({
      id: r.id,
      plotId: r.plot_id,
      plotName: r.plot_name,
      district: r.district,
      officerId: r.officer_id,
      officerName: r.officer_name,
      officerEmail: r.officer_email,
      farmerId: r.farmer_id,
      farmerName: r.farmer_name,
      scope: r.scope,
      scopes: r.scopes,
      grantedAt: r.granted_at.toISOString(),
      expiresAt: r.expires_at ? r.expires_at.toISOString() : null,
      revokedAt: r.revoked_at ? r.revoked_at.toISOString() : null,
      revokedBy: r.revoked_by,
    }));

    return buildPaginatedResponse(shares, total, page, limit);
  }

  /**
   * Revoke Share
   * Sets revoked_at and revoked_by in an atomic transaction with audit_logs.
   */
  public async revokeShare(
    user: UserResponse,
    shareId: string,
    meta?: { ipAddress?: string; userAgent?: string },
  ): Promise<{ message: string; revokedAt: string }> {
    if (user.role === 'admin') {
      throw new NotFound('Resource not found');
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const { rows } = await client.query<{
        id: string;
        plot_id: string;
        officer_id: string;
        farmer_id: string;
        plot_name: string;
        scope: ShareScope;
        revoked_at: Date | null;
      }>(
        `SELECT sp.id, sp.plot_id, sp.officer_id, sp.scope, sp.revoked_at,
                p.farmer_id, p.name AS plot_name
         FROM shared_plots sp
         JOIN plots p ON p.id = sp.plot_id
         WHERE sp.id = $1;`,
        [shareId],
      );

      if (rows.length === 0) {
        throw new NotFound('Resource not found');
      }

      const share = rows[0];

      // Farmers can only revoke shares on their own plots
      // Officers can renounce access granted to them
      if (user.role === 'farmer' && share.farmer_id !== user.id) {
        throw new NotFound('Resource not found');
      }
      if (user.role === 'officer' && share.officer_id !== user.id) {
        throw new NotFound('Resource not found');
      }

      const now = new Date();

      // Set revoked_at and revoked_by
      await client.query(
        `UPDATE shared_plots
         SET revoked_at = $1, revoked_by = $2
         WHERE id = $3;`,
        [now, user.id, shareId],
      );

      // In the same transaction: append-only audit log entry
      await writeAuditLog(
        {
          userId: user.id,
          action: 'share_revoke',
          entityType: 'shared_plots',
          entityId: shareId,
          metadata: {
            plotId: share.plot_id,
            plotName: share.plot_name,
            officerId: share.officer_id,
            revokedByRole: user.role,
          },
          ipAddress: meta?.ipAddress,
          userAgent: meta?.userAgent,
        },
        client,
      );

      await client.query('COMMIT');

      return {
        message: 'Share successfully revoked',
        revokedAt: now.toISOString(),
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}

export const shareService = new ShareService();
