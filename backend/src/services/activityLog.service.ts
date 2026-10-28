import { pool } from '../db';
import { NotFound } from '../utils/errors';
import { writeAuditLog } from '../utils/audit';
import { buildPaginatedResponse, PaginatedResponse } from '../utils/pagination';
import { UserResponse } from './auth.service';
import { authzService } from './authz.service';
import { cropCycleService } from './cropCycle.service';

export interface ActivityLogData {
  id: string;
  cycleId: string;
  logType: string;
  logDate: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export class ActivityLogService {
  public async getPlotIdForLog(logId: string): Promise<string> {
    const { rows } = await pool.query<{ plot_id: string }>(
      `SELECT c.plot_id
       FROM activity_logs l
       JOIN crop_cycles c ON c.id = l.cycle_id
       WHERE l.id = $1;`,
      [logId],
    );
    if (rows.length === 0) {
      throw new NotFound('Resource not found');
    }
    return rows[0].plot_id;
  }

  public async createActivityLog(
    user: UserResponse,
    data: {
      cycleId: string;
      logType: string;
      logDate?: string;
      notes: string;
    },
    meta?: { ipAddress?: string; userAgent?: string },
  ): Promise<ActivityLogData> {
    const plotId = await cropCycleService.getPlotIdForCycle(data.cycleId);
    await authzService.assertPlotAccess(user, plotId, 'advisory');

    const logDate = data.logDate || new Date().toISOString().split('T')[0];

    const { rows } = await pool.query<{
      id: string;
      cycle_id: string;
      log_type: string;
      log_date: string;
      notes: string;
      created_at: Date;
      updated_at: Date;
    }>(
      `INSERT INTO activity_logs (cycle_id, log_type, log_date, notes)
       VALUES ($1, $2, $3, $4)
       RETURNING id, cycle_id, log_type, log_date, notes, created_at, updated_at;`,
      [data.cycleId, data.logType, logDate, data.notes],
    );

    const row = rows[0];

    await writeAuditLog({
      userId: user.id,
      action: 'create',
      entityType: 'activity_logs',
      entityId: row.id,
      metadata: { cycleId: row.cycle_id, logType: row.log_type },
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
    });

    return {
      id: row.id,
      cycleId: row.cycle_id,
      logType: row.log_type,
      logDate: row.log_date,
      notes: row.notes,
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
    };
  }

  public async getActivityLogs(
    user: UserResponse,
    query: {
      page?: number;
      limit?: number;
      cycleId?: string;
      type?: string;
      date?: string;
      startDate?: string;
      endDate?: string;
      q?: string;
    },
  ): Promise<PaginatedResponse<ActivityLogData>> {
    if (user.role === 'admin') {
      throw new NotFound('Resource not found');
    }

    if (query.cycleId) {
      const plotId = await cropCycleService.getPlotIdForCycle(query.cycleId);
      await authzService.assertPlotAccess(user, plotId, 'view_only');
    }

    const page = query.page || 1;
    const limit = query.limit || 10;
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (query.cycleId) {
      conditions.push(`l.cycle_id = $${idx++}`);
      params.push(query.cycleId);
    } else if (user.role === 'farmer') {
      conditions.push(`l.cycle_id IN (
        SELECT c.id FROM crop_cycles c
        JOIN plots p ON p.id = c.plot_id
        WHERE p.farmer_id = $${idx++}
      )`);
      params.push(user.id);
    } else if (user.role === 'officer') {
      conditions.push(`l.cycle_id IN (
        SELECT c.id FROM crop_cycles c
        JOIN shared_plots sp ON sp.plot_id = c.plot_id
        WHERE sp.officer_id = $${idx++}
          AND sp.revoked_at IS NULL
          AND (sp.expires_at IS NULL OR sp.expires_at > NOW())
      )`);
      params.push(user.id);
    }

    // Filter by type
    if (query.type) {
      conditions.push(`l.log_type = $${idx++}`);
      params.push(query.type);
    }

    // Filter by single date
    if (query.date) {
      conditions.push(`l.log_date = $${idx++}`);
      params.push(query.date);
    }

    // Filter by date range
    if (query.startDate) {
      conditions.push(`l.log_date >= $${idx++}`);
      params.push(query.startDate);
    }
    if (query.endDate) {
      conditions.push(`l.log_date <= $${idx++}`);
      params.push(query.endDate);
    }

    // Search by text in notes
    if (query.q) {
      conditions.push(`l.notes ILIKE $${idx++}`);
      params.push(`%${query.q}%`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRes = await pool.query<{ count: string }>(
      `SELECT COUNT(*) FROM activity_logs l ${whereClause};`,
      params,
    );
    const total = parseInt(countRes.rows[0].count, 10);

    const dataSql = `
      SELECT l.id, l.cycle_id, l.log_type, l.log_date, l.notes, l.created_at, l.updated_at
      FROM activity_logs l
      ${whereClause}
      ORDER BY l.log_date DESC, l.created_at DESC
      LIMIT $${idx++} OFFSET $${idx++};
    `;
    params.push(limit, offset);

    const { rows } = await pool.query<{
      id: string;
      cycle_id: string;
      log_type: string;
      log_date: string;
      notes: string;
      created_at: Date;
      updated_at: Date;
    }>(dataSql, params);

    const logs: ActivityLogData[] = rows.map((r) => ({
      id: r.id,
      cycleId: r.cycle_id,
      logType: r.log_type,
      logDate: r.log_date,
      notes: r.notes,
      createdAt: r.created_at.toISOString(),
      updatedAt: r.updated_at.toISOString(),
    }));

    return buildPaginatedResponse(logs, total, page, limit);
  }

  public async getActivityLogById(user: UserResponse, logId: string): Promise<ActivityLogData> {
    const plotId = await this.getPlotIdForLog(logId);
    await authzService.assertPlotAccess(user, plotId, 'view_only');

    const { rows } = await pool.query<{
      id: string;
      cycle_id: string;
      log_type: string;
      log_date: string;
      notes: string;
      created_at: Date;
      updated_at: Date;
    }>('SELECT * FROM activity_logs WHERE id = $1;', [logId]);

    const r = rows[0];
    return {
      id: r.id,
      cycleId: r.cycle_id,
      logType: r.log_type,
      logDate: r.log_date,
      notes: r.notes,
      createdAt: r.created_at.toISOString(),
      updatedAt: r.updated_at.toISOString(),
    };
  }

  public async updateActivityLog(
    user: UserResponse,
    logId: string,
    data: {
      logType?: string;
      logDate?: string;
      notes?: string;
    },
    meta?: { ipAddress?: string; userAgent?: string },
  ): Promise<ActivityLogData> {
    const plotId = await this.getPlotIdForLog(logId);
    await authzService.assertPlotAccess(user, plotId, 'advisory');

    const updates: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (data.logType !== undefined) {
      updates.push(`log_type = $${idx++}`);
      params.push(data.logType);
    }
    if (data.logDate !== undefined) {
      updates.push(`log_date = $${idx++}`);
      params.push(data.logDate);
    }
    if (data.notes !== undefined) {
      updates.push(`notes = $${idx++}`);
      params.push(data.notes);
    }

    updates.push('updated_at = NOW()');
    params.push(logId);

    const { rows } = await pool.query<{
      id: string;
      cycle_id: string;
      log_type: string;
      log_date: string;
      notes: string;
      created_at: Date;
      updated_at: Date;
    }>(`UPDATE activity_logs SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *;`, params);

    const r = rows[0];

    await writeAuditLog({
      userId: user.id,
      action: 'update',
      entityType: 'activity_logs',
      entityId: logId,
      metadata: { updatedFields: Object.keys(data) },
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
    });

    return {
      id: r.id,
      cycleId: r.cycle_id,
      logType: r.log_type,
      logDate: r.log_date,
      notes: r.notes,
      createdAt: r.created_at.toISOString(),
      updatedAt: r.updated_at.toISOString(),
    };
  }

  public async deleteActivityLog(
    user: UserResponse,
    logId: string,
    meta?: { ipAddress?: string; userAgent?: string },
  ): Promise<void> {
    const plotId = await this.getPlotIdForLog(logId);
    await authzService.assertPlotAccess(user, plotId, 'full');

    await pool.query('DELETE FROM activity_logs WHERE id = $1;', [logId]);

    await writeAuditLog({
      userId: user.id,
      action: 'delete',
      entityType: 'activity_logs',
      entityId: logId,
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
    });
  }
}

export const activityLogService = new ActivityLogService();
