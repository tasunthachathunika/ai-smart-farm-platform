import { pool } from '../db';
import { NotFound, Forbidden } from '../utils/errors';
import { encryptGps, decryptGps } from '../utils/crypto';
import { writeAuditLog } from '../utils/audit';
import { buildPaginatedResponse, PaginatedResponse } from '../utils/pagination';
import { UserResponse } from './auth.service';
import { authzService } from './authz.service';

export interface PlotData {
  id: string;
  farmerId: string;
  fieldId: string | null;
  name: string;
  district: string;
  areaHa: number;
  soilType: string | null;
  irrigationSource: string | null;
  gps?: { latitude: number; longitude: number } | null;
  createdAt: string;
  updatedAt: string;
}

export class PlotService {
  /**
   * Create Plot
   * Only farmers can register plots. Coordinates are encrypted with AES-256-GCM.
   */
  public async createPlot(
    user: UserResponse,
    data: {
      fieldId?: string;
      name: string;
      district: string;
      areaHa: number;
      gps: { latitude: number; longitude: number };
      soilType?: string;
      irrigationSource?: string;
    },
    meta?: { ipAddress?: string; userAgent?: string },
  ): Promise<PlotData> {
    if (user.role !== 'farmer') {
      throw new Forbidden('Only registered farmers can create plots', 'FORBIDDEN');
    }

    // Encrypt exact GPS coordinates using AES-256-GCM
    const encrypted = encryptGps(JSON.stringify(data.gps));

    const { rows } = await pool.query<{
      id: string;
      farmer_id: string;
      field_id: string | null;
      name: string;
      district: string;
      area_ha: string;
      soil_type: string | null;
      irrigation_source: string | null;
      created_at: Date;
      updated_at: Date;
    }>(
      `INSERT INTO plots (farmer_id, field_id, name, district, encrypted_gps, gps_iv, gps_auth_tag, area_ha, soil_type, irrigation_source)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id, farmer_id, field_id, name, district, area_ha, soil_type, irrigation_source, created_at, updated_at;`,
      [
        user.id,
        data.fieldId || null,
        data.name,
        data.district,
        encrypted.ciphertext,
        encrypted.iv,
        encrypted.authTag,
        data.areaHa,
        data.soilType || null,
        data.irrigationSource || null,
      ],
    );

    const row = rows[0];

    // Append-only audit log
    await writeAuditLog({
      userId: user.id,
      action: 'create',
      entityType: 'plots',
      entityId: row.id,
      metadata: { name: row.name, district: row.district, areaHa: row.area_ha },
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
    });

    return {
      id: row.id,
      farmerId: row.farmer_id,
      fieldId: row.field_id,
      name: row.name,
      district: row.district,
      areaHa: parseFloat(row.area_ha),
      soilType: row.soil_type,
      irrigationSource: row.irrigation_source,
      gps: data.gps, // Return exact GPS to the plot owner
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
    };
  }

  /**
   * List Plots with Pagination, Search, and Filters
   * Farmers receive their plots with decrypted GPS.
   * Officers receive shared plots with blurred district-level info (gps: null).
   * Admins are denied with 404.
   */
  public async getPlots(
    user: UserResponse,
    query: {
      page?: number;
      limit?: number;
      q?: string;
      district?: string;
      fieldId?: string;
    },
  ): Promise<PaginatedResponse<PlotData>> {
    if (user.role === 'admin') {
      throw new NotFound('Resource not found');
    }

    const page = query.page || 1;
    const limit = query.limit || 10;
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIdx = 1;

    if (user.role === 'farmer') {
      conditions.push(`p.farmer_id = $${paramIdx++}`);
      params.push(user.id);
    } else if (user.role === 'officer') {
      conditions.push(`EXISTS (
        SELECT 1 FROM shared_plots sp
        WHERE sp.plot_id = p.id
          AND sp.officer_id = $${paramIdx++}
          AND sp.revoked_at IS NULL
          AND (sp.expires_at IS NULL OR sp.expires_at > NOW())
      )`);
      params.push(user.id);
    }

    if (query.district) {
      conditions.push(`p.district ILIKE $${paramIdx++}`);
      params.push(`%${query.district}%`);
    }

    if (query.fieldId) {
      conditions.push(`p.field_id = $${paramIdx++}`);
      params.push(query.fieldId);
    }

    if (query.q) {
      conditions.push(`(p.name ILIKE $${paramIdx} OR p.soil_type ILIKE $${paramIdx})`);
      paramIdx++;
      params.push(`%${query.q}%`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Count query
    const countRes = await pool.query<{ count: string }>(
      `SELECT COUNT(*) FROM plots p ${whereClause};`,
      params,
    );
    const total = parseInt(countRes.rows[0].count, 10);

    // Data query
    const dataQuery = `
      SELECT p.id, p.farmer_id, p.field_id, p.name, p.district, p.area_ha,
             p.soil_type, p.irrigation_source, p.encrypted_gps, p.gps_iv, p.gps_auth_tag,
             p.created_at, p.updated_at
      FROM plots p
      ${whereClause}
      ORDER BY p.created_at DESC
      LIMIT $${paramIdx++} OFFSET $${paramIdx++};
    `;
    params.push(limit, offset);

    const { rows } = await pool.query<{
      id: string;
      farmer_id: string;
      field_id: string | null;
      name: string;
      district: string;
      area_ha: string;
      soil_type: string | null;
      irrigation_source: string | null;
      encrypted_gps: string;
      gps_iv: string;
      gps_auth_tag: string;
      created_at: Date;
      updated_at: Date;
    }>(dataQuery, params);

    const plots: PlotData[] = rows.map((row) => {
      let gps: { latitude: number; longitude: number } | null = null;

      // Return exact GPS only to plot owner (AGENTS.md Rule 4)
      if (user.role === 'farmer' && user.id === row.farmer_id) {
        try {
          gps = JSON.parse(decryptGps(row.encrypted_gps, row.gps_iv, row.gps_auth_tag));
        } catch {
          gps = null;
        }
      }

      return {
        id: row.id,
        farmerId: row.farmer_id,
        fieldId: row.field_id,
        name: row.name,
        district: row.district,
        areaHa: parseFloat(row.area_ha),
        soilType: row.soil_type,
        irrigationSource: row.irrigation_source,
        gps, // Null for extension officers; exact for owner
        createdAt: row.created_at.toISOString(),
        updatedAt: row.updated_at.toISOString(),
      };
    });

    if (user.role === 'officer' && plots.length > 0) {
      for (const plot of plots) {
        await writeAuditLog({
          userId: user.id,
          action: 'plot_viewed_by_officer',
          entityType: 'plots',
          entityId: plot.id,
          metadata: {
            plotName: plot.name,
            district: plot.district,
            farmerId: plot.farmerId,
            source: 'list',
          },
        });
      }
    }

    return buildPaginatedResponse(plots, total, page, limit);
  }

  /**
   * Get Plot by ID
   */
  public async getPlotById(
    user: UserResponse,
    plotId: string,
    meta?: { ipAddress?: string; userAgent?: string },
  ): Promise<PlotData> {
    const access = await authzService.assertPlotAccess(user, plotId, 'view_only');

    const { rows } = await pool.query<{
      id: string;
      farmer_id: string;
      field_id: string | null;
      name: string;
      district: string;
      area_ha: string;
      soil_type: string | null;
      irrigation_source: string | null;
      encrypted_gps: string;
      gps_iv: string;
      gps_auth_tag: string;
      created_at: Date;
      updated_at: Date;
    }>(
      `SELECT id, farmer_id, field_id, name, district, area_ha,
              soil_type, irrigation_source, encrypted_gps, gps_iv, gps_auth_tag,
              created_at, updated_at
       FROM plots WHERE id = $1;`,
      [plotId],
    );

    if (rows.length === 0) {
      throw new NotFound('Resource not found');
    }

    const row = rows[0];
    let gps: { latitude: number; longitude: number } | null = null;

    // Exact GPS returned ONLY to owner
    if (access.isOwner) {
      try {
        gps = JSON.parse(decryptGps(row.encrypted_gps, row.gps_iv, row.gps_auth_tag));
      } catch {
        gps = null;
      }
    } else if (user.role === 'officer') {
      // Log officer read of shared plot data as plot_viewed_by_officer
      await writeAuditLog({
        userId: user.id,
        action: 'plot_viewed_by_officer',
        entityType: 'plots',
        entityId: plotId,
        metadata: {
          plotName: row.name,
          district: row.district,
          farmerId: row.farmer_id,
          scope: access.grantedScope,
        },
        ipAddress: meta?.ipAddress,
        userAgent: meta?.userAgent,
      });
    }

    return {
      id: row.id,
      farmerId: row.farmer_id,
      fieldId: row.field_id,
      name: row.name,
      district: row.district,
      areaHa: parseFloat(row.area_ha),
      soilType: row.soil_type,
      irrigationSource: row.irrigation_source,
      gps, // null for officers
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
    };
  }

  /**
   * Update Plot
   */
  public async updatePlot(
    user: UserResponse,
    plotId: string,
    data: {
      fieldId?: string | null;
      name?: string;
      district?: string;
      areaHa?: number;
      gps?: { latitude: number; longitude: number };
      soilType?: string;
      irrigationSource?: string;
    },
    meta?: { ipAddress?: string; userAgent?: string },
  ): Promise<PlotData> {
    const access = await authzService.assertPlotAccess(user, plotId, 'full');

    if (!access.isOwner) {
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
    if (data.areaHa !== undefined) {
      updates.push(`area_ha = $${idx++}`);
      params.push(data.areaHa);
    }
    if (data.fieldId !== undefined) {
      updates.push(`field_id = $${idx++}`);
      params.push(data.fieldId);
    }
    if (data.soilType !== undefined) {
      updates.push(`soil_type = $${idx++}`);
      params.push(data.soilType);
    }
    if (data.irrigationSource !== undefined) {
      updates.push(`irrigation_source = $${idx++}`);
      params.push(data.irrigationSource);
    }
    if (data.gps !== undefined) {
      const encrypted = encryptGps(JSON.stringify(data.gps));
      updates.push(`encrypted_gps = $${idx++}`);
      params.push(encrypted.ciphertext);
      updates.push(`gps_iv = $${idx++}`);
      params.push(encrypted.iv);
      updates.push(`gps_auth_tag = $${idx++}`);
      params.push(encrypted.authTag);
    }

    updates.push('updated_at = NOW()');
    params.push(plotId);

    const { rows } = await pool.query<{
      id: string;
      farmer_id: string;
      field_id: string | null;
      name: string;
      district: string;
      area_ha: string;
      soil_type: string | null;
      irrigation_source: string | null;
      encrypted_gps: string;
      gps_iv: string;
      gps_auth_tag: string;
      created_at: Date;
      updated_at: Date;
    }>(
      `UPDATE plots SET ${updates.join(', ')} WHERE id = $${idx}
       RETURNING id, farmer_id, field_id, name, district, area_ha, soil_type, irrigation_source, encrypted_gps, gps_iv, gps_auth_tag, created_at, updated_at;`,
      params,
    );

    const row = rows[0];

    await writeAuditLog({
      userId: user.id,
      action: 'update',
      entityType: 'plots',
      entityId: plotId,
      metadata: { updatedFields: Object.keys(data) },
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
    });

    let gps: { latitude: number; longitude: number } | null = null;
    try {
      gps = JSON.parse(decryptGps(row.encrypted_gps, row.gps_iv, row.gps_auth_tag));
    } catch {
      gps = null;
    }

    return {
      id: row.id,
      farmerId: row.farmer_id,
      fieldId: row.field_id,
      name: row.name,
      district: row.district,
      areaHa: parseFloat(row.area_ha),
      soilType: row.soil_type,
      irrigationSource: row.irrigation_source,
      gps,
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
    };
  }

  /**
   * Delete Plot
   */
  public async deletePlot(
    user: UserResponse,
    plotId: string,
    meta?: { ipAddress?: string; userAgent?: string },
  ): Promise<void> {
    const access = await authzService.assertPlotAccess(user, plotId, 'full');

    if (!access.isOwner) {
      throw new NotFound('Resource not found');
    }

    await pool.query('DELETE FROM plots WHERE id = $1;', [plotId]);

    await writeAuditLog({
      userId: user.id,
      action: 'delete',
      entityType: 'plots',
      entityId: plotId,
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
    });
  }
}

export const plotService = new PlotService();
