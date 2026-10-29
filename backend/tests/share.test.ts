import request from 'supertest';
import { app } from '../src/app';
import { pool } from '../src/db';
import { authService } from '../src/services/auth.service';
import { createAccessToken } from '../src/utils/token';
import { shareService } from '../src/services/share.service';
import { auditService } from '../src/services/audit.service';
import { plotService } from '../src/services/plot.service';
import { UserResponse } from '../src/services/auth.service';
import { NotFound, Forbidden, ValidationError } from '../src/utils/errors';
import { createShareSchema } from '../src/validators/share.validator';

describe('Plot Sharing, Revocation & Farmer Audit Trail Suite', () => {
  const farmerA: UserResponse = {
    id: '11111111-1111-4111-8111-111111111111',
    email: 'farmer.a@goviya.lk',
    fullName: 'Farmer A',
    phone: '+94771111111',
    role: 'farmer',
    isVerified: true,
    createdAt: new Date().toISOString(),
  };

  const farmerB: UserResponse = {
    id: '22222222-2222-4222-8222-222222222222',
    email: 'farmer.b@goviya.lk',
    fullName: 'Farmer B',
    phone: '+94772222222',
    role: 'farmer',
    isVerified: true,
    createdAt: new Date().toISOString(),
  };

  const verifiedOfficer: UserResponse = {
    id: '33333333-3333-4333-8333-333333333333',
    email: 'officer.verified@goviya.lk',
    fullName: 'Verified Officer',
    phone: '+94773333333',
    role: 'officer',
    isVerified: true,
    createdAt: new Date().toISOString(),
  };

  const unverifiedOfficer: UserResponse = {
    id: '44444444-4444-4444-8444-444444444444',
    email: 'officer.unverified@goviya.lk',
    fullName: 'Unverified Officer',
    phone: '+94774444444',
    role: 'officer',
    isVerified: false,
    createdAt: new Date().toISOString(),
  };

  const adminUser: UserResponse = {
    id: '55555555-5555-4555-8555-555555555555',
    email: 'admin@goviya.lk',
    fullName: 'System Admin',
    phone: '+94775555555',
    role: 'admin',
    isVerified: true,
    createdAt: new Date().toISOString(),
  };

  const plotA1 = {
    id: '66666666-6666-4666-8666-666666666666',
    name: 'Paddy Field East',
    district: 'Polonnaruwa',
    farmer_id: '11111111-1111-4111-8111-111111111111',
  };

  const plotA2 = {
    id: '77777777-7777-4777-8777-777777777777',
    name: 'Paddy Field West',
    district: 'Polonnaruwa',
    farmer_id: '11111111-1111-4111-8111-111111111111',
  };

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('1. Zod Validation for createShareSchema', () => {
    it('validates a valid share grant payload', () => {
      const valid = {
        officerId: verifiedOfficer.id,
        plotIds: [plotA1.id, plotA2.id],
        scopes: ['view_only', 'advisory'] as const,
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
      };
      const parsed = createShareSchema.parse(valid);
      expect(parsed.officerId).toBe(verifiedOfficer.id);
      expect(parsed.plotIds.length).toBe(2);
      expect(parsed.scopes).toContain('advisory');
    });

    it('rejects expired or past expiresAt date', () => {
      expect(() =>
        createShareSchema.parse({
          officerId: verifiedOfficer.id,
          plotIds: [plotA1.id],
          scopes: ['view_only'],
          expiresAt: new Date(Date.now() - 10000).toISOString(),
        }),
      ).toThrow();
    });

    it('rejects empty plotIds array', () => {
      expect(() =>
        createShareSchema.parse({
          officerId: verifiedOfficer.id,
          plotIds: [],
          scopes: ['view_only'],
        }),
      ).toThrow();
    });
  });

  describe('2. Grant Shares (POST /api/shares)', () => {
    it('allows farmer to grant access to multiple plots to a verified officer and writes audit logs', async () => {
      const clientQueries: string[] = [];
      const mockClient = {
        query: jest.fn().mockImplementation(async (sql: unknown, params?: unknown) => {
          const queryText = String(sql);
          clientQueries.push(queryText);
          const p = (params || []) as unknown[];

          if (queryText === 'BEGIN' || queryText === 'COMMIT') {
            return { rows: [], rowCount: 0 } as never;
          }
          if (queryText.includes('UPDATE shared_plots')) {
            return { rows: [], rowCount: 0 } as never;
          }
          if (queryText.includes('INSERT INTO shared_plots')) {
            return {
              rows: [
                {
                  id: `share-${p[0]}`,
                  plot_id: p[0],
                  officer_id: p[1],
                  scope: p[2],
                  scopes: p[3],
                  granted_at: new Date(),
                  expires_at: p[5] || null,
                  revoked_at: null,
                  revoked_by: null,
                },
              ],
              rowCount: 1,
            } as never;
          }
          if (queryText.includes('INSERT INTO audit_logs')) {
            expect(p[1]).toBe('share_grant');
            expect(p[2]).toBe('shared_plots');
            return { rows: [], rowCount: 1 } as never;
          }
          return { rows: [], rowCount: 0 } as never;
        }),
        release: jest.fn(),
      };

      jest.spyOn(pool, 'connect').mockResolvedValueOnce(mockClient as never);

      jest.spyOn(pool, 'query').mockImplementation(async (sql: unknown) => {
        const queryText = String(sql);
        if (queryText.includes('FROM users WHERE id = $1')) {
          return {
            rows: [
              {
                id: verifiedOfficer.id,
                role: 'officer',
                is_verified: true,
                full_name: verifiedOfficer.fullName,
                email: verifiedOfficer.email,
              },
            ],
            rowCount: 1,
          } as never;
        }
        if (queryText.includes('SELECT id, name, district, farmer_id FROM plots')) {
          return {
            rows: [plotA1, plotA2],
            rowCount: 2,
          } as never;
        }
        return { rows: [], rowCount: 0 } as never;
      });

      const result = await shareService.createShares(farmerA, {
        officerId: verifiedOfficer.id,
        plotIds: [plotA1.id, plotA2.id],
        scopes: ['view_only', 'advisory'],
      });

      expect(result.length).toBe(2);
      expect(result[0].plotId).toBe(plotA1.id);
      expect(result[0].scope).toBe('advisory');
      expect(result[1].plotId).toBe(plotA2.id);
      expect(clientQueries).toContain('BEGIN');
      expect(clientQueries).toContain('COMMIT');
    });

    it('rejects sharing with an unverified officer', async () => {
      jest.spyOn(pool, 'query').mockResolvedValueOnce({
        rows: [
          {
            id: unverifiedOfficer.id,
            role: 'officer',
            is_verified: false,
            full_name: unverifiedOfficer.fullName,
            email: unverifiedOfficer.email,
          },
        ],
        rowCount: 1,
      } as never);

      await expect(
        shareService.createShares(farmerA, {
          officerId: unverifiedOfficer.id,
          plotIds: [plotA1.id],
          scopes: ['view_only'],
        }),
      ).rejects.toThrow(Forbidden);
    });

    it('rejects sharing when officer does not exist', async () => {
      jest.spyOn(pool, 'query').mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      } as never);

      await expect(
        shareService.createShares(farmerA, {
          officerId: '00000000-0000-0000-0000-000000000000',
          plotIds: [plotA1.id],
          scopes: ['view_only'],
        }),
      ).rejects.toThrow(ValidationError);
    });

    it('returns 404 when farmer attempts to share plots they do not own (IDOR protection)', async () => {
      jest.spyOn(pool, 'query').mockImplementation(async (sql: unknown) => {
        const queryText = String(sql);
        if (queryText.includes('FROM users WHERE id = $1')) {
          return {
            rows: [
              {
                id: verifiedOfficer.id,
                role: 'officer',
                is_verified: true,
                full_name: verifiedOfficer.fullName,
                email: verifiedOfficer.email,
              },
            ],
            rowCount: 1,
          } as never;
        }
        if (queryText.includes('SELECT id, name, district, farmer_id FROM plots')) {
          // Plot belongs to farmerB
          return {
            rows: [{ ...plotA1, farmer_id: farmerB.id }],
            rowCount: 1,
          } as never;
        }
        return { rows: [], rowCount: 0 } as never;
      });

      await expect(
        shareService.createShares(farmerA, {
          officerId: verifiedOfficer.id,
          plotIds: [plotA1.id],
          scopes: ['view_only'],
        }),
      ).rejects.toThrow(NotFound);
    });
  });

  describe('3. List Shares (GET /api/shares)', () => {
    it('returns shared plots for the owner farmer with pagination', async () => {
      jest.spyOn(pool, 'query').mockImplementation(async (sql: unknown) => {
        const queryText = String(sql);
        if (queryText.includes('COUNT(*)')) {
          return { rows: [{ count: '1' }], rowCount: 1 } as never;
        }
        if (queryText.includes('SELECT sp.id')) {
          return {
            rows: [
              {
                id: 'share-101',
                plot_id: plotA1.id,
                officer_id: verifiedOfficer.id,
                scope: 'advisory',
                granted_at: new Date(),
                expires_at: null,
                revoked_at: null,
                revoked_by: null,
                plot_name: plotA1.name,
                district: plotA1.district,
                farmer_id: farmerA.id,
                officer_name: verifiedOfficer.fullName,
                officer_email: verifiedOfficer.email,
                farmer_name: farmerA.fullName,
              },
            ],
            rowCount: 1,
          } as never;
        }
        return { rows: [], rowCount: 0 } as never;
      });

      const res = await shareService.getShares(farmerA, { status: 'active' });
      expect(res.data.length).toBe(1);
      expect(res.data[0].plotName).toBe(plotA1.name);
      expect(res.data[0].officerName).toBe(verifiedOfficer.fullName);
    });

    it('returns 404 when Admin attempts to list shares', async () => {
      await expect(shareService.getShares(adminUser, {})).rejects.toThrow(NotFound);
    });
  });

  describe('4. Revoke Share (DELETE /api/shares/:id)', () => {
    it('revokes share in a database transaction with audit entry', async () => {
      let executedInTx = false;
      let auditLogged = false;

      const mockClient = {
        query: jest.fn().mockImplementation(async (sql: unknown, params?: unknown) => {
          const queryText = String(sql);
          const p = (params || []) as unknown[];

          if (queryText === 'BEGIN') {
            executedInTx = true;
            return { rows: [], rowCount: 0 } as never;
          }
          if (queryText.includes('SELECT sp.id')) {
            return {
              rows: [
                {
                  id: 'share-101',
                  plot_id: plotA1.id,
                  officer_id: verifiedOfficer.id,
                  farmer_id: farmerA.id,
                  plot_name: plotA1.name,
                  scope: 'advisory',
                  revoked_at: null,
                },
              ],
              rowCount: 1,
            } as never;
          }
          if (queryText.includes('UPDATE shared_plots')) {
            expect(p[1]).toBe(farmerA.id); // revoked_by
            expect(p[2]).toBe('share-101'); // id
            return { rows: [], rowCount: 1 } as never;
          }
          if (queryText.includes('INSERT INTO audit_logs')) {
            expect(p[1]).toBe('share_revoke');
            expect(p[2]).toBe('shared_plots');
            auditLogged = true;
            return { rows: [], rowCount: 1 } as never;
          }
          if (queryText === 'COMMIT') {
            return { rows: [], rowCount: 0 } as never;
          }
          return { rows: [], rowCount: 0 } as never;
        }),
        release: jest.fn(),
      };

      jest.spyOn(pool, 'connect').mockResolvedValueOnce(mockClient as never);

      const res = await shareService.revokeShare(farmerA, 'share-101');
      expect(res.message).toBe('Share successfully revoked');
      expect(executedInTx).toBe(true);
      expect(auditLogged).toBe(true);
    });

    it('prevents Farmer B from revoking Farmer A share', async () => {
      const mockClient = {
        query: jest.fn().mockImplementation(async (sql: unknown) => {
          const queryText = String(sql);
          if (queryText === 'BEGIN') return { rows: [], rowCount: 0 } as never;
          if (queryText.includes('SELECT sp.id')) {
            return {
              rows: [
                {
                  id: 'share-101',
                  plot_id: plotA1.id,
                  officer_id: verifiedOfficer.id,
                  farmer_id: farmerA.id, // belongs to farmer A
                  plot_name: plotA1.name,
                  scope: 'advisory',
                  revoked_at: null,
                },
              ],
              rowCount: 1,
            } as never;
          }
          if (queryText === 'ROLLBACK') return { rows: [], rowCount: 0 } as never;
          return { rows: [], rowCount: 0 } as never;
        }),
        release: jest.fn(),
      };

      jest.spyOn(pool, 'connect').mockResolvedValueOnce(mockClient as never);

      await expect(shareService.revokeShare(farmerB, 'share-101')).rejects.toThrow(NotFound);
    });
  });

  describe('5. Immediate Revocation Enforcement: revoke blocks the officer very next request', () => {
    it('officer access succeeds before revocation and immediately returns 404 on the very next request after revocation', async () => {
      let isRevoked = false;

      // Mock database state that transitions upon revocation
      jest.spyOn(pool, 'query').mockImplementation(async (sql: unknown) => {
        const queryText = String(sql);

        // Officer user verification check
        if (queryText.includes('SELECT is_verified FROM users WHERE id = $1')) {
          return { rows: [{ is_verified: true }], rowCount: 1 } as never;
        }

        // Active share check in authzService.assertPlotAccess
        if (
          queryText.includes('FROM shared_plots sp') &&
          queryText.includes('sp.revoked_at IS NULL')
        ) {
          if (!isRevoked) {
            return {
              rows: [
                {
                  id: 'share-active-uuid',
                  scope: 'advisory',
                  expires_at: null,
                  revoked_at: null,
                },
              ],
              rowCount: 1,
            } as never;
          } else {
            // After revocation, revoked_at IS NOT NULL, so active query returns empty
            return { rows: [], rowCount: 0 } as never;
          }
        }

        // Plot details query
        if (queryText.includes('SELECT id, farmer_id, field_id, name, district')) {
          return {
            rows: [
              {
                id: plotA1.id,
                farmer_id: farmerA.id,
                field_id: null,
                name: plotA1.name,
                district: plotA1.district,
                area_ha: '2.50',
                soil_type: 'Clay Loam',
                irrigation_source: 'Canal',
                encrypted_gps: 'mock-ciphertext',
                gps_iv: 'mock-iv',
                gps_auth_tag: 'mock-tag',
                created_at: new Date(),
                updated_at: new Date(),
              },
            ],
            rowCount: 1,
          } as never;
        }

        // Audit log insert for plot_viewed_by_officer
        if (queryText.includes('INSERT INTO audit_logs')) {
          return { rows: [], rowCount: 1 } as never;
        }

        return { rows: [], rowCount: 0 } as never;
      });

      // STEP 1: Officer's initial request to view shared plot -> SUCCEEDS
      const initialView = await plotService.getPlotById(verifiedOfficer, plotA1.id);
      expect(initialView.id).toBe(plotA1.id);
      expect(initialView.district).toBe(plotA1.district);
      expect(initialView.gps).toBeNull(); // Officer receives blurred GPS

      // STEP 2: Farmer revokes the share
      const mockClient = {
        query: jest.fn().mockImplementation(async (sql: unknown) => {
          const queryText = String(sql);
          if (queryText === 'BEGIN' || queryText === 'COMMIT')
            return { rows: [], rowCount: 0 } as never;
          if (queryText.includes('SELECT sp.id')) {
            return {
              rows: [
                {
                  id: 'share-active-uuid',
                  plot_id: plotA1.id,
                  officer_id: verifiedOfficer.id,
                  farmer_id: farmerA.id,
                  plot_name: plotA1.name,
                  scope: 'advisory',
                  revoked_at: null,
                },
              ],
              rowCount: 1,
            } as never;
          }
          if (queryText.includes('UPDATE shared_plots')) {
            isRevoked = true; // State immediately updated in DB
            return { rows: [], rowCount: 1 } as never;
          }
          if (queryText.includes('INSERT INTO audit_logs')) {
            return { rows: [], rowCount: 1 } as never;
          }
          return { rows: [], rowCount: 0 } as never;
        }),
        release: jest.fn(),
      };
      jest.spyOn(pool, 'connect').mockResolvedValueOnce(mockClient as never);

      await shareService.revokeShare(farmerA, 'share-active-uuid');
      expect(isRevoked).toBe(true);

      // STEP 3: Officer's VERY NEXT request to view the same plot -> MUST BE IMMEDIATELY BLOCKED (404)
      await expect(plotService.getPlotById(verifiedOfficer, plotA1.id)).rejects.toThrow(NotFound);
    });
  });

  describe('6. Farmer Audit Trail (GET /api/audit)', () => {
    it('returns audit events including share_grant, share_revoke, plot_viewed_by_officer, and ai_used', async () => {
      jest.spyOn(pool, 'query').mockImplementation(async (sql: unknown) => {
        const queryText = String(sql);
        if (queryText.includes('COUNT(*)')) {
          return { rows: [{ count: '4' }], rowCount: 1 } as never;
        }
        if (queryText.includes('SELECT a.id')) {
          return {
            rows: [
              {
                id: 'audit-01',
                user_id: farmerA.id,
                action: 'share_grant',
                entity_type: 'shared_plots',
                entity_id: 'share-101',
                metadata: { plotName: 'Paddy Field East', officerName: 'Verified Officer' },
                ip_address: '127.0.0.1',
                user_agent: 'Jest Test Agent',
                created_at: new Date(),
                actor_name: farmerA.fullName,
                actor_role: 'farmer',
              },
              {
                id: 'audit-02',
                user_id: verifiedOfficer.id,
                action: 'plot_viewed_by_officer',
                entity_type: 'plots',
                entity_id: plotA1.id,
                metadata: { plotName: 'Paddy Field East', farmerId: farmerA.id },
                ip_address: '127.0.0.1',
                user_agent: 'Jest Test Agent',
                created_at: new Date(),
                actor_name: verifiedOfficer.fullName,
                actor_role: 'officer',
              },
              {
                id: 'audit-03',
                user_id: farmerA.id,
                action: 'ai_used',
                entity_type: 'advisory',
                entity_id: plotA1.id,
                metadata: { query: 'summarize soil conditions', farmerId: farmerA.id },
                ip_address: '127.0.0.1',
                user_agent: 'Jest Test Agent',
                created_at: new Date(),
                actor_name: farmerA.fullName,
                actor_role: 'farmer',
              },
              {
                id: 'audit-04',
                user_id: farmerA.id,
                action: 'share_revoke',
                entity_type: 'shared_plots',
                entity_id: 'share-101',
                metadata: { plotName: 'Paddy Field East', revokedByRole: 'farmer' },
                ip_address: '127.0.0.1',
                user_agent: 'Jest Test Agent',
                created_at: new Date(),
                actor_name: farmerA.fullName,
                actor_role: 'farmer',
              },
            ],
            rowCount: 4,
          } as never;
        }
        return { rows: [], rowCount: 0 } as never;
      });

      const auditRes = await auditService.getFarmerAuditEvents(farmerA, {
        page: 1,
        limit: 10,
      });

      expect(auditRes.data.length).toBe(4);
      expect(auditRes.pagination.total).toBe(4);

      const actions = auditRes.data.map((e) => e.action);
      expect(actions).toContain('share_grant');
      expect(actions).toContain('plot_viewed_by_officer');
      expect(actions).toContain('ai_used');
      expect(actions).toContain('share_revoke');
    });

    it('rejects Admin from accessing farmer audit trail with 404 (Admin privacy boundary)', async () => {
      await expect(auditService.getFarmerAuditEvents(adminUser, {})).rejects.toThrow(NotFound);
    });

    it('rejects Officer from accessing farmer audit trail with 403', async () => {
      await expect(auditService.getFarmerAuditEvents(verifiedOfficer, {})).rejects.toThrow(
        Forbidden,
      );
    });
    it('returns 200 for a farmer accessing GET /api/audit', async () => {
      const token = createAccessToken({
        userId: farmerA.id,
        role: farmerA.role,
        email: farmerA.email,
      });

      jest.spyOn(authService, 'getMe').mockResolvedValue(farmerA);

      let executedCountSql = '';
      let executedDataSql = '';
      let queryParams: unknown[] = [];

      jest.spyOn(pool, 'query').mockImplementation(async (sql: unknown, params?: unknown) => {
        const queryText = String(sql);
        if (queryText.includes('COUNT(*)')) {
          executedCountSql = queryText;
          queryParams = (params || []) as unknown[];
          return { rows: [{ count: '1' }], rowCount: 1 } as never;
        }
        if (queryText.includes('SELECT a.id')) {
          executedDataSql = queryText;
          return {
            rows: [
              {
                id: 'audit-01',
                user_id: farmerA.id,
                action: 'plot_created',
                entity_type: 'plots',
                entity_id: plotA1.id,
                metadata: { plotName: 'Paddy Field East' },
                ip_address: '127.0.0.1',
                user_agent: 'Jest Test Agent',
                created_at: new Date(),
                actor_name: farmerA.fullName,
                actor_role: 'farmer',
              },
            ],
            rowCount: 1,
          } as never;
        }
        return { rows: [], rowCount: 0 } as never;
      });

      const res = await request(app)
        .get('/api/audit')
        .set('Cookie', [`accessToken=${token}`]);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('pagination');
      expect(res.body.pagination.total).toBe(1);
      expect(res.body.data[0].id).toBe('audit-01');

      // Verify explicit UUID and TEXT casts in SQL queries to prevent "operator does not exist: text = uuid"
      expect(executedCountSql).toContain("(a.metadata->>'farmerId') = $1::text");
      expect(executedCountSql).toContain('a.user_id = $1::uuid');
      expect(executedCountSql).toContain('a.entity_id::uuid IN');
      expect(executedDataSql).toContain("(a.metadata->>'farmerId') = $1::text");
      expect(executedDataSql).toContain('a.user_id = $1::uuid');
      expect(executedDataSql).toContain('a.entity_id::uuid IN');
      expect(queryParams).toContain(farmerA.id);
    });
  });
});
