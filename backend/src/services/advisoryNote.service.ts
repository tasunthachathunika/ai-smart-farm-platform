import { pool } from '../db';
import { NotFound, Forbidden } from '../utils/errors';
import { writeAuditLog } from '../utils/audit';
import { buildPaginatedResponse, PaginatedResponse } from '../utils/pagination';
import { UserResponse } from './auth.service';
import { authzService } from './authz.service';

export interface AdvisoryNoteData {
  id: string;
  plotId: string;
  officerId: string;
  officerName: string;
  officerEmail: string;
  title: string;
  notes: string;
  recommendations: string | null;
  createdAt: string;
  updatedAt: string;
}

export class AdvisoryNoteService {
  /**
   * Officer writes an advisory note for a shared plot.
   * Blocked immediately if the share has been revoked or expired.
   */
  public async createNote(
    user: UserResponse,
    plotId: string,
    data: {
      title?: string;
      notes: string;
      recommendations?: string | null;
    },
    meta?: { ipAddress?: string; userAgent?: string },
  ): Promise<AdvisoryNoteData> {
    if (user.role !== 'officer') {
      throw new Forbidden(
        'Only agricultural extension officers can write advisory notes',
        'FORBIDDEN',
      );
    }

    // 1. Verify officer has an active share and category access (throws 404 if revoked, expired, or out-of-scope)
    await authzService.assertCategoryAccess(user, plotId, 'advisory_notes');

    const title = data.title || 'Field Advisory Note';

    const { rows } = await pool.query<{
      id: string;
      plot_id: string;
      officer_id: string;
      title: string;
      notes: string;
      recommendations: string | null;
      created_at: Date;
      updated_at: Date;
    }>(
      `INSERT INTO advisory_notes (plot_id, officer_id, title, notes, recommendations)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, plot_id, officer_id, title, notes, recommendations, created_at, updated_at;`,
      [plotId, user.id, title, data.notes, data.recommendations || null],
    );

    const note = rows[0];

    // Append-only audit log entry
    await writeAuditLog({
      userId: user.id,
      action: 'create',
      entityType: 'advisory_notes',
      entityId: note.id,
      metadata: { plotId, title: note.title },
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
    });

    return {
      id: note.id,
      plotId: note.plot_id,
      officerId: note.officer_id,
      officerName: user.fullName,
      officerEmail: user.email,
      title: note.title,
      notes: note.notes,
      recommendations: note.recommendations,
      createdAt: note.created_at.toISOString(),
      updatedAt: note.updated_at.toISOString(),
    };
  }

  /**
   * Reads advisory notes for a plot.
   * Farmer reads their own plot's notes.
   * Officer reads if they hold an active share; BLOCKED with 404 after share is revoked.
   */
  public async getNotesForPlot(
    user: UserResponse,
    plotId: string,
    query: { page?: number; limit?: number },
    meta?: { ipAddress?: string; userAgent?: string },
  ): Promise<PaginatedResponse<AdvisoryNoteData>> {
    if (user.role === 'admin') {
      throw new NotFound('Resource not found');
    }

    // Asserts active share for officer (returns 404 if revoked/expired) or ownership for farmer
    const access = await authzService.assertCategoryAccess(user, plotId, 'advisory_notes');

    // Audit officer viewing shared advisory notes
    if (!access.isOwner && user.role === 'officer') {
      await writeAuditLog({
        userId: user.id,
        action: 'plot_viewed_by_officer',
        entityType: 'advisory_notes',
        entityId: plotId,
        metadata: { plotId, category: 'advisory_notes' },
        ipAddress: meta?.ipAddress,
        userAgent: meta?.userAgent,
      });
    }

    const page = query.page || 1;
    const limit = query.limit || 10;
    const offset = (page - 1) * limit;

    const countRes = await pool.query<{ count: string }>(
      'SELECT COUNT(*) FROM advisory_notes WHERE plot_id = $1;',
      [plotId],
    );
    const total = parseInt(countRes.rows[0].count, 10);

    const { rows } = await pool.query<{
      id: string;
      plot_id: string;
      officer_id: string;
      title: string;
      notes: string;
      recommendations: string | null;
      created_at: Date;
      updated_at: Date;
      officer_name: string;
      officer_email: string;
    }>(
      `SELECT n.id, n.plot_id, n.officer_id, n.title, n.notes, n.recommendations,
              n.created_at, n.updated_at,
              u.full_name AS officer_name, u.email AS officer_email
       FROM advisory_notes n
       JOIN users u ON u.id = n.officer_id
       WHERE n.plot_id = $1
       ORDER BY n.created_at DESC
       LIMIT $2 OFFSET $3;`,
      [plotId, limit, offset],
    );

    const notes: AdvisoryNoteData[] = rows.map((r) => ({
      id: r.id,
      plotId: r.plot_id,
      officerId: r.officer_id,
      officerName: r.officer_name,
      officerEmail: r.officer_email,
      title: r.title,
      notes: r.notes,
      recommendations: r.recommendations,
      createdAt: r.created_at.toISOString(),
      updatedAt: r.updated_at.toISOString(),
    }));

    return buildPaginatedResponse(notes, total, page, limit);
  }
}

export const advisoryNoteService = new AdvisoryNoteService();
