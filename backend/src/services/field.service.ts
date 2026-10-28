import { pool } from '../db';
import { NotFound, Forbidden } from '../utils/errors';
import { writeAuditLog } from '../utils/audit';
import { buildPaginatedResponse, PaginatedResponse } from '../utils/pagination';
import { UserResponse } from './auth.service';

export interface FieldData {
  id: string;
  farmerId: string;
  name: string;
  district: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export class FieldService {
  public async createField(
    user: UserResponse,
    data: { name: string; district: string; description?: string },
    meta?: { ipAddress?: string; userAgent?: string },
  ): Promise<FieldData> {
    if (user.role !== 'farmer') {
      throw new Forbidden('Only registered farmers can create fields', 'FORBIDDEN');
    }

    const { rows } = await pool.query<{
      id: string;
      farmer_id: string;
      name: string;
      district: string;
      description: string | null;
      created_at: Date;
      updated_at: Date;
    }>(
      `INSERT INTO fields (farmer_id, name, district, description)
       VALUES ($1, $2, $3, $4)
       RETURNING id, farmer_id, name, district, description, created_at, updated_at;`,
      [user.id, data.name, data.district, data.description || null],
    );

    const row = rows[0];

    await writeAuditLog({
      userId: user.id,
      action: 'create',
      entityType: 'fields',
      entityId: row.id,
      metadata: { name: row.name, district: row.district },
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
    });

    return {
      id: row.id,
      farmerId: row.farmer_id,
      name: row.name,
      district: row.district,
      description: row.description,
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
    };
  }

  public async getFields(
    user: UserResponse,
    query: { page?: number; limit?: number; district?: string; q?: string },
  ): Promise<PaginatedResponse<FieldData>> {
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
      conditions.push(`f.farmer_id = $${idx++}`);
      params.push(user.id);
    } else if (user.role === 'officer') {
      // Officers only see fields containing plots shared with them
      conditions.push(`EXISTS (
        SELECT 1 FROM plots p
        JOIN shared_plots sp ON sp.plot_id = p.id
        WHERE p.field_id = f.id
          AND sp.officer_id = $${idx++}
          AND sp.revoked_at IS NULL
          AND (sp.expires_at IS NULL OR sp.expires_at > NOW())
      )`);
      params.push(user.id);
    }

    if (query.district) {
      conditions.push(`f.district ILIKE $${idx++}`);
      params.push(`%${query.district}%`);
    }

    if (query.q) {
      conditions.push(`(f.name ILIKE $${idx} OR f.description ILIKE $${idx})`);
      idx++;
      params.push(`%${query.q}%`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRes = await pool.query<{ count: string }>(
      `SELECT COUNT(*) FROM fields f ${whereClause};`,
      params,
    );
    const total = parseInt(countRes.rows[0].count, 10);

    const dataSql = `
      SELECT f.id, f.farmer_id, f.name, f.district, f.description, f.created_at, f.updated_at
      FROM fields f
      ${whereClause}
      ORDER BY f.created_at DESC
      LIMIT $${idx++} OFFSET $${idx++};
    `;
    params.push(limit, offset);

    const { rows } = await pool.query<{
      id: string;
      farmer_id: string;
      name: string;
      district: string;
      description: string | null;
      created_at: Date;
      updated_at: Date;
    }>(dataSql, params);

    const fields: FieldData[] = rows.map((r) => ({
      id: r.id,
      farmerId: r.farmer_id,
      name: r.name,
      district: r.district,
      description: r.description,
      createdAt: r.created_at.toISOString(),
      updatedAt: r.updated_at.toISOString(),
    }));

    return buildPaginatedResponse(fields, total, page, limit);
  }

  public async getFieldById(user: UserResponse, fieldId: string): Promise<FieldData> {
    if (user.role === 'admin') {
      throw new NotFound('Resource not found');
    }

    const { rows } = await pool.query<{
      id: string;
      farmer_id: string;
      name: string;
      district: string;
      description: string | null;
      created_at: Date;
      updated_at: Date;
    }>('SELECT * FROM fields WHERE id = $1;', [fieldId]);

    if (rows.length === 0) {
      throw new NotFound('Resource not found');
    }

    const field = rows[0];

    if (user.role === 'farmer' && field.farmer_id !== user.id) {
      throw new NotFound('Resource not found');
    }

    if (user.role === 'officer') {
      const shareCheck = await pool.query(
        `SELECT 1 FROM plots p
         JOIN shared_plots sp ON sp.plot_id = p.id
         WHERE p.field_id = $1
           AND sp.officer_id = $2
           AND sp.revoked_at IS NULL
           AND (sp.expires_at IS NULL OR sp.expires_at > NOW());`,
        [fieldId, user.id],
      );
      if (shareCheck.rows.length === 0) {
        throw new NotFound('Resource not found');
      }
    }

    return {
      id: field.id,
      farmerId: field.farmer_id,
      name: field.name,
      district: field.district,
      description: field.description,
      createdAt: field.created_at.toISOString(),
      updatedAt: field.updated_at.toISOString(),
    };
  }

  public async updateField(
    user: UserResponse,
    fieldId: string,
    data: { name?: string; district?: string; description?: string },
    meta?: { ipAddress?: string; userAgent?: string },
  ): Promise<FieldData> {
    const existing = await this.getFieldById(user, fieldId);

    if (user.role !== 'farmer' || existing.farmerId !== user.id) {
      throw new NotFound('Resource not found');
    }

    const updates: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (data.name !== undefined) {
      updates.push(`name = $${idx++}`);
      params.push(data.name);
    }
    if (data.district !== undefined) {
      updates.push(`district = $${idx++}`);
      params.push(data.district);
    }
    if (data.description !== undefined) {
      updates.push(`description = $${idx++}`);
      params.push(data.description);
    }

    updates.push('updated_at = NOW()');
    params.push(fieldId);

    const { rows } = await pool.query<{
      id: string;
      farmer_id: string;
      name: string;
      district: string;
      description: string | null;
      created_at: Date;
      updated_at: Date;
    }>(`UPDATE fields SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *;`, params);

    const r = rows[0];

    await writeAuditLog({
      userId: user.id,
      action: 'update',
      entityType: 'fields',
      entityId: fieldId,
      metadata: { updatedFields: Object.keys(data) },
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
    });

    return {
      id: r.id,
      farmerId: r.farmer_id,
      name: r.name,
      district: r.district,
      description: r.description,
      createdAt: r.created_at.toISOString(),
      updatedAt: r.updated_at.toISOString(),
    };
  }

  public async deleteField(
    user: UserResponse,
    fieldId: string,
    meta?: { ipAddress?: string; userAgent?: string },
  ): Promise<void> {
    const existing = await this.getFieldById(user, fieldId);

    if (user.role !== 'farmer' || existing.farmerId !== user.id) {
      throw new NotFound('Resource not found');
    }

    await pool.query('DELETE FROM fields WHERE id = $1;', [fieldId]);

    await writeAuditLog({
      userId: user.id,
      action: 'delete',
      entityType: 'fields',
      entityId: fieldId,
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
    });
  }
}

export const fieldService = new FieldService();
