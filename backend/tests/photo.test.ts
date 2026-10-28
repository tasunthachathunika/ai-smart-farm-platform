import fs from 'fs';
import path from 'path';
import request from 'supertest';
import sharp from 'sharp';
import { app } from '../src/app';
import { pool } from '../src/db';
import { photoService } from '../src/services/photo.service';
import { createAccessToken } from '../src/utils/token';
import { authService, UserResponse } from '../src/services/auth.service';
import { Unauthorized } from '../src/utils/errors';

describe('Plot Photos & Image Processing Security Suite', () => {
  // Test users
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
    email: 'officer@goviya.lk',
    fullName: 'Officer Kamal',
    phone: '+94773333333',
    role: 'officer',
    isVerified: true,
    createdAt: new Date().toISOString(),
  };

  const adminUser: UserResponse = {
    id: '44444444-4444-4444-8444-444444444444',
    email: 'admin@goviya.lk',
    fullName: 'Admin User',
    phone: '+94774444444',
    role: 'admin',
    isVerified: true,
    createdAt: new Date().toISOString(),
  };

  const plotA = {
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    farmer_id: farmerA.id,
    name: 'Paddy Field North',
    district: 'Anuradhapura',
  };

  let farmerAToken: string;
  let farmerBToken: string;
  let officerToken: string;
  let adminToken: string;

  let validJpegBuffer: Buffer;
  let validPngBuffer: Buffer;
  let validWebpBuffer: Buffer;

  beforeAll(async () => {
    farmerAToken = createAccessToken({
      userId: farmerA.id,
      role: farmerA.role,
      email: farmerA.email,
    });
    farmerBToken = createAccessToken({
      userId: farmerB.id,
      role: farmerB.role,
      email: farmerB.email,
    });
    officerToken = createAccessToken({
      userId: verifiedOfficer.id,
      role: verifiedOfficer.role,
      email: verifiedOfficer.email,
    });
    adminToken = createAccessToken({
      userId: adminUser.id,
      role: adminUser.role,
      email: adminUser.email,
    });

    // Create real image buffers using sharp
    validJpegBuffer = await sharp({
      create: {
        width: 100,
        height: 100,
        channels: 3,
        background: { r: 255, g: 0, b: 0 },
      },
    })
      .jpeg()
      .toBuffer();

    validPngBuffer = await sharp({
      create: {
        width: 100,
        height: 100,
        channels: 4,
        background: { r: 0, g: 255, b: 0, alpha: 1 },
      },
    })
      .png()
      .toBuffer();

    validWebpBuffer = await sharp({
      create: {
        width: 100,
        height: 100,
        channels: 3,
        background: { r: 0, g: 0, b: 255 },
      },
    })
      .webp()
      .toBuffer();
  });

  beforeEach(() => {
    jest.spyOn(authService, 'getMe').mockImplementation(async (userId: string) => {
      if (userId === farmerA.id) return farmerA;
      if (userId === farmerB.id) return farmerB;
      if (userId === verifiedOfficer.id) return verifiedOfficer;
      if (userId === adminUser.id) return adminUser;
      throw new Unauthorized('User not found');
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('1. Magic Bytes & MIME Validation', () => {
    it('rejects files with non-image MIME types (wrong type)', async () => {
      // Mock farmer ownership of plot
      jest.spyOn(pool, 'query').mockImplementation(async (sql: unknown) => {
        const queryText = String(sql);
        if (queryText.includes('FROM plots WHERE id = $1')) {
          return { rows: [plotA], rowCount: 1 } as never;
        }
        return { rows: [], rowCount: 0 } as never;
      });

      const response = await request(app)
        .post(`/api/plots/${plotA.id}/photos`)
        .set('Cookie', [`accessToken=${farmerAToken}`])
        .attach('photo', Buffer.from('console.log("hello");'), {
          filename: 'script.js',
          contentType: 'application/javascript',
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.message).toContain('Invalid MIME type');
    });

    it('rejects disguised files where MIME is image/jpeg but magic bytes are plain text', async () => {
      jest.spyOn(pool, 'query').mockImplementation(async (sql: unknown) => {
        const queryText = String(sql);
        if (queryText.includes('FROM plots WHERE id = $1')) {
          return { rows: [plotA], rowCount: 1 } as never;
        }
        return { rows: [], rowCount: 0 } as never;
      });

      const fakeImageBuffer = Buffer.from('NOT_AN_IMAGE_FAKE_BYTES_STRING_HERE');

      const response = await request(app)
        .post(`/api/plots/${plotA.id}/photos`)
        .set('Cookie', [`accessToken=${farmerAToken}`])
        .attach('photo', fakeImageBuffer, {
          filename: 'malicious.jpg',
          contentType: 'image/jpeg',
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.message).toContain('Magic bytes do not match');
    });

    it('rejects file when MIME type and magic bytes mismatch (e.g. PNG MIME with JPEG content)', async () => {
      jest.spyOn(pool, 'query').mockImplementation(async (sql: unknown) => {
        const queryText = String(sql);
        if (queryText.includes('FROM plots WHERE id = $1')) {
          return { rows: [plotA], rowCount: 1 } as never;
        }
        return { rows: [], rowCount: 0 } as never;
      });

      const response = await request(app)
        .post(`/api/plots/${plotA.id}/photos`)
        .set('Cookie', [`accessToken=${farmerAToken}`])
        .attach('photo', validJpegBuffer, {
          filename: 'mismatch.png',
          contentType: 'image/png', // Incorrect MIME for JPEG content
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.message).toContain('mismatch');
    });
  });

  describe('2. Oversize Limit Enforcement (5MB Limit)', () => {
    it('rejects files larger than 5MB with 400 FILE_TOO_LARGE', async () => {
      jest.spyOn(pool, 'query').mockImplementation(async (sql: unknown) => {
        const queryText = String(sql);
        if (queryText.includes('FROM plots WHERE id = $1')) {
          return { rows: [plotA], rowCount: 1 } as never;
        }
        return { rows: [], rowCount: 0 } as never;
      });

      // Buffer > 5MB (5MB + 10KB)
      const oversizedBuffer = Buffer.alloc(5 * 1024 * 1024 + 10240, 0);

      const response = await request(app)
        .post(`/api/plots/${plotA.id}/photos`)
        .set('Cookie', [`accessToken=${farmerAToken}`])
        .attach('photo', oversizedBuffer, {
          filename: 'oversize.jpg',
          contentType: 'image/jpeg',
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('FILE_TOO_LARGE');
      expect(response.body.error.message).toContain('5MB');
    });
  });

  describe('3. Successful Photo Upload, EXIF Stripping & Re-encoding', () => {
    it('successfully uploads, re-encodes with sharp to WebP, creates thumbnail, and strips EXIF', async () => {
      let insertedPhotoRow: unknown = null;

      jest.spyOn(pool, 'query').mockImplementation(async (sql: unknown, params?: unknown) => {
        const queryText = String(sql);
        const p = (params || []) as unknown[];

        if (queryText.includes('FROM plots WHERE id = $1')) {
          return { rows: [plotA], rowCount: 1 } as never;
        }

        if (queryText.includes('INSERT INTO plot_photos')) {
          insertedPhotoRow = {
            id: 'photo-1111-2222-3333-444444444444',
            plot_id: p[0],
            uploader_id: p[1],
            filename: p[2],
            thumbnail_filename: p[3],
            original_name: p[4],
            mime_type: p[5],
            file_size: p[6],
            width: p[7],
            height: p[8],
            caption: p[9],
            created_at: new Date(),
          };
          return { rows: [insertedPhotoRow], rowCount: 1 } as never;
        }

        if (queryText.includes('INSERT INTO audit_logs')) {
          return { rows: [], rowCount: 1 } as never;
        }

        return { rows: [], rowCount: 0 } as never;
      });

      const response = await request(app)
        .post(`/api/plots/${plotA.id}/photos`)
        .set('Cookie', [`accessToken=${farmerAToken}`])
        .field('caption', 'Healthy paddy saplings after transplantation')
        .attach('photo', validJpegBuffer, {
          filename: 'saplings.jpg',
          contentType: 'image/jpeg',
        });

      expect(response.status).toBe(201);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.plotId).toBe(plotA.id);
      expect(response.body.data.originalName).toBe('saplings.jpg');
      expect(response.body.data.caption).toBe('Healthy paddy saplings after transplantation');
      expect(response.body.data.mimeType).toBe('image/webp');
      expect(response.body.data.url).toContain(`/api/plots/${plotA.id}/photos/`);
      expect(response.body.data.thumbnailUrl).toContain('size=thumb');

      // Verify files written to disk
      const storageDir = photoService.getStorageDir();
      const mainFilePath = path.join(
        storageDir,
        (insertedPhotoRow as { filename: string }).filename,
      );
      const thumbFilePath = path.join(
        storageDir,
        (insertedPhotoRow as { thumbnail_filename: string }).thumbnail_filename,
      );

      expect(fs.existsSync(mainFilePath)).toBe(true);
      expect(fs.existsSync(thumbFilePath)).toBe(true);

      // Verify sharp re-encoded the file without EXIF metadata
      const mainBuffer = fs.readFileSync(mainFilePath);
      const mainMeta = await sharp(mainBuffer).metadata();
      expect(mainMeta.format).toBe('webp');
      expect(mainMeta.exif).toBeUndefined(); // EXIF completely stripped!

      const thumbBuffer = fs.readFileSync(thumbFilePath);
      const thumbMeta = await sharp(thumbBuffer).metadata();
      expect(thumbMeta.format).toBe('webp');
      expect(thumbMeta.width).toBeLessThanOrEqual(256);
      expect(thumbMeta.height).toBeLessThanOrEqual(256);

      // Clean up test files
      if (fs.existsSync(mainFilePath)) fs.unlinkSync(mainFilePath);
      if (fs.existsSync(thumbFilePath)) fs.unlinkSync(thumbFilePath);
    });
  });

  describe('4. Unauthorized Access Enforcement (assertPlotAccess with scope: photos)', () => {
    it('returns 404 when Farmer B attempts to upload a photo to Farmer A plot (IDOR)', async () => {
      jest.spyOn(pool, 'query').mockImplementation(async (sql: unknown) => {
        const queryText = String(sql);
        if (queryText.includes('FROM plots WHERE id = $1')) {
          return { rows: [plotA], rowCount: 1 } as never; // Owned by farmerA, but requester is farmerB
        }
        return { rows: [], rowCount: 0 } as never;
      });

      const response = await request(app)
        .post(`/api/plots/${plotA.id}/photos`)
        .set('Cookie', [`accessToken=${farmerBToken}`])
        .attach('photo', validPngBuffer, {
          filename: 'intruder.png',
          contentType: 'image/png',
        });

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });

    it('returns 404 when Officer without active share attempts to list photos', async () => {
      jest.spyOn(pool, 'query').mockImplementation(async (sql: unknown) => {
        const queryText = String(sql);
        if (queryText.includes('SELECT is_verified FROM users')) {
          return { rows: [{ is_verified: true }], rowCount: 1 } as never;
        }
        if (queryText.includes('FROM shared_plots sp')) {
          return { rows: [], rowCount: 0 } as never; // No active share
        }
        return { rows: [], rowCount: 0 } as never;
      });

      const response = await request(app)
        .get(`/api/plots/${plotA.id}/photos`)
        .set('Cookie', [`accessToken=${officerToken}`]);

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });

    it('returns 404 when Officer share excludes "photos" category scope', async () => {
      jest.spyOn(pool, 'query').mockImplementation(async (sql: unknown) => {
        const queryText = String(sql);
        if (queryText.includes('SELECT is_verified FROM users')) {
          return { rows: [{ is_verified: true }], rowCount: 1 } as never;
        }
        if (queryText.includes('FROM shared_plots sp')) {
          return {
            rows: [
              {
                id: 'share-no-photos',
                scope: 'view_only',
                scopes: ['crop_cycles', 'harvests'], // No 'photos' scope!
                expires_at: null,
                revoked_at: null,
              },
            ],
            rowCount: 1,
          } as never;
        }
        return { rows: [], rowCount: 0 } as never;
      });

      const response = await request(app)
        .get(`/api/plots/${plotA.id}/photos`)
        .set('Cookie', [`accessToken=${officerToken}`]);

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });

    it('returns 404 when Admin attempts to access photos (Admin boundary)', async () => {
      const response = await request(app)
        .get(`/api/plots/${plotA.id}/photos`)
        .set('Cookie', [`accessToken=${adminToken}`]);

      // requireRole('farmer', 'officer') rejects admin with 403 or authz 404
      expect([403, 404]).toContain(response.status);
    });
  });

  describe('5. Authorized Photo Access & File Serving Endpoint', () => {
    const mockPhotoId = '99999999-9999-4999-8999-999999999999';
    let tempMainFile: string;
    let tempThumbFile: string;

    beforeEach(async () => {
      const storageDir = photoService.getStorageDir();
      tempMainFile = path.join(storageDir, 'test-serve-file.webp');
      tempThumbFile = path.join(storageDir, 'test-serve-thumb.webp');
      fs.writeFileSync(tempMainFile, validWebpBuffer);
      fs.writeFileSync(tempThumbFile, validWebpBuffer);
    });

    afterEach(() => {
      if (fs.existsSync(tempMainFile)) fs.unlinkSync(tempMainFile);
      if (fs.existsSync(tempThumbFile)) fs.unlinkSync(tempThumbFile);
    });

    it('serves binary image only to authorized officer with active photos scope and writes audit log', async () => {
      let auditLogWritten = false;

      jest.spyOn(pool, 'query').mockImplementation(async (sql: unknown) => {
        const queryText = String(sql);
        if (queryText.includes('SELECT is_verified FROM users')) {
          return { rows: [{ is_verified: true }], rowCount: 1 } as never;
        }
        if (queryText.includes('FROM shared_plots sp')) {
          return {
            rows: [
              {
                id: 'share-with-photos',
                scope: 'view_only',
                scopes: ['photos'], // Has 'photos' scope!
                expires_at: null,
                revoked_at: null,
              },
            ],
            rowCount: 1,
          } as never;
        }
        if (queryText.includes('FROM plot_photos')) {
          return {
            rows: [
              {
                id: mockPhotoId,
                plot_id: plotA.id,
                filename: 'test-serve-file.webp',
                thumbnail_filename: 'test-serve-thumb.webp',
                original_name: 'test.webp',
                mime_type: 'image/webp',
              },
            ],
            rowCount: 1,
          } as never;
        }
        if (queryText.includes('INSERT INTO audit_logs')) {
          auditLogWritten = true;
          return { rows: [], rowCount: 1 } as never;
        }
        return { rows: [], rowCount: 0 } as never;
      });

      const response = await request(app)
        .get(`/api/plots/${plotA.id}/photos/${mockPhotoId}/file`)
        .set('Cookie', [`accessToken=${officerToken}`]);

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('image/webp');
      expect(response.headers['cache-control']).toContain('private');
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(auditLogWritten).toBe(true);
    });

    it('serves thumbnail when ?size=thumb is requested', async () => {
      jest.spyOn(pool, 'query').mockImplementation(async (sql: unknown) => {
        const queryText = String(sql);
        if (queryText.includes('FROM plots WHERE id = $1')) {
          return { rows: [plotA], rowCount: 1 } as never;
        }
        if (queryText.includes('FROM plot_photos')) {
          return {
            rows: [
              {
                id: mockPhotoId,
                plot_id: plotA.id,
                filename: 'test-serve-file.webp',
                thumbnail_filename: 'test-serve-thumb.webp',
                original_name: 'test.webp',
                mime_type: 'image/webp',
              },
            ],
            rowCount: 1,
          } as never;
        }
        return { rows: [], rowCount: 0 } as never;
      });

      const response = await request(app)
        .get(`/api/plots/${plotA.id}/photos/${mockPhotoId}/file?size=thumb`)
        .set('Cookie', [`accessToken=${farmerAToken}`]);

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('image/webp');
    });

    it('blocks officer access immediately (returns 404) after share is revoked', async () => {
      let isRevoked = false;

      jest.spyOn(pool, 'query').mockImplementation(async (sql: unknown) => {
        const queryText = String(sql);
        if (queryText.includes('SELECT is_verified FROM users')) {
          return { rows: [{ is_verified: true }], rowCount: 1 } as never;
        }
        if (queryText.includes('FROM shared_plots sp')) {
          if (!isRevoked) {
            return {
              rows: [
                {
                  id: 'share-with-photos',
                  scope: 'view_only',
                  scopes: ['photos'],
                  expires_at: null,
                  revoked_at: null,
                },
              ],
              rowCount: 1,
            } as never;
          } else {
            return { rows: [], rowCount: 0 } as never;
          }
        }
        if (queryText.includes('FROM plot_photos')) {
          return {
            rows: [
              {
                id: mockPhotoId,
                plot_id: plotA.id,
                filename: 'test-serve-file.webp',
                thumbnail_filename: 'test-serve-thumb.webp',
                original_name: 'test.webp',
                mime_type: 'image/webp',
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

      // 1. Initial request before revocation succeeds
      const resBefore = await request(app)
        .get(`/api/plots/${plotA.id}/photos/${mockPhotoId}/file`)
        .set('Cookie', [`accessToken=${officerToken}`]);
      expect(resBefore.status).toBe(200);

      // 2. Share is revoked
      isRevoked = true;

      // 3. Officer's very next request immediately returns 404
      const resAfter = await request(app)
        .get(`/api/plots/${plotA.id}/photos/${mockPhotoId}/file`)
        .set('Cookie', [`accessToken=${officerToken}`]);
      expect(resAfter.status).toBe(404);
      expect(resAfter.body.error.code).toBe('NOT_FOUND');
    });
  });
});
