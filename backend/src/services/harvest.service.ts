import { pool } from '../db';
import { NotFound } from '../utils/errors';
import { writeAuditLog } from '../utils/audit';
import { buildPaginatedResponse, PaginatedResponse } from '../utils/pagination';
import { UserResponse } from './auth.service';
import { authzService } from './authz.service';
import { cropCycleService } from './cropCycle.service';

export interface HarvestData {
  id: string;
  cycleId: string;
  harvestDate: string;
  quantity: number;
  unit: string;
  qualityGrade: string | null;
  revenue: number | null;
  notes: string | null;
  createdAt: string;
}

export class HarvestService {
  public async getPlotIdForHarvest(harvestId: string): Promise<string> {
    const { rows } = await pool.query<{ plot_id: string }>(
      `SELECT c.plot_id
       FROM harvests h
       JOIN crop_cycles c ON c.id = h.cycle_id
       WHERE h.id = $1;`,
      [harvestId],
    );
    if (rows.length === 0) {
      throw new NotFound('Resource not found');
    }
    return rows[0].plot_id;
  }

  public async createHarvest(
    user: UserResponse,
    data: {
      cycleId: string;
      harvestDate: string;
      quantity: number;
      unit: string;
      qualityGrade?: string | null;
      revenue?: number | null;
      notes?: string | null;
    },
    meta?: { ipAddress?: string; userAgent?: string },
  ): Promise<HarvestData> {
    const plotId = await cropCycleService.getPlotIdForCycle(data.cycleId);
    await authzService.assertPlotAccess(user, plotId, 'advisory');

    const { rows } = await pool.query<{
      id: string;
      cycle_id: string;
      harvest_date: string;
      quantity: string;
      unit: string;
      quality_grade: string | null;
      revenue: string | null;
      notes: string | null;
      created_at: Date;
    }>(
      `INSERT INTO harvests (cycle_id, harvest_date, quantity, unit, quality_grade, revenue, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, cycle_id, harvest_date, quantity, unit, quality_grade, revenue, notes, created_at;`,
      [
        data.cycleId,
        data.harvestDate,
        data.quantity,
        data.unit,
        data.qualityGrade || null,
        data.revenue || null,
        data.notes || null,
      ],
    );

    const row = rows[0];

    await writeAuditLog({
      userId: user.id,
      action: 'create',
      entityType: 'harvests',
      entityId: row.id,
      metadata: { cycleId: row.cycle_id, quantity: row.quantity, unit: row.unit },
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
    });

    return {
      id: row.id,
      cycleId: row.cycle_id,
      harvestDate: row.harvest_date,
      quantity: parseFloat(row.quantity),
      unit: row.unit,
      qualityGrade: row.quality_grade,
      revenue: row.revenue ? parseFloat(row.revenue) : null,
      notes: row.notes,
      createdAt: row.created_at.toISOString(),
    };
  }

  public async getHarvests(
    user: UserResponse,
    query: {
      page?: number;
      limit?: number;
      cycleId?: string;
      qualityGrade?: string;
      q?: string;
    },
  ): Promise<PaginatedResponse<HarvestData>> {
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
      conditions.push(`h.cycle_id = $${idx++}`);
      params.push(query.cycleId);
    } else if (user.role === 'farmer') {
      conditions.push(`h.cycle_id IN (
        SELECT c.id FROM crop_cycles c
        JOIN plots p ON p.id = c.plot_id
        WHERE p.farmer_id = $${idx++}
      )`);
      params.push(user.id);
    } else if (user.role === 'officer') {
      conditions.push(`h.cycle_id IN (
        SELECT c.id FROM crop_cycles c
        JOIN shared_plots sp ON sp.plot_id = c.plot_id
        WHERE sp.officer_id = $${idx++}
          AND sp.revoked_at IS NULL
          AND (sp.expires_at IS NULL OR sp.expires_at > NOW())
      )`);
      params.push(user.id);
    }

    if (query.qualityGrade) {
      conditions.push(`h.quality_grade = $${idx++}`);
      params.push(query.qualityGrade);
    }

    if (query.q) {
      conditions.push(`(h.notes ILIKE $${idx} OR h.quality_grade ILIKE $${idx})`);
      idx++;
      params.push(`%${query.q}%`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRes = await pool.query<{ count: string }>(
      `SELECT COUNT(*) FROM harvests h ${whereClause};`,
      params,
    );
    const total = parseInt(countRes.rows[0].count, 10);

    const dataSql = `
      SELECT h.id, h.cycle_id, h.harvest_date, h.quantity, h.unit, h.quality_grade, h.revenue, h.notes, h.created_at
      FROM harvests h
      ${whereClause}
      ORDER BY h.harvest_date DESC, h.created_at DESC
      LIMIT $${idx++} OFFSET $${idx++};
    `;
    params.push(limit, offset);

    const { rows } = await pool.query<{
      id: string;
      cycle_id: string;
      harvest_date: string;
      quantity: string;
      unit: string;
      quality_grade: string | null;
      revenue: string | null;
      notes: string | null;
      created_at: Date;
    }>(dataSql, params);

    const harvests: HarvestData[] = rows.map((r) => ({
      id: r.id,
      cycleId: r.cycle_id,
      harvestDate: r.harvest_date,
      quantity: parseFloat(r.quantity),
      unit: r.unit,
      qualityGrade: r.quality_grade,
      revenue: r.revenue ? parseFloat(r.revenue) : null,
      notes: r.notes,
      createdAt: r.created_at.toISOString(),
    }));

    return buildPaginatedResponse(harvests, total, page, limit);
  }

  public async getHarvestById(user: UserResponse, harvestId: string): Promise<HarvestData> {
    const plotId = await this.getPlotIdForHarvest(harvestId);
    await authzService.assertPlotAccess(user, plotId, 'view_only');

    const { rows } = await pool.query<{
      id: string;
      cycle_id: string;
      harvest_date: string;
      quantity: string;
      unit: string;
      quality_grade: string | null;
      revenue: string | null;
      notes: string | null;
      created_at: Date;
    }>('SELECT * FROM harvests WHERE id = $1;', [harvestId]);

    const r = rows[0];
    return {
      id: r.id,
      cycleId: r.cycle_id,
      harvestDate: r.harvest_date,
      quantity: parseFloat(r.quantity),
      unit: r.unit,
      qualityGrade: r.quality_grade,
      revenue: r.revenue ? parseFloat(r.revenue) : null,
      notes: r.notes,
      createdAt: r.created_at.toISOString(),
    };
  }

  public async updateHarvest(
    user: UserResponse,
    harvestId: string,
    data: {
      harvestDate?: string;
      quantity?: number;
      unit?: string;
      qualityGrade?: string | null;
      revenue?: number | null;
      notes?: string | null;
    },
    meta?: { ipAddress?: string; userAgent?: string },
  ): Promise<HarvestData> {
    const plotId = await this.getPlotIdForHarvest(harvestId);
    await authzService.assertPlotAccess(user, plotId, 'advisory');

    const updates: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (data.harvestDate !== undefined) {
      updates.push(`harvest_date = $${idx++}`);
      params.push(data.harvestDate);
    }
    if (data.quantity !== undefined) {
      updates.push(`quantity = $${idx++}`);
      params.push(data.quantity);
    }
    if (data.unit !== undefined) {
      updates.push(`unit = $${idx++}`);
      params.push(data.unit);
    }
    if (data.qualityGrade !== undefined) {
      updates.push(`quality_grade = $${idx++}`);
      params.push(data.qualityGrade);
    }
    if (data.revenue !== undefined) {
      updates.push(`revenue = $${idx++}`);
      params.push(data.revenue);
    }
    if (data.notes !== undefined) {
      updates.push(`notes = $${idx++}`);
      params.push(data.notes);
    }

    params.push(harvestId);

    const { rows } = await pool.query<{
      id: string;
      cycle_id: string;
      harvest_date: string;
      quantity: string;
      unit: string;
      quality_grade: string | null;
      revenue: string | null;
      notes: string | null;
      created_at: Date;
    }>(`UPDATE harvests SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *;`, params);

    const r = rows[0];

    await writeAuditLog({
      userId: user.id,
      action: 'update',
      entityType: 'harvests',
      entityId: harvestId,
      metadata: { updatedFields: Object.keys(data) },
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
    });

    return {
      id: r.id,
      cycleId: r.cycle_id,
      harvestDate: r.harvest_date,
      quantity: parseFloat(r.quantity),
      unit: r.unit,
      qualityGrade: r.quality_grade,
      revenue: r.revenue ? parseFloat(r.revenue) : null,
      notes: r.notes,
      createdAt: r.created_at.toISOString(),
    };
  }

  public async deleteHarvest(
    user: UserResponse,
    harvestId: string,
    meta?: { ipAddress?: string; userAgent?: string },
  ): Promise<void> {
    const plotId = await this.getPlotIdForHarvest(harvestId);
    await authzService.assertPlotAccess(user, plotId, 'full');

    await pool.query('DELETE FROM harvests WHERE id = $1;', [harvestId]);

    await writeAuditLog({
      userId: user.id,
      action: 'delete',
      entityType: 'harvests',
      entityId: harvestId,
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
    });
  }
}

export const harvestService = new HarvestService();
