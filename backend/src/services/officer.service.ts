import { pool } from '../db';
import { NotFound, Forbidden } from '../utils/errors';
import { writeAuditLog } from '../utils/audit';
import { buildPaginatedResponse, PaginatedResponse } from '../utils/pagination';
import { UserResponse } from './auth.service';
import { authzService, ShareScope } from './authz.service';
import { CropCycleData } from './cropCycle.service';
import { ActivityLogData } from './activityLog.service';
import { InputApplicationData } from './inputApplication.service';
import { HarvestData } from './harvest.service';

export interface OfficerPlotItem {
  id: string;
  name: string;
  district: string;
  gps_blurred_district: string;
  gps: null;
  areaHa: number;
  soilType: string | null;
  irrigationSource: string | null;
  farmer: {
    id: string;
    fullName: string;
    email: string;
    phone: string | null;
  };
  share: {
    id: string;
    scope: ShareScope;
    scopes: string[];
    grantedAt: string;
    expiresAt: string | null;
  };
}

export class OfficerService {
  /**
   * GET /api/officer/plots
   * Returns ONLY active shares (not revoked, not expired) with scopes.
   * GPS coordinates are NEVER returned; only blurred district data is exposed.
   */
  public async getOfficerPlots(
    user: UserResponse,
    query: {
      page?: number;
      limit?: number;
      district?: string;
      scope?: ShareScope;
      q?: string;
    },
  ): Promise<PaginatedResponse<OfficerPlotItem>> {
    if (user.role === 'admin') {
      throw new NotFound('Resource not found');
    }

    if (user.role !== 'officer') {
      throw new Forbidden(
        'Only agricultural extension officers can access this directory',
        'FORBIDDEN',
      );
    }

    if (!user.isVerified) {
      throw new Forbidden(
        'Extension officer account is pending administrative verification',
        'OFFICER_NOT_VERIFIED',
      );
    }

    const page = query.page || 1;
    const limit = query.limit || 10;
    const offset = (page - 1) * limit;

    const conditions: string[] = [
      'sp.officer_id = $1',
      'sp.revoked_at IS NULL',
      '(sp.expires_at IS NULL OR sp.expires_at > NOW())',
    ];
    const params: unknown[] = [user.id];
    let idx = 2;

    if (query.district) {
      conditions.push(`p.district ILIKE $${idx++}`);
      params.push(`%${query.district}%`);
    }

    if (query.scope) {
      conditions.push(`sp.scope = $${idx++}`);
      params.push(query.scope);
    }

    if (query.q) {
      conditions.push(
        `(p.name ILIKE $${idx} OR p.district ILIKE $${idx} OR u.full_name ILIKE $${idx})`,
      );
      idx++;
      params.push(`%${query.q}%`);
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const countRes = await pool.query<{ count: string }>(
      `SELECT COUNT(*)
       FROM shared_plots sp
       JOIN plots p ON p.id = sp.plot_id
       JOIN users u ON u.id = p.farmer_id
       ${whereClause};`,
      params,
    );
    const total = parseInt(countRes.rows[0].count, 10);

    const dataSql = `
      SELECT sp.id AS share_id, sp.scope, sp.scopes, sp.granted_at, sp.expires_at,
             p.id AS plot_id, p.name AS plot_name, p.district, p.area_ha, p.soil_type, p.irrigation_source,
             u.id AS farmer_id, u.full_name AS farmer_name, u.email AS farmer_email, u.phone AS farmer_phone
      FROM shared_plots sp
      JOIN plots p ON p.id = sp.plot_id
      JOIN users u ON u.id = p.farmer_id
      ${whereClause}
      ORDER BY sp.granted_at DESC
      LIMIT $${idx++} OFFSET $${idx++};
    `;
    params.push(limit, offset);

    const { rows } = await pool.query<{
      share_id: string;
      scope: ShareScope;
      scopes: string[] | null;
      granted_at: Date;
      expires_at: Date | null;
      plot_id: string;
      plot_name: string;
      district: string;
      area_ha: string;
      soil_type: string | null;
      irrigation_source: string | null;
      farmer_id: string;
      farmer_name: string;
      farmer_email: string;
      farmer_phone: string | null;
    }>(dataSql, params);

    const items: OfficerPlotItem[] = rows.map((r) => ({
      id: r.plot_id,
      name: r.plot_name,
      district: r.district,
      gps_blurred_district: r.district,
      gps: null, // EXACT GPS NEVER EXPOSED TO OFFICERS
      areaHa: parseFloat(r.area_ha),
      soilType: r.soil_type,
      irrigationSource: r.irrigation_source,
      farmer: {
        id: r.farmer_id,
        fullName: r.farmer_name,
        email: r.farmer_email,
        phone: r.farmer_phone,
      },
      share: {
        id: r.share_id,
        scope: r.scope,
        scopes: r.scopes && r.scopes.length > 0 ? r.scopes : [r.scope],
        grantedAt: r.granted_at.toISOString(),
        expiresAt: r.expires_at ? r.expires_at.toISOString() : null,
      },
    }));

    return buildPaginatedResponse(items, total, page, limit);
  }

  /**
   * Officer read-only endpoint for single plot
   */
  public async getOfficerPlotById(
    user: UserResponse,
    plotId: string,
    meta?: { ipAddress?: string; userAgent?: string },
  ): Promise<OfficerPlotItem> {
    const access = await authzService.assertPlotAccess(user, plotId, 'view_only');

    const { rows } = await pool.query<{
      share_id: string;
      scope: ShareScope;
      scopes: string[] | null;
      granted_at: Date;
      expires_at: Date | null;
      plot_id: string;
      plot_name: string;
      district: string;
      area_ha: string;
      soil_type: string | null;
      irrigation_source: string | null;
      farmer_id: string;
      farmer_name: string;
      farmer_email: string;
      farmer_phone: string | null;
    }>(
      `SELECT sp.id AS share_id, sp.scope, sp.scopes, sp.granted_at, sp.expires_at,
              p.id AS plot_id, p.name AS plot_name, p.district, p.area_ha, p.soil_type, p.irrigation_source,
              u.id AS farmer_id, u.full_name AS farmer_name, u.email AS farmer_email, u.phone AS farmer_phone
       FROM shared_plots sp
       JOIN plots p ON p.id = sp.plot_id
       JOIN users u ON u.id = p.farmer_id
       WHERE sp.plot_id = $1
         AND sp.officer_id = $2
         AND sp.revoked_at IS NULL
         AND (sp.expires_at IS NULL OR sp.expires_at > NOW());`,
      [plotId, user.id],
    );

    if (rows.length === 0) {
      throw new NotFound('Resource not found');
    }

    const r = rows[0];

    // Log officer read
    await writeAuditLog({
      userId: user.id,
      action: 'plot_viewed_by_officer',
      entityType: 'plots',
      entityId: plotId,
      metadata: {
        plotName: r.plot_name,
        district: r.district,
        farmerId: r.farmer_id,
        scope: r.scope,
      },
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
    });

    return {
      id: r.plot_id,
      name: r.plot_name,
      district: r.district,
      gps_blurred_district: r.district,
      gps: null, // ALWAYS NULL FOR OFFICERS
      areaHa: parseFloat(r.area_ha),
      soilType: r.soil_type,
      irrigationSource: r.irrigation_source,
      farmer: {
        id: r.farmer_id,
        fullName: r.farmer_name,
        email: r.farmer_email,
        phone: r.farmer_phone,
      },
      share: {
        id: r.share_id,
        scope: r.scope,
        scopes: r.scopes || access.scopes || [r.scope],
        grantedAt: r.granted_at.toISOString(),
        expiresAt: r.expires_at ? r.expires_at.toISOString() : null,
      },
    };
  }

  /**
   * Officer read-only: Crop Cycles (404 if crop_cycles is out-of-scope)
   */
  public async getPlotCropCycles(
    user: UserResponse,
    plotId: string,
    query: { page?: number; limit?: number; status?: string; q?: string },
    meta?: { ipAddress?: string; userAgent?: string },
  ): Promise<PaginatedResponse<CropCycleData>> {
    await authzService.assertCategoryAccess(user, plotId, 'crop_cycles');

    await writeAuditLog({
      userId: user.id,
      action: 'plot_viewed_by_officer',
      entityType: 'crop_cycles',
      entityId: plotId,
      metadata: { plotId, category: 'crop_cycles' },
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
    });

    const page = query.page || 1;
    const limit = query.limit || 10;
    const offset = (page - 1) * limit;

    const conditions: string[] = ['c.plot_id = $1'];
    const params: unknown[] = [plotId];
    let idx = 2;

    if (query.status) {
      conditions.push(`c.status = $${idx++}`);
      params.push(query.status);
    }

    if (query.q) {
      conditions.push(`(c.crop_name ILIKE $${idx} OR c.variety ILIKE $${idx})`);
      idx++;
      params.push(`%${query.q}%`);
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const countRes = await pool.query<{ count: string }>(
      `SELECT COUNT(*) FROM crop_cycles c ${whereClause};`,
      params,
    );
    const total = parseInt(countRes.rows[0].count, 10);

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
      `SELECT c.* FROM crop_cycles c
       ${whereClause}
       ORDER BY c.start_date DESC
       LIMIT $${idx++} OFFSET $${idx++};`,
      [...params, limit, offset],
    );

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

  /**
   * Officer read-only: Activity Logs (404 if activity_logs is out-of-scope)
   */
  public async getPlotActivityLogs(
    user: UserResponse,
    plotId: string,
    query: { page?: number; limit?: number; type?: string; q?: string },
    meta?: { ipAddress?: string; userAgent?: string },
  ): Promise<PaginatedResponse<ActivityLogData>> {
    await authzService.assertCategoryAccess(user, plotId, 'activity_logs');

    await writeAuditLog({
      userId: user.id,
      action: 'plot_viewed_by_officer',
      entityType: 'activity_logs',
      entityId: plotId,
      metadata: { plotId, category: 'activity_logs' },
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
    });

    const page = query.page || 1;
    const limit = query.limit || 10;
    const offset = (page - 1) * limit;

    const conditions: string[] = ['c.plot_id = $1'];
    const params: unknown[] = [plotId];
    let idx = 2;

    if (query.type) {
      conditions.push(`l.log_type = $${idx++}`);
      params.push(query.type);
    }

    if (query.q) {
      conditions.push(`l.notes ILIKE $${idx++}`);
      params.push(`%${query.q}%`);
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const countRes = await pool.query<{ count: string }>(
      `SELECT COUNT(*)
       FROM activity_logs l
       JOIN crop_cycles c ON c.id = l.cycle_id
       ${whereClause};`,
      params,
    );
    const total = parseInt(countRes.rows[0].count, 10);

    const { rows } = await pool.query<{
      id: string;
      cycle_id: string;
      log_type: string;
      log_date: string;
      notes: string;
      created_at: Date;
      updated_at: Date;
    }>(
      `SELECT l.id, l.cycle_id, l.log_type, l.log_date, l.notes, l.created_at, l.updated_at
       FROM activity_logs l
       JOIN crop_cycles c ON c.id = l.cycle_id
       ${whereClause}
       ORDER BY l.log_date DESC, l.created_at DESC
       LIMIT $${idx++} OFFSET $${idx++};`,
      [...params, limit, offset],
    );

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

  /**
   * Officer read-only: Input Applications (404 if input_applications is out-of-scope)
   */
  public async getPlotInputApplications(
    user: UserResponse,
    plotId: string,
    query: { page?: number; limit?: number; type?: string; q?: string },
    meta?: { ipAddress?: string; userAgent?: string },
  ): Promise<PaginatedResponse<InputApplicationData>> {
    await authzService.assertCategoryAccess(user, plotId, 'input_applications');

    await writeAuditLog({
      userId: user.id,
      action: 'plot_viewed_by_officer',
      entityType: 'input_applications',
      entityId: plotId,
      metadata: { plotId, category: 'input_applications' },
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
    });

    const page = query.page || 1;
    const limit = query.limit || 10;
    const offset = (page - 1) * limit;

    const conditions: string[] = ['c.plot_id = $1'];
    const params: unknown[] = [plotId];
    let idx = 2;

    if (query.type) {
      conditions.push(`i.input_type = $${idx++}`);
      params.push(query.type);
    }

    if (query.q) {
      conditions.push(`i.name ILIKE $${idx++}`);
      params.push(`%${query.q}%`);
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const countRes = await pool.query<{ count: string }>(
      `SELECT COUNT(*)
       FROM input_applications i
       JOIN crop_cycles c ON c.id = i.cycle_id
       ${whereClause};`,
      params,
    );
    const total = parseInt(countRes.rows[0].count, 10);

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
      `SELECT i.*
       FROM input_applications i
       JOIN crop_cycles c ON c.id = i.cycle_id
       ${whereClause}
       ORDER BY i.application_date DESC
       LIMIT $${idx++} OFFSET $${idx++};`,
      [...params, limit, offset],
    );

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

  /**
   * Officer read-only: Harvests (404 if harvests is out-of-scope)
   */
  public async getPlotHarvests(
    user: UserResponse,
    plotId: string,
    query: { page?: number; limit?: number; qualityGrade?: string; q?: string },
    meta?: { ipAddress?: string; userAgent?: string },
  ): Promise<PaginatedResponse<HarvestData>> {
    await authzService.assertCategoryAccess(user, plotId, 'harvests');

    await writeAuditLog({
      userId: user.id,
      action: 'plot_viewed_by_officer',
      entityType: 'harvests',
      entityId: plotId,
      metadata: { plotId, category: 'harvests' },
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
    });

    const page = query.page || 1;
    const limit = query.limit || 10;
    const offset = (page - 1) * limit;

    const conditions: string[] = ['c.plot_id = $1'];
    const params: unknown[] = [plotId];
    let idx = 2;

    if (query.qualityGrade) {
      conditions.push(`h.quality_grade = $${idx++}`);
      params.push(query.qualityGrade);
    }

    if (query.q) {
      conditions.push(`(h.notes ILIKE $${idx} OR h.quality_grade ILIKE $${idx})`);
      idx++;
      params.push(`%${query.q}%`);
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const countRes = await pool.query<{ count: string }>(
      `SELECT COUNT(*)
       FROM harvests h
       JOIN crop_cycles c ON c.id = h.cycle_id
       ${whereClause};`,
      params,
    );
    const total = parseInt(countRes.rows[0].count, 10);

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
      `SELECT h.*
       FROM harvests h
       JOIN crop_cycles c ON c.id = h.cycle_id
       ${whereClause}
       ORDER BY h.harvest_date DESC
       LIMIT $${idx++} OFFSET $${idx++};`,
      [...params, limit, offset],
    );

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
}

export const officerService = new OfficerService();
