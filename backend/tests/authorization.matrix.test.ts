import request from 'supertest';
import { app } from '../src/app';
import { pool } from '../src/db';
import { logger } from '../src/utils/logger';
import { authService, UserResponse } from '../src/services/auth.service';
import { createAccessToken } from '../src/utils/token';
import { encryptGps } from '../src/utils/crypto';
import { Unauthorized } from '../src/utils/errors';

describe('Comprehensive Authorization Matrix & Access Boundary Suite', () => {
  // Test users
  const farmerA: UserResponse = {
    id: '11111111-1111-4111-8111-111111111111',
    email: 'farmer.a@goviya.lk',
    fullName: 'Farmer Alice',
    phone: '+94771111111',
    role: 'farmer',
    isVerified: true,
    isActive: true,
    createdAt: new Date().toISOString(),
  };

  const farmerB: UserResponse = {
    id: '22222222-2222-4222-8222-222222222222',
    email: 'farmer.b@goviya.lk',
    fullName: 'Farmer Bob',
    phone: '+94772222222',
    role: 'farmer',
    isVerified: true,
    isActive: true,
    createdAt: new Date().toISOString(),
  };

  const verifiedOfficer: UserResponse = {
    id: '33333333-3333-4333-8333-333333333333',
    email: 'officer.kamal@goviya.lk',
    fullName: 'Extension Officer Kamal',
    phone: '+94773333333',
    role: 'officer',
    isVerified: true,
    isActive: true,
    createdAt: new Date().toISOString(),
  };

  const unverifiedOfficer: UserResponse = {
    id: '33333333-3333-4333-8333-444444444444',
    email: 'officer.pending@goviya.lk',
    fullName: 'Pending Officer',
    phone: '+94773333344',
    role: 'officer',
    isVerified: false,
    isActive: true,
    createdAt: new Date().toISOString(),
  };

  const suspendedOfficer: UserResponse = {
    id: '33333333-3333-4333-8333-555555555555',
    email: 'officer.suspended@goviya.lk',
    fullName: 'Suspended Officer',
    phone: '+94773333355',
    role: 'officer',
    isVerified: false,
    isActive: false,
    createdAt: new Date().toISOString(),
  };

  const adminUser: UserResponse = {
    id: '99999999-9999-4999-8999-999999999999',
    email: 'admin@goviya.lk',
    fullName: 'System Administrator',
    phone: '+94779999999',
    role: 'admin',
    isVerified: true,
    isActive: true,
    createdAt: new Date().toISOString(),
  };

  const farmerAToken = createAccessToken({
    userId: farmerA.id,
    role: farmerA.role,
    email: farmerA.email,
  });

  const farmerBToken = createAccessToken({
    userId: farmerB.id,
    role: farmerB.role,
    email: farmerB.email,
  });

  const verifiedOfficerToken = createAccessToken({
    userId: verifiedOfficer.id,
    role: verifiedOfficer.role,
    email: verifiedOfficer.email,
  });

  const unverifiedOfficerToken = createAccessToken({
    userId: unverifiedOfficer.id,
    role: unverifiedOfficer.role,
    email: unverifiedOfficer.email,
  });

  const suspendedOfficerToken = createAccessToken({
    userId: suspendedOfficer.id,
    role: suspendedOfficer.role,
    email: suspendedOfficer.email,
  });

  const adminToken = createAccessToken({
    userId: adminUser.id,
    role: adminUser.role,
    email: adminUser.email,
  });

  // Resources owned by Farmer A
  const plotAId = 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa';
  const cycleAId = 'cccccccc-cccc-4ccc-cccc-cccccccccccc';
  const logAId = 'dddddddd-dddd-4ddd-dddd-dddddddddddd';
  const inputAId = 'eeeeeeee-eeee-4eee-eeee-eeeeeeeeeeee';
  const harvestAId = 'ffffffff-ffff-4fff-ffff-ffffffffffff';
  const photoAId = '10101010-1010-4010-8010-101010101010';

  const encrypted = encryptGps(JSON.stringify({ latitude: 8.3114, longitude: 80.4037 }));

  const rawPlotRow = {
    id: plotAId,
    farmer_id: farmerA.id,
    field_id: null,
    name: "Alice's Organic Paddy Sector 1",
    district: 'Anuradhapura',
    area_ha: '2.50',
    soil_type: 'Clay Loam',
    irrigation_source: 'Canal',
    encrypted_gps: encrypted.ciphertext,
    gps_iv: encrypted.iv,
    gps_auth_tag: encrypted.authTag,
    created_at: new Date('2026-01-15T08:00:00Z'),
    updated_at: new Date('2026-01-15T08:00:00Z'),
  };

  const rawCycleRow = {
    id: cycleAId,
    plot_id: plotAId,
    crop_name: 'Paddy',
    variety: 'BG-352',
    start_date: '2026-01-20',
    end_date: null,
    status: 'active',
    estimated_yield_kg: '4500.00',
    created_at: new Date('2026-01-20T08:00:00Z'),
    updated_at: new Date('2026-01-20T08:00:00Z'),
  };

  const rawLogRow = {
    id: logAId,
    cycle_id: cycleAId,
    log_type: 'irrigation',
    log_date: '2026-02-01',
    notes: 'Main canal water released into paddy',
    created_at: new Date('2026-02-01T08:00:00Z'),
    updated_at: new Date('2026-02-01T08:00:00Z'),
  };

  const rawInputRow = {
    id: inputAId,
    plot_id: plotAId,
    cycle_id: cycleAId,
    category: 'fertilizer',
    product_name: 'Organic Compost Mixture',
    application_date: '2026-02-10',
    quantity: '500.00',
    unit: 'kg',
    notes: 'Applied base compost',
    created_at: new Date('2026-02-10T08:00:00Z'),
    updated_at: new Date('2026-02-10T08:00:00Z'),
  };

  const rawHarvestRow = {
    id: harvestAId,
    plot_id: plotAId,
    cycle_id: cycleAId,
    harvest_date: '2026-04-15',
    quantity: '4200.00',
    unit: 'kg',
    quality_grade: 'Grade A',
    notes: 'Harvest completed under dry weather',
    created_at: new Date('2026-04-15T08:00:00Z'),
    updated_at: new Date('2026-04-15T08:00:00Z'),
  };

  const rawPhotoRow = {
    id: photoAId,
    plot_id: plotAId,
    uploader_id: farmerA.id,
    original_name: 'paddy_shoot.jpg',
    storage_path: 'photos/photoA.webp',
    thumb_path: 'photos/photoA_thumb.webp',
    mime_type: 'image/webp',
    file_size: 154200,
    width: 1280,
    height: 720,
    caption: 'Emergence stage healthy shoots',
    created_at: new Date('2026-02-15T08:00:00Z'),
  };

  afterEach(() => {
    jest.restoreAllMocks();
  });

  beforeEach(() => {
    // Default authService.getMe mock based on userId
    jest.spyOn(authService, 'getMe').mockImplementation(async (userId: string) => {
      if (userId === farmerA.id) return farmerA;
      if (userId === farmerB.id) return farmerB;
      if (userId === verifiedOfficer.id) return verifiedOfficer;
      if (userId === unverifiedOfficer.id) return unverifiedOfficer;
      if (userId === suspendedOfficer.id) {
        throw new Unauthorized('Account is deactivated', 'ACCOUNT_DEACTIVATED');
      }
      if (userId === adminUser.id) return adminUser;
      throw new Error('User not found');
    });
  });

  // =========================================================================
  // SECTION 1: Farmer A cannot read/update/delete Farmer B's records (404)
  // =========================================================================
  describe('1. Farmer IDOR Protection: Farmer B cannot read/update/delete Farmer A records (404)', () => {
    beforeEach(() => {
      jest.spyOn(pool, 'query').mockImplementation(async (sql: unknown) => {
        const queryText = String(sql);

        if (queryText.includes('FROM plots WHERE id = $1')) {
          return { rows: [rawPlotRow], rowCount: 1 } as never;
        }
        if (queryText.includes('FROM crop_cycles WHERE id = $1') || queryText.includes('SELECT c.plot_id FROM crop_cycles')) {
          return { rows: [rawCycleRow], rowCount: 1 } as never;
        }
        if (queryText.includes('FROM activity_logs WHERE id = $1') || queryText.includes('SELECT c.plot_id FROM activity_logs')) {
          return { rows: [{ ...rawLogRow, plot_id: plotAId }], rowCount: 1 } as never;
        }
        if (queryText.includes('FROM input_applications WHERE id = $1') || queryText.includes('SELECT plot_id FROM input_applications')) {
          return { rows: [rawInputRow], rowCount: 1 } as never;
        }
        if (queryText.includes('FROM harvests WHERE id = $1') || queryText.includes('SELECT plot_id FROM harvests')) {
          return { rows: [rawHarvestRow], rowCount: 1 } as never;
        }
        if (queryText.includes('FROM plot_photos WHERE id = $1') || queryText.includes('SELECT plot_id FROM plot_photos')) {
          return { rows: [rawPhotoRow], rowCount: 1 } as never;
        }

        return { rows: [], rowCount: 0 } as never;
      });
    });

    it('returns 404 when Farmer B attempts to GET Farmer A plot', async () => {
      const res = await request(app)
        .get(`/api/plots/${plotAId}`)
        .set('Cookie', [`accessToken=${farmerBToken}`]);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('returns 404 when Farmer B attempts to PATCH Farmer A plot', async () => {
      const res = await request(app)
        .patch(`/api/plots/${plotAId}`)
        .set('Cookie', [`accessToken=${farmerBToken}`])
        .send({ name: 'Hacked Plot Name' });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('returns 404 when Farmer B attempts to DELETE Farmer A plot', async () => {
      const res = await request(app)
        .delete(`/api/plots/${plotAId}`)
        .set('Cookie', [`accessToken=${farmerBToken}`]);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('returns 404 when Farmer B attempts to GET Farmer A crop cycle', async () => {
      const res = await request(app)
        .get(`/api/crop-cycles/${cycleAId}`)
        .set('Cookie', [`accessToken=${farmerBToken}`]);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('returns 404 when Farmer B attempts to PATCH Farmer A crop cycle', async () => {
      const res = await request(app)
        .patch(`/api/crop-cycles/${cycleAId}`)
        .set('Cookie', [`accessToken=${farmerBToken}`])
        .send({ status: 'completed' });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('returns 404 when Farmer B attempts to DELETE Farmer A crop cycle', async () => {
      const res = await request(app)
        .delete(`/api/crop-cycles/${cycleAId}`)
        .set('Cookie', [`accessToken=${farmerBToken}`]);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('returns 404 when Farmer B attempts to GET Farmer A activity log', async () => {
      const res = await request(app)
        .get(`/api/activity-logs/${logAId}`)
        .set('Cookie', [`accessToken=${farmerBToken}`]);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('returns 404 when Farmer B attempts to PATCH Farmer A activity log', async () => {
      const res = await request(app)
        .patch(`/api/activity-logs/${logAId}`)
        .set('Cookie', [`accessToken=${farmerBToken}`])
        .send({ notes: 'Tampered activity log' });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('returns 404 when Farmer B attempts to DELETE Farmer A activity log', async () => {
      const res = await request(app)
        .delete(`/api/activity-logs/${logAId}`)
        .set('Cookie', [`accessToken=${farmerBToken}`]);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('returns 404 when Farmer B attempts to GET Farmer A input application', async () => {
      const res = await request(app)
        .get(`/api/input-applications/${inputAId}`)
        .set('Cookie', [`accessToken=${farmerBToken}`]);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('returns 404 when Farmer B attempts to PATCH Farmer A input application', async () => {
      const res = await request(app)
        .patch(`/api/input-applications/${inputAId}`)
        .set('Cookie', [`accessToken=${farmerBToken}`])
        .send({ quantity: 999 });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('returns 404 when Farmer B attempts to DELETE Farmer A input application', async () => {
      const res = await request(app)
        .delete(`/api/input-applications/${inputAId}`)
        .set('Cookie', [`accessToken=${farmerBToken}`]);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('returns 404 when Farmer B attempts to GET Farmer A harvest record', async () => {
      const res = await request(app)
        .get(`/api/harvests/${harvestAId}`)
        .set('Cookie', [`accessToken=${farmerBToken}`]);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('returns 404 when Farmer B attempts to PATCH Farmer A harvest record', async () => {
      const res = await request(app)
        .patch(`/api/harvests/${harvestAId}`)
        .set('Cookie', [`accessToken=${farmerBToken}`])
        .send({ quantity: 999 });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('returns 404 when Farmer B attempts to DELETE Farmer A harvest record', async () => {
      const res = await request(app)
        .delete(`/api/harvests/${harvestAId}`)
        .set('Cookie', [`accessToken=${farmerBToken}`]);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('returns 404 when Farmer B attempts to GET Farmer A photo metadata', async () => {
      const res = await request(app)
        .get(`/api/plots/${plotAId}/photos/${photoAId}`)
        .set('Cookie', [`accessToken=${farmerBToken}`]);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('returns 404 when Farmer B attempts to access Farmer A photo binary file', async () => {
      const res = await request(app)
        .get(`/api/plots/${plotAId}/photos/${photoAId}/file`)
        .set('Cookie', [`accessToken=${farmerBToken}`]);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });
  });

  // =========================================================================
  // SECTION 2: Officer Access Control (No share, Wrong scope, Expired, Revoked)
  // =========================================================================
  describe('2. Extension Officer Access Control Boundaries', () => {
    it('returns 404 when Officer without a share attempts to access Farmer A plot', async () => {
      jest.spyOn(pool, 'query').mockImplementation(async (sql: unknown) => {
        const queryText = String(sql);
        if (queryText.includes('SELECT is_verified FROM users')) {
          return { rows: [{ is_verified: true }], rowCount: 1 } as never;
        }
        if (queryText.includes('FROM shared_plots sp')) {
          return { rows: [], rowCount: 0 } as never; // No share record!
        }
        if (queryText.includes('FROM plots WHERE id = $1')) {
          return { rows: [rawPlotRow], rowCount: 1 } as never;
        }
        return { rows: [], rowCount: 0 } as never;
      });

      const res = await request(app)
        .get(`/api/plots/${plotAId}`)
        .set('Cookie', [`accessToken=${verifiedOfficerToken}`]);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('returns 404 when Officer has share but wrong scope (e.g. view_only vs advisory)', async () => {
      jest.spyOn(pool, 'query').mockImplementation(async (sql: unknown) => {
        const queryText = String(sql);
        if (queryText.includes('SELECT is_verified FROM users')) {
          return { rows: [{ is_verified: true }], rowCount: 1 } as never;
        }
        if (queryText.includes('FROM shared_plots sp')) {
          // Share is limited only to 'crop_cycles', excluding 'advisory_notes'
          return {
            rows: [
              {
                id: 'share-crop-cycles',
                scope: 'view_only',
                scopes: ['crop_cycles'],
                expires_at: null,
                revoked_at: null,
              },
            ],
            rowCount: 1,
          } as never;
        }
        if (queryText.includes('FROM plots WHERE id = $1')) {
          return { rows: [rawPlotRow], rowCount: 1 } as never;
        }
        return { rows: [], rowCount: 0 } as never;
      });

      const res = await request(app)
        .post(`/api/plots/${plotAId}/advisory-notes`)
        .set('Cookie', [`accessToken=${verifiedOfficerToken}`])
        .send({ notes: 'Advise reducing watering interval.' });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('returns 404 when Officer share has expired', async () => {
      jest.spyOn(pool, 'query').mockImplementation(async (sql: unknown) => {
        const queryText = String(sql);
        if (queryText.includes('SELECT is_verified FROM users')) {
          return { rows: [{ is_verified: true }], rowCount: 1 } as never;
        }
        if (queryText.includes('FROM shared_plots sp')) {
          // SQL query has WHERE (sp.expires_at IS NULL OR sp.expires_at > NOW())
          // An expired share returns 0 rows
          return { rows: [], rowCount: 0 } as never;
        }
        if (queryText.includes('FROM plots WHERE id = $1')) {
          return { rows: [rawPlotRow], rowCount: 1 } as never;
        }
        return { rows: [], rowCount: 0 } as never;
      });

      const res = await request(app)
        .get(`/api/plots/${plotAId}`)
        .set('Cookie', [`accessToken=${verifiedOfficerToken}`]);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('returns 404 on the VERY NEXT request after share is revoked', async () => {
      let isRevoked = false;

      jest.spyOn(pool, 'query').mockImplementation(async (sql: unknown) => {
        const queryText = String(sql);
        if (queryText.includes('SELECT is_verified FROM users')) {
          return { rows: [{ is_verified: true }], rowCount: 1 } as never;
        }
        if (queryText.includes('FROM shared_plots sp')) {
          if (isRevoked) {
            return { rows: [], rowCount: 0 } as never;
          }
          return {
            rows: [{ id: 'share-active', scope: 'advisory', expires_at: null, revoked_at: null }],
            rowCount: 1,
          } as never;
        }
        if (queryText.includes('FROM plots WHERE id = $1')) {
          return { rows: [rawPlotRow], rowCount: 1 } as never;
        }
        if (queryText.includes('INSERT INTO audit_logs')) {
          return { rows: [], rowCount: 1 } as never;
        }
        return { rows: [], rowCount: 0 } as never;
      });

      // Request 1: Active share -> succeeds with 200
      const activeRes = await request(app)
        .get(`/api/plots/${plotAId}`)
        .set('Cookie', [`accessToken=${verifiedOfficerToken}`]);

      expect(activeRes.status).toBe(200);

      // Revocation happens!
      isRevoked = true;

      // Request 2: VERY NEXT request immediately returns 404
      const nextRes = await request(app)
        .get(`/api/plots/${plotAId}`)
        .set('Cookie', [`accessToken=${verifiedOfficerToken}`]);

      expect(nextRes.status).toBe(404);
      expect(nextRes.body.error.code).toBe('NOT_FOUND');
    });
  });

  // =========================================================================
  // SECTION 3: Unverified & Suspended Officers Cannot Receive or Use Share
  // =========================================================================
  describe('3. Unverified & Suspended Officers Boundary', () => {
    it('rejects sharing with an unverified officer with 403 OFFICER_NOT_VERIFIED', async () => {
      jest.spyOn(pool, 'query').mockImplementation(async (sql: unknown) => {
        const queryText = String(sql);
        if (queryText.includes('SELECT id, role, is_verified, full_name, email FROM users')) {
          return {
            rows: [
              {
                id: unverifiedOfficer.id,
                role: 'officer',
                is_verified: false,
                full_name: 'Unverified Officer',
                email: 'unverified@goviya.lk',
              },
            ],
            rowCount: 1,
          } as never;
        }
        return { rows: [], rowCount: 0 } as never;
      });

      const res = await request(app)
        .post('/api/shares')
        .set('Cookie', [`accessToken=${farmerAToken}`])
        .send({
          officerId: unverifiedOfficer.id,
          plotIds: [plotAId],
          scope: 'view_only',
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('OFFICER_NOT_VERIFIED');
    });

    it('returns 404 when unverified officer attempts to use an existing share', async () => {
      jest.spyOn(pool, 'query').mockImplementation(async (sql: unknown) => {
        const queryText = String(sql);
        if (queryText.includes('SELECT is_verified FROM users WHERE id = $1 AND role = $2;')) {
          return { rows: [{ is_verified: false }], rowCount: 1 } as never;
        }
        return { rows: [], rowCount: 0 } as never;
      });

      const res = await request(app)
        .get(`/api/plots/${plotAId}`)
        .set('Cookie', [`accessToken=${unverifiedOfficerToken}`]);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('blocks suspended officer from accessing shared plot with 401 Unauthorized', async () => {
      const res = await request(app)
        .get(`/api/plots/${plotAId}`)
        .set('Cookie', [`accessToken=${suspendedOfficerToken}`]);

      expect(res.status).toBe(401);
    });
  });

  // =========================================================================
  // SECTION 4: Officer Cannot Write to Farm Records (Only Advisory Notes)
  // =========================================================================
  describe('4. Officer Write Boundary: Only Advisory Notes Allowed', () => {
    it('returns 403 Forbidden when Officer attempts to POST /api/plots', async () => {
      const res = await request(app)
        .post('/api/plots')
        .set('Cookie', [`accessToken=${verifiedOfficerToken}`])
        .send({
          name: 'Unauthorized Officer Plot',
          district: 'Anuradhapura',
          areaHa: 1.5,
          gps: { latitude: 8.31, longitude: 80.4 },
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('returns 403 Forbidden when Officer attempts to POST /api/fields', async () => {
      const res = await request(app)
        .post('/api/fields')
        .set('Cookie', [`accessToken=${verifiedOfficerToken}`])
        .send({
          name: 'Unauthorized Field',
          district: 'Anuradhapura',
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('returns 403 Forbidden when Officer attempts to PATCH /api/plots/:id', async () => {
      const res = await request(app)
        .patch(`/api/plots/${plotAId}`)
        .set('Cookie', [`accessToken=${verifiedOfficerToken}`])
        .send({ name: 'Tampered Name' });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('returns 403 Forbidden when Officer attempts to DELETE /api/plots/:id', async () => {
      const res = await request(app)
        .delete(`/api/plots/${plotAId}`)
        .set('Cookie', [`accessToken=${verifiedOfficerToken}`]);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('allows Officer to write advisory notes when active share exists', async () => {
      let advisoryNoteInserted = false;

      jest.spyOn(pool, 'query').mockImplementation(async (sql: unknown) => {
        const queryText = String(sql);
        if (queryText.includes('SELECT is_verified FROM users')) {
          return { rows: [{ is_verified: true }], rowCount: 1 } as never;
        }
        if (queryText.includes('FROM shared_plots sp')) {
          return {
            rows: [{ id: 'share-advisory', scope: 'advisory', expires_at: null, revoked_at: null }],
            rowCount: 1,
          } as never;
        }
        if (queryText.includes('FROM plots WHERE id = $1')) {
          return { rows: [rawPlotRow], rowCount: 1 } as never;
        }
        if (queryText.includes('INSERT INTO advisory_notes')) {
          advisoryNoteInserted = true;
          return {
            rows: [
              {
                id: 'note-1',
                plot_id: plotAId,
                officer_id: verifiedOfficer.id,
                title: 'Field Advisory Note',
                notes: 'Ensure proper soil drainage before monsoon.',
                recommendations: null,
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

      const res = await request(app)
        .post(`/api/plots/${plotAId}/advisory-notes`)
        .set('Cookie', [`accessToken=${verifiedOfficerToken}`])
        .send({ notes: 'Ensure proper soil drainage before monsoon.' });

      expect(res.status).toBe(201);
      expect(advisoryNoteInserted).toBe(true);
      expect(res.body.advisoryNote.notes).toContain('Ensure proper soil drainage');
    });
  });

  // =========================================================================
  // SECTION 5: Officer Never Receives Exact GPS
  // =========================================================================
  describe('5. GPS Privacy Boundary: Officer Never Receives Exact GPS', () => {
    it('returns blurred district and strictly NULL/undefined GPS to verified extension officer', async () => {
      jest.spyOn(pool, 'query').mockImplementation(async (sql: unknown) => {
        const queryText = String(sql);
        if (queryText.includes('SELECT is_verified FROM users')) {
          return { rows: [{ is_verified: true }], rowCount: 1 } as never;
        }
        if (queryText.includes('FROM shared_plots sp')) {
          return {
            rows: [{ id: 'share-view', scope: 'view_only', expires_at: null, revoked_at: null }],
            rowCount: 1,
          } as never;
        }
        if (queryText.includes('FROM plots WHERE id = $1')) {
          return { rows: [rawPlotRow], rowCount: 1 } as never;
        }
        if (queryText.includes('INSERT INTO audit_logs')) {
          return { rows: [], rowCount: 1 } as never;
        }
        return { rows: [], rowCount: 0 } as never;
      });

      const res = await request(app)
        .get(`/api/plots/${plotAId}`)
        .set('Cookie', [`accessToken=${verifiedOfficerToken}`]);

      expect(res.status).toBe(200);
      expect(res.body.plot.district).toBe('Anuradhapura');
      // Exact GPS coordinates must NEVER be revealed to officer
      expect(res.body.plot.gps).toBeNull();
      expect(res.body.plot.encryptedGps).toBeUndefined();
    });

    it('returns exact GPS coordinates to the plot owner (Farmer A)', async () => {
      jest.spyOn(pool, 'query').mockImplementation(async (sql: unknown) => {
        const queryText = String(sql);
        if (queryText.includes('FROM plots WHERE id = $1')) {
          return { rows: [rawPlotRow], rowCount: 1 } as never;
        }
        return { rows: [], rowCount: 0 } as never;
      });

      const res = await request(app)
        .get(`/api/plots/${plotAId}`)
        .set('Cookie', [`accessToken=${farmerAToken}`]);

      expect(res.status).toBe(200);
      expect(res.body.plot.gps).toBeDefined();
      expect(res.body.plot.gps.latitude).toBeCloseTo(8.3114, 3);
      expect(res.body.plot.gps.longitude).toBeCloseTo(80.4037, 3);
    });
  });

  // =========================================================================
  // SECTION 6: Audit & Consent Verification
  // =========================================================================
  describe('6. Audit Logging & Consent Security', () => {
    it('creates plot_viewed_by_officer audit entry when officer reads plot records', async () => {
      let auditAction = '';
      let auditUserId = '';

      jest.spyOn(pool, 'query').mockImplementation(async (sql: unknown, params?: unknown) => {
        const queryText = String(sql);
        const p = (params || []) as unknown[];

        if (queryText.includes('SELECT is_verified FROM users')) {
          return { rows: [{ is_verified: true }], rowCount: 1 } as never;
        }
        if (queryText.includes('FROM shared_plots sp')) {
          return {
            rows: [{ id: 'share-view', scope: 'view_only', expires_at: null, revoked_at: null }],
            rowCount: 1,
          } as never;
        }
        if (queryText.includes('FROM plots WHERE id = $1')) {
          return { rows: [rawPlotRow], rowCount: 1 } as never;
        }
        if (queryText.includes('INSERT INTO audit_logs')) {
          auditUserId = String(p[0]);
          auditAction = String(p[1]);
          return { rows: [], rowCount: 1 } as never;
        }
        return { rows: [], rowCount: 0 } as never;
      });

      const res = await request(app)
        .get(`/api/plots/${plotAId}`)
        .set('Cookie', [`accessToken=${verifiedOfficerToken}`]);

      expect(res.status).toBe(200);
      expect(auditAction).toBe('plot_viewed_by_officer');
      expect(auditUserId).toBe(verifiedOfficer.id);
    });

    it('farmer sees only their own audit events in GET /api/audit', async () => {
      jest.spyOn(pool, 'query').mockImplementation(async (sql: unknown, params?: unknown) => {
        const queryText = String(sql);
        const p = (params || []) as unknown[];

        if (queryText.includes('COUNT(*) FROM audit_logs')) {
          return { rows: [{ count: '1' }], rowCount: 1 } as never;
        }
        if (queryText.includes('FROM audit_logs')) {
          // Verify that farmerId parameter was used in WHERE clause
          expect(p).toContain(farmerA.id);
          return {
            rows: [
              {
                id: 'audit-1',
                user_id: farmerA.id,
                action: 'plot_created',
                entity_type: 'plots',
                entity_id: plotAId,
                metadata: { name: 'Paddy Sector 1' },
                ip_address: '127.0.0.1',
                user_agent: 'test-agent',
                created_at: new Date(),
                actor_name: farmerA.fullName,
                actor_role: farmerA.role,
              },
            ],
            rowCount: 1,
          } as never;
        }
        return { rows: [], rowCount: 0 } as never;
      });

      const res = await request(app)
        .get('/api/audit')
        .set('Cookie', [`accessToken=${farmerAToken}`]);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].userId).toBe(farmerA.id);
    });
  });

  // =========================================================================
  // SECTION 7: Admin Privacy Boundary across Farm Routes
  // =========================================================================
  describe('7. Admin Privacy Boundary: Admin blocked from reading farm records', () => {
    it('returns 403 Forbidden when Admin accesses GET /api/plots', async () => {
      const res = await request(app)
        .get('/api/plots')
        .set('Cookie', [`accessToken=${adminToken}`]);

      expect(res.status).toBe(403);
    });

    it('returns 403 Forbidden when Admin accesses GET /api/plots/:id', async () => {
      const res = await request(app)
        .get(`/api/plots/${plotAId}`)
        .set('Cookie', [`accessToken=${adminToken}`]);

      expect(res.status).toBe(403);
    });

    it('returns 403 Forbidden when Admin accesses GET /api/fields', async () => {
      const res = await request(app)
        .get('/api/fields')
        .set('Cookie', [`accessToken=${adminToken}`]);

      expect(res.status).toBe(403);
    });

    it('returns 403 Forbidden when Admin accesses GET /api/crop-cycles', async () => {
      const res = await request(app)
        .get('/api/crop-cycles')
        .set('Cookie', [`accessToken=${adminToken}`]);

      expect(res.status).toBe(403);
    });

    it('returns 403 Forbidden when Admin accesses GET /api/activity-logs', async () => {
      const res = await request(app)
        .get('/api/activity-logs')
        .set('Cookie', [`accessToken=${adminToken}`]);

      expect(res.status).toBe(403);
    });

    it('returns 403 Forbidden when Admin accesses GET /api/input-applications', async () => {
      const res = await request(app)
        .get('/api/input-applications')
        .set('Cookie', [`accessToken=${adminToken}`]);

      expect(res.status).toBe(403);
    });

    it('returns 403 Forbidden when Admin accesses GET /api/harvests', async () => {
      const res = await request(app)
        .get('/api/harvests')
        .set('Cookie', [`accessToken=${adminToken}`]);

      expect(res.status).toBe(403);
    });

    it('returns 403 Forbidden when Admin accesses GET /api/shares', async () => {
      const res = await request(app)
        .get('/api/shares')
        .set('Cookie', [`accessToken=${adminToken}`]);

      expect(res.status).toBe(403);
    });

    it('returns 403 Forbidden when Admin accesses GET /api/officer/plots', async () => {
      const res = await request(app)
        .get('/api/officer/plots')
        .set('Cookie', [`accessToken=${adminToken}`]);

      expect(res.status).toBe(403);
    });
  });
});
