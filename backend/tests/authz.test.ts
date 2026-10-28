import { pool } from '../src/db';
import { authzService, satisfiesScope } from '../src/services/authz.service';
import { NotFound } from '../src/utils/errors';
import { UserResponse } from '../src/services/auth.service';

describe('Central Authorization Service (authz.service.ts)', () => {
  const plotId = 'plot-1111-2222-3333-4444';

  const farmerA: UserResponse = {
    id: 'farmer-a-uuid',
    email: 'farmer.a@goviya.lk',
    fullName: 'Farmer A',
    phone: null,
    role: 'farmer',
    isVerified: true,
    createdAt: new Date().toISOString(),
  };

  const farmerB: UserResponse = {
    id: 'farmer-b-uuid',
    email: 'farmer.b@goviya.lk',
    fullName: 'Farmer B',
    phone: null,
    role: 'farmer',
    isVerified: true,
    createdAt: new Date().toISOString(),
  };

  const verifiedOfficer: UserResponse = {
    id: 'officer-verified-uuid',
    email: 'officer.verified@goviya.lk',
    fullName: 'Verified Officer',
    phone: null,
    role: 'officer',
    isVerified: true,
    createdAt: new Date().toISOString(),
  };

  const unverifiedOfficer: UserResponse = {
    id: 'officer-unverified-uuid',
    email: 'officer.unverified@goviya.lk',
    fullName: 'Unverified Officer',
    phone: null,
    role: 'officer',
    isVerified: false,
    createdAt: new Date().toISOString(),
  };

  const adminUser: UserResponse = {
    id: 'admin-uuid',
    email: 'admin@goviya.lk',
    fullName: 'System Admin',
    phone: null,
    role: 'admin',
    isVerified: true,
    createdAt: new Date().toISOString(),
  };

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Scope Hierarchy utility', () => {
    it('should correctly evaluate scope hierarchy', () => {
      expect(satisfiesScope('full', 'view_only')).toBe(true);
      expect(satisfiesScope('full', 'advisory')).toBe(true);
      expect(satisfiesScope('full', 'full')).toBe(true);

      expect(satisfiesScope('advisory', 'view_only')).toBe(true);
      expect(satisfiesScope('advisory', 'advisory')).toBe(true);
      expect(satisfiesScope('advisory', 'full')).toBe(false);

      expect(satisfiesScope('view_only', 'view_only')).toBe(true);
      expect(satisfiesScope('view_only', 'advisory')).toBe(false);
      expect(satisfiesScope('view_only', 'full')).toBe(false);
    });
  });

  describe('assertPlotAccess scenarios', () => {
    // 1. Farmer A (Owner) vs Farmer B (IDOR)
    it('should grant access to the plot owner (Farmer A)', async () => {
      jest.spyOn(pool, 'query').mockImplementation(async (text: unknown) => {
        const sql = String(text);
        if (sql.includes('SELECT id, farmer_id FROM plots')) {
          return {
            rows: [{ id: plotId, farmer_id: farmerA.id }],
            rowCount: 1,
          } as never;
        }
        return { rows: [], rowCount: 0 } as never;
      });

      const result = await authzService.assertPlotAccess(farmerA, plotId);
      expect(result.isOwner).toBe(true);
      expect(result.userRole).toBe('farmer');
      expect(result.plotId).toBe(plotId);
    });

    it('should deny access and return 404 for non-owner farmer (Farmer B - IDOR attempt)', async () => {
      jest.spyOn(pool, 'query').mockImplementation(async (text: unknown) => {
        const sql = String(text);
        if (sql.includes('SELECT id, farmer_id FROM plots')) {
          // Plot belongs to Farmer A, not Farmer B
          return {
            rows: [{ id: plotId, farmer_id: farmerA.id }],
            rowCount: 1,
          } as never;
        }
        return { rows: [], rowCount: 0 } as never;
      });

      await expect(authzService.assertPlotAccess(farmerB, plotId)).rejects.toThrow(NotFound);
    });

    // 2. Officer without share
    it('should deny access and return 404 for officer with no share record', async () => {
      jest.spyOn(pool, 'query').mockImplementation(async (text: unknown) => {
        const sql = String(text);
        if (sql.includes('SELECT is_verified FROM users')) {
          return { rows: [{ is_verified: true }], rowCount: 1 } as never;
        }
        if (sql.includes('FROM shared_plots')) {
          return { rows: [], rowCount: 0 } as never;
        }
        return { rows: [], rowCount: 0 } as never;
      });

      await expect(authzService.assertPlotAccess(verifiedOfficer, plotId)).rejects.toThrow(
        NotFound,
      );
    });

    // 3. Officer with active share
    it('should grant access to verified officer with active share', async () => {
      jest.spyOn(pool, 'query').mockImplementation(async (text: unknown) => {
        const sql = String(text);
        if (sql.includes('SELECT is_verified FROM users')) {
          return { rows: [{ is_verified: true }], rowCount: 1 } as never;
        }
        if (sql.includes('FROM shared_plots')) {
          return {
            rows: [
              {
                id: 'share-1',
                scope: 'advisory',
                expires_at: new Date(Date.now() + 86400000),
                revoked_at: null,
              },
            ],
            rowCount: 1,
          } as never;
        }
        return { rows: [], rowCount: 0 } as never;
      });

      const result = await authzService.assertPlotAccess(verifiedOfficer, plotId, 'view_only');
      expect(result.isOwner).toBe(false);
      expect(result.userRole).toBe('officer');
      expect(result.grantedScope).toBe('advisory');
    });

    // 4. Officer with wrong/insufficient scope
    it('should deny access and return 404 when officer has insufficient scope', async () => {
      jest.spyOn(pool, 'query').mockImplementation(async (text: unknown) => {
        const sql = String(text);
        if (sql.includes('SELECT is_verified FROM users')) {
          return { rows: [{ is_verified: true }], rowCount: 1 } as never;
        }
        if (sql.includes('FROM shared_plots')) {
          return {
            rows: [
              {
                id: 'share-1',
                scope: 'view_only', // Only view_only
                expires_at: new Date(Date.now() + 86400000),
                revoked_at: null,
              },
            ],
            rowCount: 1,
          } as never;
        }
        return { rows: [], rowCount: 0 } as never;
      });

      // Operation requires 'full' scope
      await expect(authzService.assertPlotAccess(verifiedOfficer, plotId, 'full')).rejects.toThrow(
        NotFound,
      );
    });

    // 5. Officer with expired share
    it('should deny access and return 404 when share has expired', async () => {
      jest.spyOn(pool, 'query').mockImplementation(async (text: unknown) => {
        const sql = String(text);
        if (sql.includes('SELECT is_verified FROM users')) {
          return { rows: [{ is_verified: true }], rowCount: 1 } as never;
        }
        if (sql.includes('FROM shared_plots')) {
          // SQL query has WHERE (sp.expires_at IS NULL OR sp.expires_at > NOW())
          // so DB returns 0 rows for expired shares
          return { rows: [], rowCount: 0 } as never;
        }
        return { rows: [], rowCount: 0 } as never;
      });

      await expect(authzService.assertPlotAccess(verifiedOfficer, plotId)).rejects.toThrow(
        NotFound,
      );
    });

    // 6. Officer with revoked share
    it('should deny access and return 404 when share was revoked', async () => {
      jest.spyOn(pool, 'query').mockImplementation(async (text: unknown) => {
        const sql = String(text);
        if (sql.includes('SELECT is_verified FROM users')) {
          return { rows: [{ is_verified: true }], rowCount: 1 } as never;
        }
        if (sql.includes('FROM shared_plots')) {
          // SQL query has WHERE sp.revoked_at IS NULL so DB returns 0 rows
          return { rows: [], rowCount: 0 } as never;
        }
        return { rows: [], rowCount: 0 } as never;
      });

      await expect(authzService.assertPlotAccess(verifiedOfficer, plotId)).rejects.toThrow(
        NotFound,
      );
    });

    // 7. Unverified officer
    it('should deny access and return 404 for unverified officer even if share exists', async () => {
      jest.spyOn(pool, 'query').mockImplementation(async (text: unknown) => {
        const sql = String(text);
        if (sql.includes('SELECT is_verified FROM users')) {
          return { rows: [{ is_verified: false }], rowCount: 1 } as never;
        }
        return { rows: [], rowCount: 0 } as never;
      });

      await expect(authzService.assertPlotAccess(unverifiedOfficer, plotId)).rejects.toThrow(
        NotFound,
      );
    });

    // 8. Admin boundary (always denied for farm data)
    it('should always deny access and return 404 for admin user to preserve privacy boundary', async () => {
      const querySpy = jest.spyOn(pool, 'query');

      await expect(authzService.assertPlotAccess(adminUser, plotId)).rejects.toThrow(NotFound);

      // Verify no database query was even made for plot data
      expect(querySpy).not.toHaveBeenCalled();
    });
  });
});
