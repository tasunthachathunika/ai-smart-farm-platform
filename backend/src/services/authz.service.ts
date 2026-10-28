import { pool } from '../db';
import { NotFound } from '../utils/errors';
import { UserResponse } from './auth.service';

export type ShareScope = 'view_only' | 'advisory' | 'full';

const SCOPE_HIERARCHY: Record<ShareScope, number> = {
  view_only: 1,
  advisory: 2,
  full: 3,
};

/**
 * Validates whether the granted scope satisfies the requested scope level.
 * Hierarchy: full >= advisory >= view_only
 */
export function satisfiesScope(grantedScope: ShareScope, requiredScope: ShareScope): boolean {
  return (SCOPE_HIERARCHY[grantedScope] || 0) >= (SCOPE_HIERARCHY[requiredScope] || 0);
}

export interface PlotAccessResult {
  plotId: string;
  isOwner: boolean;
  userRole: 'farmer' | 'officer';
  grantedScope: ShareScope;
  scopes?: string[];
}

export function normalizeCategory(category: string): string {
  return category.toLowerCase().replace(/-/g, '_');
}

export function isCategoryPermitted(
  access: { grantedScope?: string; scope?: string; scopes?: string[] | null },
  category: string,
): boolean {
  const normCat = normalizeCategory(category);
  const rawScopes =
    access.scopes && access.scopes.length > 0
      ? access.scopes
      : [access.grantedScope || access.scope || 'view_only'];
  const scopes = rawScopes.map(normalizeCategory);

  // If full, advisory, or all are present, standard categories are permitted
  if (scopes.includes('full') || scopes.includes('all')) return true;

  // Exact category match
  if (scopes.includes(normCat)) return true;

  // General scope: if scopes array only contains general permission levels
  // (e.g. ['view_only'] or ['advisory']), then all categories are viewed as allowed
  const categoryNames = [
    'crop_cycles',
    'activity_logs',
    'input_applications',
    'harvests',
    'advisory_notes',
    'photos',
  ];
  const hasSpecificCategoryRestrictions = scopes.some((s) => categoryNames.includes(s));
  if (!hasSpecificCategoryRestrictions) {
    return true;
  }

  return false;
}

export class AuthzService {
  /**
   * Central Plot Authorization Gatekeeper
   * Strictly adheres to AGENTS.md Rules 1 & 2:
   * 1. Check permissions against the database on every request (NO caching).
   * 2. Farmer must be the plot owner.
   * 3. Officer must be verified AND have an active, unexpired, non-revoked share with sufficient scope.
   * 4. Admin is strictly prohibited from accessing farm plots and records.
   * 5. Always return 404 for unauthorized access to avoid leaking existence of plots.
   */
  public async assertPlotAccess(
    user: UserResponse,
    plotId: string,
    requiredScope: ShareScope | 'photos' = 'view_only',
  ): Promise<PlotAccessResult> {
    // 1. Admin Boundary: Admins must NEVER access farm records or plots
    if (user.role === 'admin') {
      throw new NotFound('Resource not found');
    }

    // 2. Farmer Authorization: Must be the verified owner of the plot
    if (user.role === 'farmer') {
      const { rows } = await pool.query<{ id: string; farmer_id: string }>(
        'SELECT id, farmer_id FROM plots WHERE id = $1;',
        [plotId],
      );

      if (rows.length === 0 || rows[0].farmer_id !== user.id) {
        // Return 404 to prevent IDOR and hide resource existence
        throw new NotFound('Resource not found');
      }

      return {
        plotId,
        isOwner: true,
        userRole: 'farmer',
        grantedScope: 'full',
      };
    }

    // 3. Officer Authorization: Must be verified AND have an active, valid delegation
    if (user.role === 'officer') {
      // Must be verified in the DB on every request
      const userCheck = await pool.query<{ is_verified: boolean }>(
        'SELECT is_verified FROM users WHERE id = $1 AND role = $2;',
        [user.id, 'officer'],
      );

      if (userCheck.rows.length === 0 || !userCheck.rows[0].is_verified) {
        throw new NotFound('Resource not found');
      }

      // Check for active, non-revoked, non-expired share
      const shareResult = await pool.query<{
        id: string;
        scope: ShareScope;
        scopes?: string[];
        expires_at: Date | null;
        revoked_at: Date | null;
      }>(
        `SELECT sp.id, sp.scope, sp.scopes, sp.expires_at, sp.revoked_at
         FROM shared_plots sp
         JOIN plots p ON p.id = sp.plot_id
         WHERE sp.plot_id = $1
           AND sp.officer_id = $2
           AND sp.revoked_at IS NULL
           AND (sp.expires_at IS NULL OR sp.expires_at > NOW());`,
        [plotId, user.id],
      );

      if (shareResult.rows.length === 0) {
        throw new NotFound('Resource not found');
      }

      const activeShare = shareResult.rows[0];

      // Verify scope meets required permission level
      if (requiredScope === 'photos') {
        if (!isCategoryPermitted(activeShare, 'photos')) {
          throw new NotFound('Resource not found');
        }
      } else if (!satisfiesScope(activeShare.scope, requiredScope)) {
        throw new NotFound('Resource not found');
      }

      return {
        plotId,
        isOwner: false,
        userRole: 'officer',
        grantedScope: activeShare.scope,
        scopes: activeShare.scopes,
      };
    }

    // Default deny: unknown roles
    throw new NotFound('Resource not found');
  }

  /**
   * Asserts category-level access for permitted categories only.
   * Returns 404 for out-of-scope categories to protect privacy.
   */
  public async assertCategoryAccess(
    user: UserResponse,
    plotId: string,
    category: string,
  ): Promise<PlotAccessResult> {
    const access = await this.assertPlotAccess(user, plotId, 'view_only');

    // Farmers own their plots and have full access to all categories
    if (user.role === 'farmer') {
      return access;
    }

    // Officers must have the category in their active share scopes
    if (!isCategoryPermitted(access, category)) {
      throw new NotFound('Resource not found');
    }

    return access;
  }
}

export const authzService = new AuthzService();
