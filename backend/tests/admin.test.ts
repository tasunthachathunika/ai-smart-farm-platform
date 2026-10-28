import request from 'supertest';
import { app } from '../src/app';
import { pool } from '../src/db';
import { authService, UserResponse } from '../src/services/auth.service';
import { authzService } from '../src/services/authz.service';
import { createAccessToken } from '../src/utils/token';
import { Unauthorized } from '../src/utils/errors';

describe('Admin Endpoints & Farm Data Privacy Boundary Suite', () => {
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

  const farmerUser: UserResponse = {
    id: '11111111-1111-4111-8111-111111111111',
    email: 'farmer@goviya.lk',
    fullName: 'Farmer Bandara',
    phone: '+94771111111',
    role: 'farmer',
    isVerified: true,
    isActive: true,
    createdAt: new Date().toISOString(),
  };

  const officerPending: UserResponse = {
    id: '22222222-2222-4222-8222-222222222222',
    email: 'officer.pending@goviya.lk',
    fullName: 'Pending Officer Perera',
    phone: '+94772222222',
    role: 'officer',
    isVerified: false,
    isActive: true,
    createdAt: new Date().toISOString(),
  };

  const officerVerified: UserResponse = {
    id: '33333333-3333-4333-8333-333333333333',
    email: 'officer.verified@goviya.lk',
    fullName: 'Verified Officer Silva',
    phone: '+94773333333',
    role: 'officer',
    isVerified: true,
    isActive: true,
    createdAt: new Date().toISOString(),
  };

  const adminToken = createAccessToken({
    userId: adminUser.id,
    role: adminUser.role,
    email: adminUser.email,
  });

  const farmerToken = createAccessToken({
    userId: farmerUser.id,
    role: farmerUser.role,
    email: farmerUser.email,
  });

  const officerToken = createAccessToken({
    userId: officerVerified.id,
    role: officerVerified.role,
    email: officerVerified.email,
  });

  beforeEach(() => {
    jest.spyOn(authService, 'getMe').mockImplementation(async (userId: string) => {
      if (userId === adminUser.id) return adminUser;
      if (userId === farmerUser.id) return farmerUser;
      if (userId === officerPending.id) return officerPending;
      if (userId === officerVerified.id) return officerVerified;
      throw new Unauthorized('User not found');
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('1. GET /api/admin/users (Metadata Only, Strictly No Farm Data)', () => {
    it('should return paginated list of users with account metadata only', async () => {
      const mockUsers = [
        {
          id: adminUser.id,
          email: adminUser.email,
          full_name: adminUser.fullName,
          phone: adminUser.phone,
          role: 'admin',
          is_verified: true,
          is_active: true,
          created_at: new Date('2026-01-01T00:00:00Z'),
          updated_at: new Date('2026-01-01T00:00:00Z'),
        },
        {
          id: farmerUser.id,
          email: farmerUser.email,
          full_name: farmerUser.fullName,
          phone: farmerUser.phone,
          role: 'farmer',
          is_verified: true,
          is_active: true,
          created_at: new Date('2026-01-02T00:00:00Z'),
          updated_at: new Date('2026-01-02T00:00:00Z'),
        },
      ];

      jest.spyOn(pool, 'query').mockImplementation(async (text: unknown) => {
        const sql = String(text);
        if (sql.includes('SELECT COUNT(*) FROM users')) {
          return { rows: [{ count: '2' }], rowCount: 1 } as never;
        }
        if (sql.includes('SELECT id, email, full_name, phone, role, is_verified, is_active')) {
          return { rows: mockUsers, rowCount: 2 } as never;
        }
        return { rows: [], rowCount: 0 } as never;
      });

      const res = await request(app)
        .get('/api/admin/users?page=1&limit=10')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.pagination).toBeDefined();
      expect(res.body.pagination.total).toBe(2);
      expect(res.body.pagination.page).toBe(1);
      expect(res.body.pagination.limit).toBe(10);
      expect(res.body.data).toHaveLength(2);

      // Verify returned fields are account metadata only
      const user = res.body.data[0];
      expect(user.id).toBe(adminUser.id);
      expect(user.email).toBe(adminUser.email);
      expect(user.fullName).toBe(adminUser.fullName);
      expect(user.role).toBe('admin');
      expect(user.isVerified).toBe(true);
      expect(user.isActive).toBe(true);

      // Rule 2 Check: Confirm NO farm data is present in user objects
      for (const item of res.body.data) {
        expect(item.plots).toBeUndefined();
        expect(item.fields).toBeUndefined();
        expect(item.crops).toBeUndefined();
        expect(item.harvests).toBeUndefined();
        expect(item.farm_logs).toBeUndefined();
        expect(item.notes).toBeUndefined();
        expect(item.gps).toBeUndefined();
        expect(item.encrypted_gps).toBeUndefined();
      }
    });

    it('should support search query and role filter', async () => {
      const querySpy = jest.spyOn(pool, 'query').mockImplementation(async (text: unknown) => {
        const sql = String(text);
        if (sql.includes('SELECT COUNT(*) FROM users')) {
          return { rows: [{ count: '1' }], rowCount: 1 } as never;
        }
        if (sql.includes('SELECT id, email, full_name')) {
          return {
            rows: [
              {
                id: farmerUser.id,
                email: farmerUser.email,
                full_name: farmerUser.fullName,
                phone: farmerUser.phone,
                role: 'farmer',
                is_verified: true,
                is_active: true,
                created_at: new Date(),
                updated_at: new Date(),
              },
            ],
            rowCount: 1,
          } as never;
        }
        return { rows: [], rowCount: 0 } as never;
      });

      const res = await request(app)
        .get('/api/admin/users?role=farmer&status=active&q=Bandara')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].role).toBe('farmer');

      const countCall = querySpy.mock.calls.find((call) =>
        String(call[0]).includes('SELECT COUNT(*) FROM users'),
      );
      expect(countCall).toBeDefined();
      expect(String(countCall?.[0])).toContain('role = $1');
      expect(String(countCall?.[0])).toContain('is_active = true');
      expect(String(countCall?.[0])).toContain('ILIKE');
    });
  });

  describe('2. User Activation & Deactivation (PATCH /api/admin/users/:id/status)', () => {
    it('should deactivate user, revoke all active refresh tokens, and log audit event', async () => {
      const targetUserId = farmerUser.id;

      const querySpy = jest.spyOn(pool, 'query').mockImplementation(async (text: unknown) => {
        const sql = String(text);
        if (sql.includes('SELECT id, email, full_name, role, is_active FROM users WHERE id = $1')) {
          return {
            rows: [
              {
                id: targetUserId,
                email: 'farmer@goviya.lk',
                full_name: 'Farmer Bandara',
                role: 'farmer',
                is_active: true,
              },
            ],
            rowCount: 1,
          } as never;
        }
        if (sql.includes('UPDATE users') && sql.includes('is_active = $1')) {
          return {
            rows: [
              {
                id: targetUserId,
                email: 'farmer@goviya.lk',
                full_name: 'Farmer Bandara',
                phone: '+94771111111',
                role: 'farmer',
                is_verified: true,
                is_active: false,
                created_at: new Date(),
                updated_at: new Date(),
              },
            ],
            rowCount: 1,
          } as never;
        }
        if (sql.includes('UPDATE refresh_tokens SET revoked_at = NOW()')) {
          return { rows: [], rowCount: 2 } as never;
        }
        if (sql.includes('INSERT INTO audit_logs')) {
          return { rows: [], rowCount: 1 } as never;
        }
        return { rows: [], rowCount: 0 } as never;
      });

      const res = await request(app)
        .patch(`/api/admin/users/${targetUserId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isActive: false });

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('deactivated');
      expect(res.body.user.isActive).toBe(false);

      // Verify token revocation was called
      const revokeCall = querySpy.mock.calls.find((call) =>
        String(call[0]).includes('UPDATE refresh_tokens SET revoked_at = NOW()'),
      );
      expect(revokeCall).toBeDefined();

      // Verify audit log entry
      const auditCall = querySpy.mock.calls.find((call) =>
        String(call[0]).includes('INSERT INTO audit_logs'),
      );
      expect(auditCall).toBeDefined();
    });

    it('should activate user via convenience endpoint PATCH /api/admin/users/:id/activate', async () => {
      const targetUserId = farmerUser.id;

      jest.spyOn(pool, 'query').mockImplementation(async (text: unknown) => {
        const sql = String(text);
        if (sql.includes('SELECT id, email, full_name, role, is_active FROM users WHERE id = $1')) {
          return {
            rows: [
              {
                id: targetUserId,
                email: 'farmer@goviya.lk',
                full_name: 'Farmer Bandara',
                role: 'farmer',
                is_active: false,
              },
            ],
            rowCount: 1,
          } as never;
        }
        if (sql.includes('UPDATE users') && sql.includes('is_active = $1')) {
          return {
            rows: [
              {
                id: targetUserId,
                email: 'farmer@goviya.lk',
                full_name: 'Farmer Bandara',
                phone: '+94771111111',
                role: 'farmer',
                is_verified: true,
                is_active: true,
                created_at: new Date(),
                updated_at: new Date(),
              },
            ],
            rowCount: 1,
          } as never;
        }
        if (sql.includes('INSERT INTO audit_logs')) {
          return { rows: [], rowCount: 1 } as never;
        }
        return { rows: [], rowCount: 0 } as never;
      });

      const res = await request(app)
        .patch(`/api/admin/users/${targetUserId}/activate`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('activated');
      expect(res.body.user.isActive).toBe(true);
    });

    it('should prevent admin from deactivating their own account (Self-Deactivation Defense)', async () => {
      jest.spyOn(pool, 'query').mockImplementation(async (text: unknown) => {
        const sql = String(text);
        if (sql.includes('SELECT id, email, full_name, role, is_active FROM users WHERE id = $1')) {
          return {
            rows: [
              {
                id: adminUser.id,
                email: adminUser.email,
                full_name: adminUser.fullName,
                role: 'admin',
                is_active: true,
              },
            ],
            rowCount: 1,
          } as never;
        }
        return { rows: [], rowCount: 0 } as never;
      });

      const res = await request(app)
        .patch(`/api/admin/users/${adminUser.id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isActive: false });

      expect(res.status).toBe(403);
      expect(res.body.error.message).toContain('cannot deactivate their own account');
    });

    it('should return 404 if target user does not exist', async () => {
      const nonExistentId = '00000000-0000-4000-8000-000000000000';

      jest.spyOn(pool, 'query').mockImplementation(async () => {
        return { rows: [], rowCount: 0 } as never;
      });

      const res = await request(app)
        .patch(`/api/admin/users/${nonExistentId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isActive: true });

      expect(res.status).toBe(404);
      expect(res.body.error.message).toBe('User not found');
    });

    it('should block deactivated user from accessing authenticated routes', async () => {
      jest.spyOn(authService, 'getMe').mockRejectedValueOnce(
        new Unauthorized('Account is deactivated. Please contact an administrator.', 'ACCOUNT_DEACTIVATED'),
      );

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${farmerToken}`);

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('ACCOUNT_DEACTIVATED');
    });
  });

  describe('3. GET /api/admin/officers/pending', () => {
    it('should list pending extension officers awaiting verification', async () => {
      const mockPendingOfficer = {
        id: officerPending.id,
        email: officerPending.email,
        full_name: officerPending.fullName,
        phone: officerPending.phone,
        role: 'officer',
        is_verified: false,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      };

      const querySpy = jest.spyOn(pool, 'query').mockImplementation(async (text: unknown) => {
        const sql = String(text);
        if (sql.includes('SELECT COUNT(*) FROM users')) {
          return { rows: [{ count: '1' }], rowCount: 1 } as never;
        }
        if (sql.includes('SELECT id, email, full_name, phone, role, is_verified, is_active')) {
          return { rows: [mockPendingOfficer], rowCount: 1 } as never;
        }
        return { rows: [], rowCount: 0 } as never;
      });

      const res = await request(app)
        .get('/api/admin/officers/pending?page=1&limit=10')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].role).toBe('officer');
      expect(res.body.data[0].isVerified).toBe(false);

      const countCall = querySpy.mock.calls.find((call) =>
        String(call[0]).includes('SELECT COUNT(*) FROM users'),
      );
      expect(String(countCall?.[0])).toContain("role = 'officer'");
      expect(String(countCall?.[0])).toContain('is_verified = false');
    });
  });

  describe('4. PATCH /api/admin/officers/:id/verify (Approve, Reject, Suspend)', () => {
    it('should approve officer: set is_verified = true, is_active = true, and write audit log', async () => {
      const officerId = officerPending.id;

      const querySpy = jest.spyOn(pool, 'query').mockImplementation(async (text: unknown) => {
        const sql = String(text);
        if (sql.includes('SELECT id, email, full_name, role, is_verified, is_active FROM users WHERE id = $1')) {
          return {
            rows: [
              {
                id: officerId,
                email: officerPending.email,
                full_name: officerPending.fullName,
                role: 'officer',
                is_verified: false,
                is_active: true,
              },
            ],
            rowCount: 1,
          } as never;
        }
        if (sql.includes('UPDATE users') && sql.includes('SET is_verified = true')) {
          return {
            rows: [
              {
                id: officerId,
                email: officerPending.email,
                full_name: officerPending.fullName,
                phone: officerPending.phone,
                role: 'officer',
                is_verified: true,
                is_active: true,
                created_at: new Date(),
                updated_at: new Date(),
              },
            ],
            rowCount: 1,
          } as never;
        }
        if (sql.includes('INSERT INTO audit_logs')) {
          return { rows: [], rowCount: 1 } as never;
        }
        return { rows: [], rowCount: 0 } as never;
      });

      const res = await request(app)
        .patch(`/api/admin/officers/${officerId}/verify`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ action: 'approve', reason: 'Credentials verified with Department of Agriculture' });

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('approve');
      expect(res.body.officer.isVerified).toBe(true);
      expect(res.body.officer.isActive).toBe(true);

      const auditCall = querySpy.mock.calls.find((call) =>
        String(call[0]).includes('INSERT INTO audit_logs'),
      );
      expect(auditCall).toBeDefined();
    });

    it('should reject officer: set is_verified = false and write audit log', async () => {
      const officerId = officerPending.id;

      jest.spyOn(pool, 'query').mockImplementation(async (text: unknown) => {
        const sql = String(text);
        if (sql.includes('SELECT id, email, full_name, role, is_verified, is_active FROM users WHERE id = $1')) {
          return {
            rows: [
              {
                id: officerId,
                email: officerPending.email,
                full_name: officerPending.fullName,
                role: 'officer',
                is_verified: false,
                is_active: true,
              },
            ],
            rowCount: 1,
          } as never;
        }
        if (sql.includes('UPDATE users') && sql.includes('SET is_verified = false')) {
          return {
            rows: [
              {
                id: officerId,
                email: officerPending.email,
                full_name: officerPending.fullName,
                phone: officerPending.phone,
                role: 'officer',
                is_verified: false,
                is_active: true,
                created_at: new Date(),
                updated_at: new Date(),
              },
            ],
            rowCount: 1,
          } as never;
        }
        if (sql.includes('INSERT INTO audit_logs')) {
          return { rows: [], rowCount: 1 } as never;
        }
        return { rows: [], rowCount: 0 } as never;
      });

      const res = await request(app)
        .patch(`/api/admin/officers/${officerId}/verify`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ action: 'reject', reason: 'Insufficient accreditation' });

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('reject');
      expect(res.body.officer.isVerified).toBe(false);
    });

    it('should suspend officer: set is_verified = false, is_active = false, and revoke refresh tokens', async () => {
      const officerId = officerVerified.id;

      const querySpy = jest.spyOn(pool, 'query').mockImplementation(async (text: unknown) => {
        const sql = String(text);
        if (sql.includes('SELECT id, email, full_name, role, is_verified, is_active FROM users WHERE id = $1')) {
          return {
            rows: [
              {
                id: officerId,
                email: officerVerified.email,
                full_name: officerVerified.fullName,
                role: 'officer',
                is_verified: true,
                is_active: true,
              },
            ],
            rowCount: 1,
          } as never;
        }
        if (sql.includes('UPDATE users') && sql.includes('is_active = false')) {
          return {
            rows: [
              {
                id: officerId,
                email: officerVerified.email,
                full_name: officerVerified.fullName,
                phone: officerVerified.phone,
                role: 'officer',
                is_verified: false,
                is_active: false,
                created_at: new Date(),
                updated_at: new Date(),
              },
            ],
            rowCount: 1,
          } as never;
        }
        if (sql.includes('UPDATE refresh_tokens SET revoked_at = NOW()')) {
          return { rows: [], rowCount: 1 } as never;
        }
        if (sql.includes('INSERT INTO audit_logs')) {
          return { rows: [], rowCount: 1 } as never;
        }
        return { rows: [], rowCount: 0 } as never;
      });

      const res = await request(app)
        .patch(`/api/admin/officers/${officerId}/verify`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ action: 'suspend', reason: 'Investigation into policy violation' });

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('suspend');
      expect(res.body.officer.isVerified).toBe(false);
      expect(res.body.officer.isActive).toBe(false);

      const revokeCall = querySpy.mock.calls.find((call) =>
        String(call[0]).includes('UPDATE refresh_tokens SET revoked_at = NOW()'),
      );
      expect(revokeCall).toBeDefined();
    });

    it('should reject invalid action via Zod validator', async () => {
      const res = await request(app)
        .patch(`/api/admin/officers/${officerPending.id}/verify`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ action: 'promote' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 404 if target user is not an officer or does not exist', async () => {
      jest.spyOn(pool, 'query').mockImplementation(async () => {
        return { rows: [], rowCount: 0 } as never;
      });

      const res = await request(app)
        .patch(`/api/admin/officers/${farmerUser.id}/verify`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ action: 'approve' });

      expect(res.status).toBe(404);
      expect(res.body.error.message).toBe('Officer not found');
    });
  });

  describe('5. GET /api/admin/audit (Metadata Only)', () => {
    it('should return paginated audit logs with sanitized metadata only', async () => {
      const mockAuditEntries = [
        {
          id: 'audit-uuid-1',
          user_id: adminUser.id,
          user_email: adminUser.email,
          user_name: adminUser.fullName,
          action: 'update',
          entity_type: 'users',
          entity_id: farmerUser.id,
          metadata: {
            field: 'is_active',
            newValue: false,
            // Sensitive fields that must be redacted by sanitizeAuditMetadata:
            password: 'secret-password-attempt',
            gps: { lat: 8.1, lng: 80.2 },
            notes: 'Private farmer field observation notes',
          },
          ip_address: '127.0.0.1',
          user_agent: 'JestTestRunner',
          created_at: new Date('2026-02-01T10:00:00Z'),
        },
      ];

      jest.spyOn(pool, 'query').mockImplementation(async (text: unknown) => {
        const sql = String(text);
        if (sql.includes('SELECT COUNT(*) FROM audit_logs')) {
          return { rows: [{ count: '1' }], rowCount: 1 } as never;
        }
        if (sql.includes('SELECT a.id, a.user_id, a.action')) {
          return { rows: mockAuditEntries, rowCount: 1 } as never;
        }
        return { rows: [], rowCount: 0 } as never;
      });

      const res = await request(app)
        .get('/api/admin/audit?page=1&limit=10')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.pagination.total).toBe(1);
      expect(res.body.data).toHaveLength(1);

      const entry = res.body.data[0];
      expect(entry.id).toBe('audit-uuid-1');
      expect(entry.action).toBe('update');
      expect(entry.entityType).toBe('users');
      expect(entry.metadata.field).toBe('is_active');
      expect(entry.metadata.newValue).toBe(false);

      // Rule 2 & 6: Ensure sensitive metadata is stripped
      expect(entry.metadata.password).toBeUndefined();
      expect(entry.metadata.gps).toBeUndefined();
      expect(entry.metadata.notes).toBeUndefined();
    });
  });

  describe('6. Role Boundaries & Authorization Checks', () => {
    it('should block unauthenticated requests with 401 Unauthorized', async () => {
      const res = await request(app).get('/api/admin/users');
      expect(res.status).toBe(401);
    });

    it('should reject farmer from accessing admin endpoints with 403 Forbidden', async () => {
      const usersRes = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${farmerToken}`);
      expect(usersRes.status).toBe(403);

      const pendingRes = await request(app)
        .get('/api/admin/officers/pending')
        .set('Authorization', `Bearer ${farmerToken}`);
      expect(pendingRes.status).toBe(403);

      const verifyRes = await request(app)
        .patch(`/api/admin/officers/${officerPending.id}/verify`)
        .set('Authorization', `Bearer ${farmerToken}`)
        .send({ action: 'approve' });
      expect(verifyRes.status).toBe(403);

      const auditRes = await request(app)
        .get('/api/admin/audit')
        .set('Authorization', `Bearer ${farmerToken}`);
      expect(auditRes.status).toBe(403);
    });

    it('should reject officer from accessing admin endpoints with 403 Forbidden', async () => {
      const res = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${officerToken}`);
      expect(res.status).toBe(403);

      const auditRes = await request(app)
        .get('/api/admin/audit')
        .set('Authorization', `Bearer ${officerToken}`);
      expect(auditRes.status).toBe(403);
    });
  });

  describe('7. Farm Data Privacy Boundary: Admin Access Denied on All Farm-Record Routes', () => {
    const testPlotId = '77777777-7777-4777-8777-777777777777';

    it('should return 403 Forbidden when admin accesses GET /api/plots', async () => {
      const res = await request(app)
        .get('/api/plots')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(403);
    });

    it('should return 403 Forbidden when admin accesses POST /api/plots', async () => {
      const res = await request(app)
        .post('/api/plots')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Forbidden Basin',
          district: 'Kandy',
          areaHa: 2.5,
          gps: { latitude: 7.29, longitude: 80.63 },
        });
      expect(res.status).toBe(403);
    });

    it('should return 403 Forbidden when admin accesses GET /api/plots/:id', async () => {
      const res = await request(app)
        .get(`/api/plots/${testPlotId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(403);
    });

    it('should return 403 Forbidden when admin accesses GET /api/fields', async () => {
      const res = await request(app)
        .get('/api/fields')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(403);
    });

    it('should return 403 Forbidden when admin accesses GET /api/crop-cycles', async () => {
      const res = await request(app)
        .get('/api/crop-cycles')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(403);
    });

    it('should return 403 Forbidden when admin accesses GET /api/activity-logs', async () => {
      const res = await request(app)
        .get('/api/activity-logs')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(403);
    });

    it('should return 403 Forbidden when admin accesses GET /api/input-applications', async () => {
      const res = await request(app)
        .get('/api/input-applications')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(403);
    });

    it('should return 403 Forbidden when admin accesses GET /api/harvests', async () => {
      const res = await request(app)
        .get('/api/harvests')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(403);
    });

    it('should return 403 Forbidden when admin accesses GET /api/shares', async () => {
      const res = await request(app)
        .get('/api/shares')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(403);
    });

    it('should return 403 Forbidden when admin accesses GET /api/officer/plots', async () => {
      const res = await request(app)
        .get('/api/officer/plots')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(403);
    });

    it('should return 403 Forbidden when admin accesses POST /api/ai/summary', async () => {
      const res = await request(app)
        .post('/api/ai/summary')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ plotId: testPlotId });
      expect(res.status).toBe(403);
    });

    it('should return 403 Forbidden when admin accesses POST /api/ai/visit-prep', async () => {
      const res = await request(app)
        .post('/api/ai/visit-prep')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ plotId: testPlotId });
      expect(res.status).toBe(403);
    });

    it('should return 403 Forbidden when admin accesses farmer audit endpoint GET /api/audit', async () => {
      const res = await request(app)
        .get('/api/audit')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(403);
    });

    it('should return 404 NotFound when assertPlotAccess is called directly for admin (AGENTS.md Rule 1 & 2)', async () => {
      await expect(
        authzService.assertPlotAccess(adminUser, testPlotId, 'view_only'),
      ).rejects.toThrow('Resource not found');
    });
  });
});
