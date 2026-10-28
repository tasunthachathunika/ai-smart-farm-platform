import { pool } from '../src/db';
import { officerService } from '../src/services/officer.service';
import { advisoryNoteService } from '../src/services/advisoryNote.service';
import { authzService } from '../src/services/authz.service';
import { UserResponse } from '../src/services/auth.service';
import { NotFound, Forbidden } from '../src/utils/errors';
import { createAdvisoryNoteSchema } from '../src/validators/advisoryNote.validator';

describe('Officer Directory, Category Scope Enforcement & Advisory Notes Suite', () => {
  const farmerA: UserResponse = {
    id: '11111111-1111-4111-8111-111111111111',
    email: 'farmer.a@goviya.lk',
    fullName: 'Farmer A',
    phone: '+94771111111',
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

  const plotA = {
    id: '66666666-6666-4666-8666-666666666666',
    name: 'Sector 5 Rice Basin',
    district: 'Anuradhapura',
    area_ha: '3.50',
    soil_type: 'Clay',
    irrigation_source: 'Tank',
    farmer_id: farmerA.id,
  };

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('1. Zod Validation for createAdvisoryNoteSchema', () => {
    it('validates a valid advisory note creation payload', () => {
      const valid = {
        title: 'Nutrient Deficiency Observation',
        notes: 'Observed yellowing of lower leaves indicative of nitrogen deficiency.',
        recommendations: 'Apply top dressing of organic compost before the next watering.',
      };
      const parsed = createAdvisoryNoteSchema.parse(valid);
      expect(parsed.title).toBe(valid.title);
      expect(parsed.notes).toBe(valid.notes);
    });

    it('rejects notes shorter than 5 characters', () => {
      expect(() =>
        createAdvisoryNoteSchema.parse({
          notes: 'Bad',
        }),
      ).toThrow();
    });
  });

  describe('2. GET /api/officer/plots (only active shares with scopes, blurred district, never GPS)', () => {
    it('returns only active shares with scopes and blurred district; GPS is strictly null', async () => {
      jest.spyOn(pool, 'query').mockImplementation(async (sql: unknown) => {
        const queryText = String(sql);
        if (queryText.includes('COUNT(*)')) {
          return { rows: [{ count: '1' }], rowCount: 1 } as never;
        }
        if (queryText.includes('SELECT sp.id AS share_id')) {
          return {
            rows: [
              {
                share_id: 'share-001',
                scope: 'advisory',
                scopes: ['crop_cycles', 'advisory_notes'],
                granted_at: new Date(),
                expires_at: null,
                plot_id: plotA.id,
                plot_name: plotA.name,
                district: plotA.district,
                area_ha: plotA.area_ha,
                soil_type: plotA.soil_type,
                irrigation_source: plotA.irrigation_source,
                farmer_id: farmerA.id,
                farmer_name: farmerA.fullName,
                farmer_email: farmerA.email,
                farmer_phone: farmerA.phone,
              },
            ],
            rowCount: 1,
          } as never;
        }
        return { rows: [], rowCount: 0 } as never;
      });

      const res = await officerService.getOfficerPlots(verifiedOfficer, {});
      expect(res.data.length).toBe(1);
      const item = res.data[0];

      expect(item.id).toBe(plotA.id);
      expect(item.name).toBe(plotA.name);
      expect(item.district).toBe('Anuradhapura');
      expect(item.gps_blurred_district).toBe('Anuradhapura');
      expect(item.gps).toBeNull(); // CRITICAL: NEVER EXPOSED TO OFFICERS
      expect(item.farmer.fullName).toBe(farmerA.fullName);
      expect(item.share.scope).toBe('advisory');
      expect(item.share.scopes).toEqual(['crop_cycles', 'advisory_notes']);
    });

    it('rejects unverified officer from accessing officer directory with 403', async () => {
      await expect(officerService.getOfficerPlots(unverifiedOfficer, {})).rejects.toThrow(
        Forbidden,
      );
    });

    it('rejects Farmer from accessing officer directory with 403', async () => {
      await expect(officerService.getOfficerPlots(farmerA, {})).rejects.toThrow(Forbidden);
    });

    it('rejects Admin from accessing officer directory with 404 (Admin privacy boundary)', async () => {
      await expect(officerService.getOfficerPlots(adminUser, {})).rejects.toThrow(NotFound);
    });
  });

  describe('3. Category Scope Enforcement: 404 for out-of-scope categories', () => {
    it('allows access to crop_cycles when permitted in scopes, but returns 404 for harvests when out-of-scope', async () => {
      // Mock share granted ONLY for crop_cycles
      jest.spyOn(authzService, 'assertPlotAccess').mockResolvedValue({
        plotId: plotA.id,
        isOwner: false,
        userRole: 'officer',
        grantedScope: 'view_only',
        scopes: ['crop_cycles'], // ONLY crop_cycles is permitted
      });

      jest.spyOn(pool, 'query').mockImplementation(async (sql: unknown) => {
        const queryText = String(sql);
        if (queryText.includes('COUNT(*)')) {
          return { rows: [{ count: '1' }], rowCount: 1 } as never;
        }
        if (queryText.includes('FROM crop_cycles')) {
          return {
            rows: [
              {
                id: 'cycle-01',
                plot_id: plotA.id,
                crop_name: 'Paddy Samba',
                variety: 'Samba',
                start_date: '2026-05-01',
                end_date: null,
                status: 'active',
                estimated_yield_kg: '5000.00',
                created_at: new Date(),
                updated_at: new Date(),
              },
            ],
            rowCount: 1,
          } as never;
        }
        if (queryText.includes('INSERT INTO audit_logs')) {
          return { rows: [], rowCount: 1 } as never;
        }
        return { rows: [], rowCount: 0 } as never;
      });

      // 1. In-scope category: crop_cycles -> SUCCEEDS
      const cycles = await officerService.getPlotCropCycles(verifiedOfficer, plotA.id, {});
      expect(cycles.data.length).toBe(1);
      expect(cycles.data[0].cropName).toBe('Paddy Samba');

      // 2. Out-of-scope category: harvests -> MUST RETURN 404
      await expect(officerService.getPlotHarvests(verifiedOfficer, plotA.id, {})).rejects.toThrow(
        NotFound,
      );

      // 3. Out-of-scope category: activity_logs -> MUST RETURN 404
      await expect(
        officerService.getPlotActivityLogs(verifiedOfficer, plotA.id, {}),
      ).rejects.toThrow(NotFound);

      // 4. Out-of-scope category: input_applications -> MUST RETURN 404
      await expect(
        officerService.getPlotInputApplications(verifiedOfficer, plotA.id, {}),
      ).rejects.toThrow(NotFound);
    });
  });

  describe('4. Advisory Notes (POST/GET /api/plots/:id/advisory-notes)', () => {
    it('officer writes advisory note with active share, writes audit log, and returns 201', async () => {
      jest.spyOn(authzService, 'assertCategoryAccess').mockResolvedValueOnce({
        plotId: plotA.id,
        isOwner: false,
        userRole: 'officer',
        grantedScope: 'advisory',
        scopes: ['advisory_notes'],
      });

      let auditLogged = false;
      jest.spyOn(pool, 'query').mockImplementation(async (sql: unknown, params?: unknown) => {
        const queryText = String(sql);
        const p = (params || []) as unknown[];

        if (queryText.includes('INSERT INTO advisory_notes')) {
          return {
            rows: [
              {
                id: 'note-001',
                plot_id: plotA.id,
                officer_id: verifiedOfficer.id,
                title: 'Soil Aeration Recommendation',
                notes:
                  'Soil is compacted after heavy rains. Recommend gentle aeration before sowing.',
                recommendations: 'Avoid heavy tractor tillers; use light hand cultivator.',
                created_at: new Date(),
                updated_at: new Date(),
              },
            ],
            rowCount: 1,
          } as never;
        }
        if (queryText.includes('INSERT INTO audit_logs')) {
          expect(p[1]).toBe('create');
          expect(p[2]).toBe('advisory_notes');
          auditLogged = true;
          return { rows: [], rowCount: 1 } as never;
        }
        return { rows: [], rowCount: 0 } as never;
      });

      const note = await advisoryNoteService.createNote(verifiedOfficer, plotA.id, {
        title: 'Soil Aeration Recommendation',
        notes: 'Soil is compacted after heavy rains. Recommend gentle aeration before sowing.',
        recommendations: 'Avoid heavy tractor tillers; use light hand cultivator.',
      });

      expect(note.id).toBe('note-001');
      expect(note.title).toBe('Soil Aeration Recommendation');
      expect(auditLogged).toBe(true);
    });

    it('rejects Farmer from writing advisory note with 403 (officer writes, farmer reads)', async () => {
      await expect(
        advisoryNoteService.createNote(farmerA, plotA.id, {
          title: 'Farmer trying to write note',
          notes: 'This should be prohibited for farmers.',
        }),
      ).rejects.toThrow(Forbidden);
    });

    it('farmer reads advisory notes on their owned plot', async () => {
      jest.spyOn(authzService, 'assertCategoryAccess').mockResolvedValueOnce({
        plotId: plotA.id,
        isOwner: true,
        userRole: 'farmer',
        grantedScope: 'full',
      });

      jest.spyOn(pool, 'query').mockImplementation(async (sql: unknown) => {
        const queryText = String(sql);
        if (queryText.includes('COUNT(*)')) {
          return { rows: [{ count: '1' }], rowCount: 1 } as never;
        }
        if (queryText.includes('SELECT n.id, n.plot_id')) {
          return {
            rows: [
              {
                id: 'note-001',
                plot_id: plotA.id,
                officer_id: verifiedOfficer.id,
                title: 'Soil Aeration Recommendation',
                notes: 'Soil is compacted after heavy rains.',
                recommendations: 'Use light hand cultivator.',
                created_at: new Date(),
                updated_at: new Date(),
                officer_name: verifiedOfficer.fullName,
                officer_email: verifiedOfficer.email,
              },
            ],
            rowCount: 1,
          } as never;
        }
        return { rows: [], rowCount: 0 } as never;
      });

      const res = await advisoryNoteService.getNotesForPlot(farmerA, plotA.id, {});
      expect(res.data.length).toBe(1);
      expect(res.data[0].title).toBe('Soil Aeration Recommendation');
      expect(res.data[0].officerName).toBe(verifiedOfficer.fullName);
    });

    it('blocks officer immediately from reading or writing advisory notes after share is revoked (404)', async () => {
      // Once revoked, assertCategoryAccess throws 404
      jest
        .spyOn(authzService, 'assertCategoryAccess')
        .mockRejectedValue(new NotFound('Resource not found'));

      // Writing note after revocation -> BLOCKED WITH 404
      await expect(
        advisoryNoteService.createNote(verifiedOfficer, plotA.id, {
          title: 'Post Revocation Note',
          notes: 'This attempt should be blocked with 404.',
        }),
      ).rejects.toThrow(NotFound);

      // Reading notes after revocation -> BLOCKED WITH 404
      await expect(
        advisoryNoteService.getNotesForPlot(verifiedOfficer, plotA.id, {}),
      ).rejects.toThrow(NotFound);
    });
  });
});
