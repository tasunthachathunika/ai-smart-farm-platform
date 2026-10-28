import { pool } from '../src/db';
import { plotService } from '../src/services/plot.service';
import { fieldService } from '../src/services/field.service';
import { cropCycleService } from '../src/services/cropCycle.service';
import { activityLogService } from '../src/services/activityLog.service';
import { inputApplicationService } from '../src/services/inputApplication.service';
import { harvestService } from '../src/services/harvest.service';
import { authzService } from '../src/services/authz.service';
import { UserResponse } from '../src/services/auth.service';
import { NotFound, Forbidden } from '../src/utils/errors';
import { encryptGps } from '../src/utils/crypto';

describe('Farm CRUD, Access Control, and Security Suite', () => {
  const farmerA: UserResponse = {
    id: 'farmer-a-uuid',
    email: 'farmer.a@goviya.lk',
    fullName: 'Farmer A',
    phone: '+94771111111',
    role: 'farmer',
    isVerified: true,
    createdAt: new Date().toISOString(),
  };

  const farmerB: UserResponse = {
    id: 'farmer-b-uuid',
    email: 'farmer.b@goviya.lk',
    fullName: 'Farmer B',
    phone: '+94772222222',
    role: 'farmer',
    isVerified: true,
    createdAt: new Date().toISOString(),
  };

  const officerUser: UserResponse = {
    id: 'officer-uuid',
    email: 'officer@goviya.lk',
    fullName: 'Agriculture Extension Officer',
    phone: '+94773333333',
    role: 'officer',
    isVerified: true,
    createdAt: new Date().toISOString(),
  };

  const adminUser: UserResponse = {
    id: 'admin-uuid',
    email: 'admin@goviya.lk',
    fullName: 'System Admin',
    phone: '+94774444444',
    role: 'admin',
    isVerified: true,
    createdAt: new Date().toISOString(),
  };

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('1. Plot CRUD & AES-256-GCM GPS Privacy', () => {
    const rawGps = { latitude: 8.3114, longitude: 80.4037 };
    const encrypted = encryptGps(JSON.stringify(rawGps));

    it('encrypts GPS coordinates on plot creation and logs audit action', async () => {
      const mockQuery = jest
        .spyOn(pool, 'query')
        .mockImplementation(async (sql: unknown, params?: unknown) => {
          const queryText = String(sql);
          const p = (params || []) as unknown[];
          if (queryText.includes('INSERT INTO plots')) {
            // Verify that raw GPS was not stored directly
            expect(String(p[4])).not.toContain('8.3114'); // ciphertext
            expect(p[5]).toBeDefined(); // iv
            expect(p[6]).toBeDefined(); // auth_tag
            return {
              rows: [
                {
                  id: 'plot-111',
                  farmer_id: farmerA.id,
                  field_id: null,
                  name: 'Paddy Sector 1',
                  district: 'Anuradhapura',
                  area_ha: '2.50',
                  soil_type: 'Clay Loam',
                  irrigation_source: 'Canal',
                  created_at: new Date(),
                  updated_at: new Date(),
                },
              ],
              rowCount: 1,
            } as never;
          }
          if (queryText.includes('INSERT INTO audit_logs')) {
            expect(p[1]).toBe('create');
            expect(p[2]).toBe('plots');
            return { rows: [], rowCount: 1 } as never;
          }
          return { rows: [], rowCount: 0 } as never;
        });

      const result = await plotService.createPlot(farmerA, {
        name: 'Paddy Sector 1',
        district: 'Anuradhapura',
        areaHa: 2.5,
        gps: rawGps,
        soilType: 'Clay Loam',
        irrigationSource: 'Canal',
      });

      expect(result.id).toBe('plot-111');
      expect(result.gps).toEqual(rawGps);
      expect(mockQuery).toHaveBeenCalled();
    });

    it('prevents non-farmers from creating plots', async () => {
      await expect(
        plotService.createPlot(officerUser, {
          name: 'Officer Plot',
          district: 'Galle',
          areaHa: 1.0,
          gps: rawGps,
        }),
      ).rejects.toThrow(Forbidden);
    });

    it('returns exact decrypted GPS to the plot owner', async () => {
      jest.spyOn(authzService, 'assertPlotAccess').mockResolvedValueOnce({
        plotId: 'plot-111',
        isOwner: true,
        userRole: 'farmer',
        grantedScope: 'full',
      });

      jest.spyOn(pool, 'query').mockImplementation(async () => {
        return {
          rows: [
            {
              id: 'plot-111',
              farmer_id: farmerA.id,
              field_id: null,
              name: 'Paddy Sector 1',
              district: 'Anuradhapura',
              area_ha: '2.50',
              soil_type: 'Clay Loam',
              irrigation_source: 'Canal',
              encrypted_gps: encrypted.ciphertext,
              gps_iv: encrypted.iv,
              gps_auth_tag: encrypted.authTag,
              created_at: new Date(),
              updated_at: new Date(),
            },
          ],
          rowCount: 1,
        } as never;
      });

      const result = await plotService.getPlotById(farmerA, 'plot-111');
      expect(result.gps).toEqual(rawGps);
    });

    it('returns blurred district info and NULL GPS to verified extension officers', async () => {
      jest.spyOn(authzService, 'assertPlotAccess').mockResolvedValueOnce({
        plotId: 'plot-111',
        isOwner: false,
        userRole: 'officer',
        grantedScope: 'advisory',
      });

      jest.spyOn(pool, 'query').mockImplementation(async () => {
        return {
          rows: [
            {
              id: 'plot-111',
              farmer_id: farmerA.id,
              field_id: null,
              name: 'Paddy Sector 1',
              district: 'Anuradhapura',
              area_ha: '2.50',
              soil_type: 'Clay Loam',
              irrigation_source: 'Canal',
              encrypted_gps: encrypted.ciphertext,
              gps_iv: encrypted.iv,
              gps_auth_tag: encrypted.authTag,
              created_at: new Date(),
              updated_at: new Date(),
            },
          ],
          rowCount: 1,
        } as never;
      });

      const result = await plotService.getPlotById(officerUser, 'plot-111');
      expect(result.district).toBe('Anuradhapura');
      expect(result.gps).toBeNull(); // Officer must NEVER receive exact coordinates
    });

    it('returns 404 when admin attempts to access plots', async () => {
      await expect(plotService.getPlots(adminUser, {})).rejects.toThrow(NotFound);
    });

    it('updates plot and re-encrypts GPS if updated', async () => {
      jest.spyOn(authzService, 'assertPlotAccess').mockResolvedValueOnce({
        plotId: 'plot-111',
        isOwner: true,
        userRole: 'farmer',
        grantedScope: 'full',
      });

      const newGps = { latitude: 8.35, longitude: 80.45 };
      const newEncrypted = encryptGps(JSON.stringify(newGps));

      jest.spyOn(pool, 'query').mockImplementation(async (sql: unknown) => {
        const queryText = String(sql);
        if (queryText.includes('UPDATE plots')) {
          return {
            rows: [
              {
                id: 'plot-111',
                farmer_id: farmerA.id,
                field_id: null,
                name: 'Updated Sector 1',
                district: 'Anuradhapura',
                area_ha: '3.00',
                soil_type: 'Clay Loam',
                irrigation_source: 'Canal',
                encrypted_gps: newEncrypted.ciphertext,
                gps_iv: newEncrypted.iv,
                gps_auth_tag: newEncrypted.authTag,
                created_at: new Date(),
                updated_at: new Date(),
              },
            ],
            rowCount: 1,
          } as never;
        }
        return { rows: [], rowCount: 1 } as never;
      });

      const result = await plotService.updatePlot(farmerA, 'plot-111', {
        name: 'Updated Sector 1',
        areaHa: 3.0,
        gps: newGps,
      });

      expect(result.name).toBe('Updated Sector 1');
      expect(result.areaHa).toBe(3.0);
      expect(result.gps).toEqual(newGps);
    });

    it('deletes plot and writes audit log', async () => {
      jest.spyOn(authzService, 'assertPlotAccess').mockResolvedValueOnce({
        plotId: 'plot-111',
        isOwner: true,
        userRole: 'farmer',
        grantedScope: 'full',
      });

      let auditWritten = false;
      jest.spyOn(pool, 'query').mockImplementation(async (sql: unknown, params?: unknown) => {
        const queryText = String(sql);
        const p = (params || []) as unknown[];
        if (queryText.includes('DELETE FROM plots')) {
          return { rows: [], rowCount: 1 } as never;
        }
        if (queryText.includes('INSERT INTO audit_logs')) {
          expect(p[1]).toBe('delete');
          expect(p[2]).toBe('plots');
          auditWritten = true;
          return { rows: [], rowCount: 1 } as never;
        }
        return { rows: [], rowCount: 0 } as never;
      });

      await plotService.deletePlot(farmerA, 'plot-111');
      expect(auditWritten).toBe(true);
    });
  });

  describe('2. Crop Cycles CRUD & Authorization', () => {
    it('creates crop cycle after asserting advisory access and logs audit record', async () => {
      const assertSpy = jest.spyOn(authzService, 'assertPlotAccess').mockResolvedValueOnce({
        plotId: 'plot-111',
        isOwner: true,
        userRole: 'farmer',
        grantedScope: 'full',
      });

      let auditLogged = false;
      jest.spyOn(pool, 'query').mockImplementation(async (sql: unknown, params?: unknown) => {
        const queryText = String(sql);
        const p = (params || []) as unknown[];
        if (queryText.includes('INSERT INTO crop_cycles')) {
          return {
            rows: [
              {
                id: 'cycle-101',
                plot_id: 'plot-111',
                crop_name: 'Paddy BG 352',
                variety: 'BG 352',
                start_date: '2026-05-01',
                end_date: '2026-08-30',
                status: 'active',
                estimated_yield_kg: '4500.00',
                created_at: new Date(),
                updated_at: new Date(),
              },
            ],
            rowCount: 1,
          } as never;
        }
        if (queryText.includes('INSERT INTO audit_logs')) {
          expect(p[1]).toBe('create');
          expect(p[2]).toBe('crop_cycles');
          auditLogged = true;
          return { rows: [], rowCount: 1 } as never;
        }
        return { rows: [], rowCount: 0 } as never;
      });

      const result = await cropCycleService.createCropCycle(farmerA, {
        plotId: 'plot-111',
        cropName: 'Paddy BG 352',
        variety: 'BG 352',
        startDate: '2026-05-01',
        endDate: '2026-08-30',
        status: 'active',
        estimatedYieldKg: 4500,
      });

      expect(assertSpy).toHaveBeenCalledWith(farmerA, 'plot-111', 'advisory');
      expect(result.id).toBe('cycle-101');
      expect(result.estimatedYieldKg).toBe(4500);
      expect(auditLogged).toBe(true);
    });

    it('lists crop cycles with pagination and filters', async () => {
      jest.spyOn(pool, 'query').mockImplementation(async (sql: unknown) => {
        const queryText = String(sql);
        if (queryText.includes('COUNT(*)')) {
          return { rows: [{ count: '1' }], rowCount: 1 } as never;
        }
        if (queryText.includes('SELECT c.id')) {
          return {
            rows: [
              {
                id: 'cycle-101',
                plot_id: 'plot-111',
                crop_name: 'Paddy BG 352',
                variety: 'BG 352',
                start_date: '2026-05-01',
                end_date: '2026-08-30',
                status: 'active',
                estimated_yield_kg: '4500.00',
                created_at: new Date(),
                updated_at: new Date(),
              },
            ],
            rowCount: 1,
          } as never;
        }
        return { rows: [], rowCount: 0 } as never;
      });

      const res = await cropCycleService.getCropCycles(farmerA, {
        page: 1,
        limit: 10,
        status: 'active',
        cropName: 'Paddy',
      });

      expect(res.data.length).toBe(1);
      expect(res.pagination.total).toBe(1);
      expect(res.data[0].cropName).toBe('Paddy BG 352');
    });
  });

  describe('3. Activity Logs (filter by type/date/q)', () => {
    it('creates activity log and writes audit log', async () => {
      jest.spyOn(cropCycleService, 'getPlotIdForCycle').mockResolvedValueOnce('plot-111');
      jest.spyOn(authzService, 'assertPlotAccess').mockResolvedValueOnce({
        plotId: 'plot-111',
        isOwner: true,
        userRole: 'farmer',
        grantedScope: 'full',
      });

      let auditLogged = false;
      jest.spyOn(pool, 'query').mockImplementation(async (sql: unknown, params?: unknown) => {
        const queryText = String(sql);
        const p = (params || []) as unknown[];
        if (queryText.includes('INSERT INTO activity_logs')) {
          return {
            rows: [
              {
                id: 'log-201',
                cycle_id: 'cycle-101',
                log_type: 'fertilizer',
                log_date: '2026-05-15',
                notes: 'Applied organic compost',
                created_at: new Date(),
                updated_at: new Date(),
              },
            ],
            rowCount: 1,
          } as never;
        }
        if (queryText.includes('INSERT INTO audit_logs')) {
          expect(p[1]).toBe('create');
          expect(p[2]).toBe('activity_logs');
          auditLogged = true;
          return { rows: [], rowCount: 1 } as never;
        }
        return { rows: [], rowCount: 0 } as never;
      });

      const log = await activityLogService.createActivityLog(farmerA, {
        cycleId: 'cycle-101',
        logType: 'fertilizer',
        logDate: '2026-05-15',
        notes: 'Applied organic compost',
      });

      expect(log.id).toBe('log-201');
      expect(log.logType).toBe('fertilizer');
      expect(auditLogged).toBe(true);
    });

    it('filters activity logs by type, date, date range, and q', async () => {
      let executedSql = '';
      let executedParams: unknown[] = [];

      jest.spyOn(pool, 'query').mockImplementation(async (sql: unknown, params?: unknown) => {
        const queryText = String(sql);
        if (queryText.includes('COUNT(*)')) {
          return { rows: [{ count: '1' }], rowCount: 1 } as never;
        }
        if (queryText.includes('SELECT l.id')) {
          executedSql = queryText;
          executedParams = (params || []) as unknown[];
          return {
            rows: [
              {
                id: 'log-201',
                cycle_id: 'cycle-101',
                log_type: 'irrigation',
                log_date: '2026-05-15',
                notes: 'Irrigated field through canal gate',
                created_at: new Date(),
                updated_at: new Date(),
              },
            ],
            rowCount: 1,
          } as never;
        }
        return { rows: [], rowCount: 0 } as never;
      });

      const res = await activityLogService.getActivityLogs(farmerA, {
        type: 'irrigation',
        date: '2026-05-15',
        startDate: '2026-05-01',
        endDate: '2026-05-31',
        q: 'canal',
      });

      expect(res.data.length).toBe(1);
      expect(executedSql).toContain('l.log_type =');
      expect(executedSql).toContain('l.log_date =');
      expect(executedSql).toContain('l.log_date >=');
      expect(executedSql).toContain('l.log_date <=');
      expect(executedSql).toContain('l.notes ILIKE');
      expect(executedParams).toContain('irrigation');
      expect(executedParams).toContain('%canal%');
    });
  });

  describe('4. Input Applications (free-text product, no AI recommendations)', () => {
    it('creates input application with free-text product name and logs audit record', async () => {
      jest.spyOn(cropCycleService, 'getPlotIdForCycle').mockResolvedValueOnce('plot-111');
      jest.spyOn(authzService, 'assertPlotAccess').mockResolvedValueOnce({
        plotId: 'plot-111',
        isOwner: true,
        userRole: 'farmer',
        grantedScope: 'full',
      });

      let auditLogged = false;
      jest.spyOn(pool, 'query').mockImplementation(async (sql: unknown, params?: unknown) => {
        const queryText = String(sql);
        const p = (params || []) as unknown[];
        if (queryText.includes('INSERT INTO input_applications')) {
          return {
            rows: [
              {
                id: 'input-301',
                cycle_id: 'cycle-101',
                input_type: 'fertilizer',
                name: 'Custom Mixed Organic Compost',
                quantity: '50.00',
                unit: 'kg',
                application_date: '2026-05-20',
                cost: '3500.00',
                created_at: new Date(),
              },
            ],
            rowCount: 1,
          } as never;
        }
        if (queryText.includes('INSERT INTO audit_logs')) {
          expect(p[1]).toBe('create');
          expect(p[2]).toBe('input_applications');
          auditLogged = true;
          return { rows: [], rowCount: 1 } as never;
        }
        return { rows: [], rowCount: 0 } as never;
      });

      const res = await inputApplicationService.createInputApplication(farmerA, {
        cycleId: 'cycle-101',
        inputType: 'fertilizer',
        name: 'Custom Mixed Organic Compost',
        quantity: 50.0,
        unit: 'kg',
        applicationDate: '2026-05-20',
        cost: 3500,
      });

      expect(res.id).toBe('input-301');
      expect(res.name).toBe('Custom Mixed Organic Compost');
      expect(res.quantity).toBe(50.0);
      expect(auditLogged).toBe(true);
    });

    it('updates input application and writes audit log', async () => {
      jest.spyOn(inputApplicationService, 'getPlotIdForInput').mockResolvedValueOnce('plot-111');
      jest.spyOn(authzService, 'assertPlotAccess').mockResolvedValueOnce({
        plotId: 'plot-111',
        isOwner: true,
        userRole: 'farmer',
        grantedScope: 'full',
      });

      let auditLogged = false;
      jest.spyOn(pool, 'query').mockImplementation(async (sql: unknown, params?: unknown) => {
        const queryText = String(sql);
        const p = (params || []) as unknown[];
        if (queryText.includes('UPDATE input_applications')) {
          return {
            rows: [
              {
                id: 'input-301',
                cycle_id: 'cycle-101',
                input_type: 'fertilizer',
                name: 'Custom Mixed Organic Compost',
                quantity: '60.00',
                unit: 'kg',
                application_date: '2026-05-20',
                cost: '4000.00',
                created_at: new Date(),
              },
            ],
            rowCount: 1,
          } as never;
        }
        if (queryText.includes('INSERT INTO audit_logs')) {
          expect(p[1]).toBe('update');
          auditLogged = true;
          return { rows: [], rowCount: 1 } as never;
        }
        return { rows: [], rowCount: 0 } as never;
      });

      const updated = await inputApplicationService.updateInputApplication(farmerA, 'input-301', {
        quantity: 60,
        cost: 4000,
      });

      expect(updated.quantity).toBe(60);
      expect(updated.cost).toBe(4000);
      expect(auditLogged).toBe(true);
    });
  });

  describe('5. Harvests CRUD', () => {
    it('creates harvest with quantity > 0 and writes audit log', async () => {
      jest.spyOn(cropCycleService, 'getPlotIdForCycle').mockResolvedValueOnce('plot-111');
      jest.spyOn(authzService, 'assertPlotAccess').mockResolvedValueOnce({
        plotId: 'plot-111',
        isOwner: true,
        userRole: 'farmer',
        grantedScope: 'full',
      });

      let auditLogged = false;
      jest.spyOn(pool, 'query').mockImplementation(async (sql: unknown, params?: unknown) => {
        const queryText = String(sql);
        const p = (params || []) as unknown[];
        if (queryText.includes('INSERT INTO harvests')) {
          return {
            rows: [
              {
                id: 'harvest-401',
                cycle_id: 'cycle-101',
                harvest_date: '2026-08-25',
                quantity: '4200.00',
                unit: 'kg',
                quality_grade: 'Grade A',
                revenue: '520000.00',
                notes: 'Excellent harvest',
                created_at: new Date(),
              },
            ],
            rowCount: 1,
          } as never;
        }
        if (queryText.includes('INSERT INTO audit_logs')) {
          expect(p[1]).toBe('create');
          expect(p[2]).toBe('harvests');
          auditLogged = true;
          return { rows: [], rowCount: 1 } as never;
        }
        return { rows: [], rowCount: 0 } as never;
      });

      const res = await harvestService.createHarvest(farmerA, {
        cycleId: 'cycle-101',
        harvestDate: '2026-08-25',
        quantity: 4200,
        unit: 'kg',
        qualityGrade: 'Grade A',
        revenue: 520000,
        notes: 'Excellent harvest',
      });

      expect(res.id).toBe('harvest-401');
      expect(res.quantity).toBe(4200);
      expect(res.revenue).toBe(520000);
      expect(auditLogged).toBe(true);
    });
  });

  describe('6. Fields CRUD and Access Boundaries', () => {
    it('creates field for farmer and writes audit log', async () => {
      let auditLogged = false;
      jest.spyOn(pool, 'query').mockImplementation(async (sql: unknown, params?: unknown) => {
        const queryText = String(sql);
        const p = (params || []) as unknown[];
        if (queryText.includes('INSERT INTO fields')) {
          return {
            rows: [
              {
                id: 'field-01',
                farmer_id: farmerA.id,
                name: 'East Fields',
                district: 'Polonnaruwa',
                description: 'Paddy land',
                created_at: new Date(),
                updated_at: new Date(),
              },
            ],
            rowCount: 1,
          } as never;
        }
        if (queryText.includes('INSERT INTO audit_logs')) {
          expect(p[1]).toBe('create');
          expect(p[2]).toBe('fields');
          auditLogged = true;
          return { rows: [], rowCount: 1 } as never;
        }
        return { rows: [], rowCount: 0 } as never;
      });

      const field = await fieldService.createField(farmerA, {
        name: 'East Fields',
        district: 'Polonnaruwa',
        description: 'Paddy land',
      });

      expect(field.id).toBe('field-01');
      expect(auditLogged).toBe(true);
    });

    it('returns 404 when Admin tries to access fields', async () => {
      await expect(fieldService.getFields(adminUser, {})).rejects.toThrow(NotFound);
      await expect(fieldService.getFieldById(adminUser, 'field-01')).rejects.toThrow(NotFound);
    });

    it('prevents Farmer B from accessing Farmer A field (IDOR protection)', async () => {
      jest.spyOn(pool, 'query').mockImplementation(async () => {
        return {
          rows: [
            {
              id: 'field-01',
              farmer_id: farmerA.id,
              name: 'Farmer A Field',
              district: 'Polonnaruwa',
              description: null,
              created_at: new Date(),
              updated_at: new Date(),
            },
          ],
          rowCount: 1,
        } as never;
      });

      await expect(fieldService.getFieldById(farmerB, 'field-01')).rejects.toThrow(NotFound);
    });
  });
});
