import { pool } from '../db';
import { NotFound } from '../utils/errors';
import { writeAuditLog } from '../utils/audit';
import { buildPaginatedResponse, PaginatedResponse } from '../utils/pagination';
import { UserResponse } from './auth.service';
import { authzService } from './authz.service';
import { cropCycleService } from './cropCycle.service';

export interface InputApplicationData {
  id: string;
  cycleId: string;
  inputType: string;
  name: string;
  quantity: number;
  unit: string;
  applicationDate: string;
  cost: number | null;
  createdAt: string;
}

export class InputApplicationService {
  public async getPlotIdForInput(inputId: string): Promise<string> {
    const { rows } = await pool.query<{ plot_id: string }>(
      `SELECT c.plot_id
       FROM input_applications i
       JOIN crop_cycles c ON c.id = i.cycle_id
       WHERE i.id = $1;`,
      [inputId],
    );
    if (rows.length === 0) {
      throw new NotFound('Resource not found');
    }
    return rows[0].plot_id;
  }

  public async createInputApplication(
    user: UserResponse,
    data: {
      cycleId: string;
      inputType: string;
      name: string;
      quantity: number;
      unit: string;
      applicationDate: string;
      cost?: number | null;
    },
    meta?: { ipAddress?: string; userAgent?: string },
  ): Promise<InputApplicationData> {
    const plotId = await cropCycleService.getPlotIdForCycle(data.cycleId);
    await authzService.assertPlotAccess(user, plotId, 'advisory');

    const { rows } = await pool.query<{
      id: string;
      cycle_id: string;
      input_type: string;
      name: string;
      quantity: string;
      unit: string;
      application_date: string;
      cost: string | null;
      created_at: Date;
    }>(
      `INSERT INTO input_applications (cycle_id, input_type, name, quantity, unit, application_date, cost)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, cycle_id, input_type, name, quantity, unit, application_date, cost, created_at;`,
      [
        data.cycleId,
        data.inputType,
        data.name,
        data.quantity,
        data.unit,
        data.applicationDate,
        data.cost || null,
      ],
    );

    const row = rows[0];

    await writeAuditLog({
      userId: user.id,
      action: 'create',
      entityType: 'input_applications',
      entityId: row.id,
      metadata: { cycleId: row.cycle_id, productName: row.name, quantity: row.quantity },
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
    });

    return {
      id: row.id,
      cycleId: row.cycle_id,
      inputType: row.input_type,
      name: row.name,
      quantity: parseFloat(row.quantity),
      unit: row.unit,
      applicationDate: row.application_date,
      cost: row.cost ? parseFloat(row.cost) : null,
      createdAt: row.created_at.toISOString(),
    };
  }

  public async getInputApplications(
    user: UserResponse,
    query: {
      page?: number;
      limit?: number;
      cycleId?: string;
      type?: string;
      q?: string;
    },
  ): Promise<PaginatedResponse<InputApplicationData>> {
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
      conditions.push(`i.cycle_id = $${idx++}`);
      params.push(query.cycleId);
    } else if (user.role === 'farmer') {
      conditions.push(`i.cycle_id IN (
        SELECT c.id FROM crop_cycles c
        JOIN plots p ON p.id = c.plot_id
        WHERE p.farmer_id = $${idx++}
      )`);
      params.push(user.id);
    } else if (user.role === 'officer') {
      conditions.push(`i.cycle_id IN (
        SELECT c.id FROM crop_cycles c
        JOIN shared_plots sp ON sp.plot_id = c.plot_id
        WHERE sp.officer_id = $${idx++}
          AND sp.revoked_at IS NULL
          AND (sp.expires_at IS NULL OR sp.expires_at > NOW())
      )`);
      params.push(user.id);
    }

    if (query.type) {
      conditions.push(`i.input_type = $${idx++}`);
      params.push(query.type);
    }

    if (query.q) {
      conditions.push(`i.name ILIKE $${idx++}`);
      params.push(`%${query.q}%`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRes = await pool.query<{ count: string }>(
      `SELECT COUNT(*) FROM input_applications i ${whereClause};`,
      params,
    );
    const total = parseInt(countRes.rows[0].count, 10);

    const dataSql = `
      SELECT i.id, i.cycle_id, i.input_type, i.name, i.quantity, i.unit, i.application_date, i.cost, i.created_at
      FROM input_applications i
      ${whereClause}
      ORDER BY i.application_date DESC, i.created_at DESC
      LIMIT $${idx++} OFFSET $${idx++};
    `;
    params.push(limit, offset);

    const { rows } = await pool.query<{
      id: string;
      cycle_id: string;
      input_type: string;
      name: string;
      quantity: string;
      unit: string;
      application_date: string;
      cost: string | null;
      created_at: Date;
    }>(dataSql, params);

    const inputs: InputApplicationData[] = rows.map((r) => ({
      id: r.id,
      cycleId: r.cycle_id,
      inputType: r.input_type,
      name: r.name,
      quantity: parseFloat(r.quantity),
      unit: r.unit,
      applicationDate: r.application_date,
      cost: r.cost ? parseFloat(r.cost) : null,
      createdAt: r.created_at.toISOString(),
    }));

    return buildPaginatedResponse(inputs, total, page, limit);
  }

  public async getInputApplicationById(
    user: UserResponse,
    inputId: string,
  ): Promise<InputApplicationData> {
    const plotId = await this.getPlotIdForInput(inputId);
    await authzService.assertPlotAccess(user, plotId, 'view_only');

    const { rows } = await pool.query<{
      id: string;
      cycle_id: string;
      input_type: string;
      name: string;
      quantity: string;
      unit: string;
      application_date: string;
      cost: string | null;
      created_at: Date;
    }>('SELECT * FROM input_applications WHERE id = $1;', [inputId]);

    const r = rows[0];
    return {
      id: r.id,
      cycleId: r.cycle_id,
      inputType: r.input_type,
      name: r.name,
      quantity: parseFloat(r.quantity),
      unit: r.unit,
      applicationDate: r.application_date,
      cost: r.cost ? parseFloat(r.cost) : null,
      createdAt: r.created_at.toISOString(),
    };
  }

  public async updateInputApplication(
    user: UserResponse,
    inputId: string,
    data: {
      inputType?: string;
      name?: string;
      quantity?: number;
      unit?: string;
      applicationDate?: string;
      cost?: number | null;
    },
    meta?: { ipAddress?: string; userAgent?: string },
  ): Promise<InputApplicationData> {
    const plotId = await this.getPlotIdForInput(inputId);
    await authzService.assertPlotAccess(user, plotId, 'advisory');

    const updates: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (data.inputType !== undefined) {
      updates.push(`input_type = $${idx++}`);
      params.push(data.inputType);
    }
    if (data.name !== undefined) {
      updates.push(`name = $${idx++}`);
      params.push(data.name);
    }
    if (data.quantity !== undefined) {
      updates.push(`quantity = $${idx++}`);
      params.push(data.quantity);
    }
    if (data.unit !== undefined) {
      updates.push(`unit = $${idx++}`);
      params.push(data.unit);
    }
    if (data.applicationDate !== undefined) {
      updates.push(`application_date = $${idx++}`);
      params.push(data.applicationDate);
    }
    if (data.cost !== undefined) {
      updates.push(`cost = $${idx++}`);
      params.push(data.cost);
    }

    params.push(inputId);

    const { rows } = await pool.query<{
      id: string;
      cycle_id: string;
      input_type: string;
      name: string;
      quantity: string;
      unit: string;
      application_date: string;
      cost: string | null;
      created_at: Date;
    }>(
      `UPDATE input_applications SET ${updates.join(', ')} WHERE id = $${idx}
       RETURNING *;`,
      params,
    );

    const r = rows[0];

    await writeAuditLog({
      userId: user.id,
      action: 'update',
      entityType: 'input_applications',
      entityId: inputId,
      metadata: { updatedFields: Object.keys(data) },
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
    });

    return {
      id: r.id,
      cycleId: r.cycle_id,
      inputType: r.input_type,
      name: r.name,
      quantity: parseFloat(r.quantity),
      unit: r.unit,
      applicationDate: r.application_date,
      cost: r.cost ? parseFloat(r.cost) : null,
      createdAt: r.created_at.toISOString(),
    };
  }

  public async deleteInputApplication(
    user: UserResponse,
    inputId: string,
    meta?: { ipAddress?: string; userAgent?: string },
  ): Promise<void> {
    const plotId = await this.getPlotIdForInput(inputId);
    await authzService.assertPlotAccess(user, plotId, 'full');

    await pool.query('DELETE FROM input_applications WHERE id = $1;', [inputId]);

    await writeAuditLog({
      userId: user.id,
      action: 'delete',
      entityType: 'input_applications',
      entityId: inputId,
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
    });
  }
}

export const inputApplicationService = new InputApplicationService();
