import { pool } from '../db';
import { NotFound } from '../utils/errors';
import { writeAuditLog } from '../utils/audit';
import { buildPaginatedResponse, PaginatedResponse } from '../utils/pagination';
import { UserResponse } from './auth.service';
import { authzService } from './authz.service';

export interface CropCycleData {
  id: string;
  plotId: string;
  cropName: string;
  variety: string | null;
  startDate: string;
  endDate: string | null;
  status: 'planned' | 'active' | 'completed' | 'abandoned';
  estimatedYieldKg: number | null;
  createdAt: string;
  updatedAt: string;
}

export class CropCycleService {
  /**
   * Helper to resolve plot_id for a given cycle
   */
  public async getPlotIdForCycle(cycleId: string): Promise<string> {
    const { rows } = await pool.query<{ plot_id: string }>(
      'SELECT plot_id FROM crop_cycles WHERE id = $1;',
      [cycleId],
    );
    if (rows.length === 0) {
      throw new NotFound('Resource not found');
    }
    return rows[0].plot_id;
  }

  public async createCropCycle(
    user: UserResponse,
    data: {
      plotId: string;
      cropName: string;
      variety?: string;
      startDate: string;
      endDate?: string | null;
      status?: 'planned' | 'active' | 'completed' | 'abandoned';
      estimatedYieldKg?: number | null;
    },
    meta?: { ipAddress?: string; userAgent?: string },
  ): Promise<CropCycleData> {
    // Assert authorization on plot
    await authzService.assertPlotAccess(user, data.plotId, 'advisory');

    const { rows } = await pool.query<{
      id: string;
      plot_id: string;
      crop_name: string;
      variety: string | null;
      start_date: string;
      end_date: string | null;
      status: 'planned' | 'active' | 'completed' | 'abandoned';
      estimated_yield_kg: string | null;
      created_at: Date;
      updated_at: Date;
    }>(
      `INSERT INTO crop_cycles (plot_id, crop_name, variety, start_date, end_date, status, estimated_yield_kg)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, plot_id, crop_name, variety, start_date, end_date, status, estimated_yield_kg, created_at, updated_at;`,
      [
        data.plotId,
        data.cropName,
        data.variety || null,
        data.startDate,
        data.endDate || null,
        data.status || 'planned',
        data.estimatedYieldKg || null,
      ],
    );

    const row = rows[0];

    await writeAuditLog({
      userId: user.id,
      action: 'create',
      entityType: 'crop_cycles',
      entityId: row.id,
      metadata: { plotId: row.plot_id, cropName: row.crop_name },
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
    });

    return {
      id: row.id,
      plotId: row.plot_id,
      cropName: row.crop_name,
      variety: row.variety,
      startDate: row.start_date,
      endDate: row.end_date,
      status: row.status,
      estimatedYieldKg: row.estimated_yield_kg ? parseFloat(row.estimated_yield_kg) : null,
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
    };
  }

  public async getCropCycles(
    user: UserResponse,
    query: {
      page?: number;
      limit?: number;
      plotId?: string;
      status?: 'planned' | 'active' | 'completed' | 'abandoned';
      cropName?: string;
      q?: string;
    },
  ): Promise<PaginatedResponse<CropCycleData>> {
    if (user.role === 'admin') {
      throw new NotFound('Resource not found');
    }

    if (query.plotId) {
      // Validate access on specified plot
      await authzService.assertPlotAccess(user, query.plotId, 'view_only');
    }

    const page = query.page || 1;
    const limit = query.limit || 10;
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (query.plotId) {
      conditions.push(`c.plot_id = $${idx++}`);
      params.push(query.plotId);
    } else if (user.role === 'farmer') {
      conditions.push(`c.plot_id IN (SELECT id FROM plots WHERE farmer_id = $${idx++})`);
      params.push(user.id);
    } else if (user.role === 'officer') {
      conditions.push(`c.plot_id IN (
        SELECT sp.plot_id FROM shared_plots sp
        WHERE sp.officer_id = $${idx++}
          AND sp.revoked_at IS NULL
          AND (sp.expires_at IS NULL OR sp.expires_at > NOW())
      )`);
      params.push(user.id);
    }

    if (query.status) {
      conditions.push(`c.status = $${idx++}`);
      params.push(query.status);
    }

    if (query.cropName) {
      conditions.push(`c.crop_name ILIKE $${idx++}`);
      params.push(`%${query.cropName}%`);
    }

    if (query.q) {
      conditions.push(`(c.crop_name ILIKE $${idx} OR c.variety ILIKE $${idx})`);
      idx++;
      params.push(`%${query.q}%`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRes = await pool.query<{ count: string }>(
      `SELECT COUNT(*) FROM crop_cycles c ${whereClause};`,
      params,
    );
    const total = parseInt(countRes.rows[0].count, 10);

    const dataSql = `
      SELECT c.id, c.plot_id, c.crop_name, c.variety, c.start_date, c.end_date, c.status,
             c.estimated_yield_kg, c.created_at, c.updated_at
      FROM crop_cycles c
      ${whereClause}
      ORDER BY c.start_date DESC
      LIMIT $${idx++} OFFSET $${idx++};
    `;
    params.push(limit, offset);

    const { rows } = await pool.query<{
      id: string;
      plot_id: string;
      crop_name: string;
      variety: string | null;
      start_date: string;
      end_date: string | null;
      status: 'planned' | 'active' | 'completed' | 'abandoned';
      estimated_yield_kg: string | null;
      created_at: Date;
      updated_at: Date;
    }>(dataSql, params);

    const cycles: CropCycleData[] = rows.map((r) => ({
      id: r.id,
      plotId: r.plot_id,
      cropName: r.crop_name,
      variety: r.variety,
      startDate: r.start_date,
      endDate: r.end_date,
      status: r.status,
      estimatedYieldKg: r.estimated_yield_kg ? parseFloat(r.estimated_yield_kg) : null,
      createdAt: r.created_at.toISOString(),
      updatedAt: r.updated_at.toISOString(),
    }));

    return buildPaginatedResponse(cycles, total, page, limit);
  }

  public async getCropCycleById(user: UserResponse, cycleId: string): Promise<CropCycleData> {
    const plotId = await this.getPlotIdForCycle(cycleId);
    await authzService.assertPlotAccess(user, plotId, 'view_only');

    const { rows } = await pool.query<{
      id: string;
      plot_id: string;
      crop_name: string;
      variety: string | null;
      start_date: string;
      end_date: string | null;
      status: 'planned' | 'active' | 'completed' | 'abandoned';
      estimated_yield_kg: string | null;
      created_at: Date;
      updated_at: Date;
    }>('SELECT * FROM crop_cycles WHERE id = $1;', [cycleId]);

    const r = rows[0];
    return {
      id: r.id,
      plotId: r.plot_id,
      cropName: r.crop_name,
      variety: r.variety,
      startDate: r.start_date,
      endDate: r.end_date,
      status: r.status,
      estimatedYieldKg: r.estimated_yield_kg ? parseFloat(r.estimated_yield_kg) : null,
      createdAt: r.created_at.toISOString(),
      updatedAt: r.updated_at.toISOString(),
    };
  }

  public async updateCropCycle(
    user: UserResponse,
    cycleId: string,
    data: {
      cropName?: string;
      variety?: string;
      startDate?: string;
      endDate?: string | null;
      status?: 'planned' | 'active' | 'completed' | 'abandoned';
      estimatedYieldKg?: number | null;
    },
    meta?: { ipAddress?: string; userAgent?: string },
  ): Promise<CropCycleData> {
    const plotId = await this.getPlotIdForCycle(cycleId);
    await authzService.assertPlotAccess(user, plotId, 'advisory');

    const updates: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (data.cropName !== undefined) {
      updates.push(`crop_name = $${idx++}`);
      params.push(data.cropName);
    }
    if (data.variety !== undefined) {
      updates.push(`variety = $${idx++}`);
      params.push(data.variety);
    }
    if (data.startDate !== undefined) {
      updates.push(`start_date = $${idx++}`);
      params.push(data.startDate);
    }
    if (data.endDate !== undefined) {
      updates.push(`end_date = $${idx++}`);
      params.push(data.endDate);
    }
    if (data.status !== undefined) {
      updates.push(`status = $${idx++}`);
      params.push(data.status);
    }
    if (data.estimatedYieldKg !== undefined) {
      updates.push(`estimated_yield_kg = $${idx++}`);
      params.push(data.estimatedYieldKg);
    }

    updates.push('updated_at = NOW()');
    params.push(cycleId);

    const { rows } = await pool.query<{
      id: string;
      plot_id: string;
      crop_name: string;
      variety: string | null;
      start_date: string;
      end_date: string | null;
      status: 'planned' | 'active' | 'completed' | 'abandoned';
      estimated_yield_kg: string | null;
      created_at: Date;
      updated_at: Date;
    }>(
      `UPDATE crop_cycles SET ${updates.join(', ')} WHERE id = $${idx}
       RETURNING *;`,
      params,
    );

    const r = rows[0];

    await writeAuditLog({
      userId: user.id,
      action: 'update',
      entityType: 'crop_cycles',
      entityId: cycleId,
      metadata: { updatedFields: Object.keys(data) },
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
    });

    return {
      id: r.id,
      plotId: r.plot_id,
      cropName: r.crop_name,
      variety: r.variety,
      startDate: r.start_date,
      endDate: r.end_date,
      status: r.status,
      estimatedYieldKg: r.estimated_yield_kg ? parseFloat(r.estimated_yield_kg) : null,
      createdAt: r.created_at.toISOString(),
      updatedAt: r.updated_at.toISOString(),
    };
  }

  public async deleteCropCycle(
    user: UserResponse,
    cycleId: string,
    meta?: { ipAddress?: string; userAgent?: string },
  ): Promise<void> {
    const plotId = await this.getPlotIdForCycle(cycleId);
    await authzService.assertPlotAccess(user, plotId, 'full');

    await pool.query('DELETE FROM crop_cycles WHERE id = $1;', [cycleId]);

    await writeAuditLog({
      userId: user.id,
      action: 'delete',
      entityType: 'crop_cycles',
      entityId: cycleId,
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
    });
  }
}

export const cropCycleService = new CropCycleService();
