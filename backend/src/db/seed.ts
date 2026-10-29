import argon2 from 'argon2';
import { pool } from './index';
import { logger } from '../utils/logger';
import { encryptGps } from '../utils/crypto';
import { runMigrations } from './migrate';

export const DEMO_PASSWORD = 'DemoUser@2026!';

/** Seed user emails — used to scope cleanup of child data. */
const SEED_EMAILS = [
  'admin@goviya.lk',
  'aruna.officer@goviya.lk',
  'chathuri.officer@goviya.lk',
  'kavinda.officer@goviya.lk',
  'sunil.farmer@goviya.lk',
  'anula.farmer@goviya.lk',
];

/**
 * Upsert a user by email. On conflict updates everything except the primary
 * key and email, and resets lockout state so seeded accounts are always
 * immediately usable.
 */
async function upsertUser(
  client: import('pg').PoolClient,
  email: string,
  passwordHash: string,
  fullName: string,
  phone: string,
  role: string,
  isVerified: boolean,
): Promise<string> {
  const { rows } = await client.query<{ id: string }>(
    `INSERT INTO users (email, password_hash, full_name, phone, role, is_verified, is_active, failed_login_attempts, locked_until)
     VALUES ($1, $2, $3, $4, $5::user_role, $6, true, 0, NULL)
     ON CONFLICT (email) DO UPDATE SET
       password_hash = EXCLUDED.password_hash,
       full_name = EXCLUDED.full_name,
       phone = EXCLUDED.phone,
       role = EXCLUDED.role,
       is_verified = EXCLUDED.is_verified,
       is_active = true,
       failed_login_attempts = 0,
       locked_until = NULL
     RETURNING id;`,
    [email, passwordHash, fullName, phone, role, isVerified],
  );
  return rows[0].id;
}

export async function seedDatabase(): Promise<void> {
  logger.info('Starting database seed...');

  // 1. Ensure migrations have run first
  await runMigrations();

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 2. Clean existing seed data for child tables owned by seed users.
    //    This is safe because we only delete data belonging to seed accounts,
    //    not data created by real users in the same database.
    logger.info('Cleaning child data for seed users...');

    // Temporarily disable the append-only audit trigger so we can remove
    // seed-generated audit entries.
    await client.query('DROP TRIGGER IF EXISTS trg_audit_logs_immutable ON audit_logs;');

    // Delete audit logs created by the seed script
    await client.query(
      `DELETE FROM audit_logs WHERE user_agent = 'GoviyaPlus/1.0 SeedScript';`,
    );

    // Re-create the immutable trigger immediately
    await client.query(`
      CREATE TRIGGER trg_audit_logs_immutable
      BEFORE UPDATE OR DELETE ON audit_logs
      FOR EACH ROW
      EXECUTE FUNCTION prevent_audit_logs_modification();
    `);

    // Delete plots (cascades to shared_plots, crop_cycles, activity_logs, input_applications, harvests)
    // owned by seed farmers. This leaves non-seed user data untouched.
    await client.query(
      `DELETE FROM plots WHERE farmer_id IN (SELECT id FROM users WHERE email = ANY($1));`,
      [SEED_EMAILS],
    );

    // Delete shared_plots where officer is a seed user (covers officer-side references)
    await client.query(
      `DELETE FROM shared_plots WHERE officer_id IN (SELECT id FROM users WHERE email = ANY($1));`,
      [SEED_EMAILS],
    );

    // 3. Hash default password with Argon2 (same function the login flow uses)
    const passwordHash = await argon2.hash(DEMO_PASSWORD);

    // 4. Upsert Users (idempotent by email)
    logger.info('Upserting users...');

    // 1 Admin
    const adminId = await upsertUser(
      client,
      'admin@goviya.lk',
      passwordHash,
      'Nalaka Admin',
      '+94771000001',
      'admin',
      true,
    );

    // 2 Verified Officers
    const officer1Id = await upsertUser(
      client,
      'aruna.officer@goviya.lk',
      passwordHash,
      'Aruna Wickramasinghe',
      '+94771000002',
      'officer',
      true,
    );

    const officer2Id = await upsertUser(
      client,
      'chathuri.officer@goviya.lk',
      passwordHash,
      'Chathuri Jayasuriya',
      '+94771000003',
      'officer',
      true,
    );

    // 1 Pending (unverified) Officer
    const unverifiedOfficerId = await upsertUser(
      client,
      'kavinda.officer@goviya.lk',
      passwordHash,
      'Kavinda Senanayake',
      '+94771000004',
      'officer',
      false,
    );

    // 2 Farmers
    const farmer1Id = await upsertUser(
      client,
      'sunil.farmer@goviya.lk',
      passwordHash,
      'Sunil Bandara',
      '+94771000005',
      'farmer',
      true,
    );

    const farmer2Id = await upsertUser(
      client,
      'anula.farmer@goviya.lk',
      passwordHash,
      'Anula Kumari',
      '+94771000006',
      'farmer',
      true,
    );

    // 5. Seed Plots with AES-256-GCM encrypted GPS coordinates
    logger.info('Seeding plots...');
    const gps1 = encryptGps(JSON.stringify({ lat: 7.4863, lng: 80.3623 }));
    const {
      rows: [plot1],
    } = await client.query<{ id: string }>(
      `INSERT INTO plots (farmer_id, name, district, encrypted_gps, gps_iv, gps_auth_tag, area_ha, soil_type, irrigation_source)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id;`,
      [
        farmer1Id,
        'Maha Ela Paddy Field',
        'Kurunegala',
        gps1.ciphertext,
        gps1.iv,
        gps1.authTag,
        2.45,
        'Alluvial Lowland Clay',
        'Irrigation Canal',
      ],
    );

    const gps2 = encryptGps(JSON.stringify({ lat: 7.2906, lng: 80.6337 }));
    await client.query(
      `INSERT INTO plots (farmer_id, name, district, encrypted_gps, gps_iv, gps_auth_tag, area_ha, soil_type, irrigation_source)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9);`,
      [
        farmer1Id,
        'Kandy Valley Highland',
        'Kandy',
        gps2.ciphertext,
        gps2.iv,
        gps2.authTag,
        1.2,
        'Reddish Brown Latosolic',
        'Rainfed',
      ],
    );

    const gps3 = encryptGps(JSON.stringify({ lat: 8.3114, lng: 80.4037 }));
    const {
      rows: [plot3],
    } = await client.query<{ id: string }>(
      `INSERT INTO plots (farmer_id, name, district, encrypted_gps, gps_iv, gps_auth_tag, area_ha, soil_type, irrigation_source)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id;`,
      [
        farmer2Id,
        'Rajarata Veggie Garden',
        'Anuradhapura',
        gps3.ciphertext,
        gps3.iv,
        gps3.authTag,
        3.1,
        'Reddish Brown Earth',
        'Deep Well & Drip',
      ],
    );

    // 6. Seed Active Share (Farmer 1 shares Plot 1 with Verified Officer 1)
    logger.info('Seeding active plot share...');
    const {
      rows: [share1],
    } = await client.query<{ id: string }>(
      `INSERT INTO shared_plots (plot_id, officer_id, scope, granted_at, expires_at, revoked_at)
       VALUES ($1, $2, 'advisory', NOW() - INTERVAL '3 days', NOW() + INTERVAL '27 days', NULL)
       RETURNING id;`,
      [plot1.id, officer1Id],
    );

    // 7. Seed Crop Cycles
    logger.info('Seeding crop cycles...');
    // Completed cycle with harvest
    const {
      rows: [cycle1],
    } = await client.query<{ id: string }>(
      `INSERT INTO crop_cycles (plot_id, crop_name, variety, start_date, end_date, status, estimated_yield_kg)
       VALUES ($1, $2, $3, $4, $5, 'completed', $6) RETURNING id;`,
      [plot1.id, 'Bg 358 White Samba', 'DOA Bg 358', '2026-05-10', '2026-09-15', 4800.0],
    );

    // Active cycle with current logs and input_applications
    const {
      rows: [cycle2],
    } = await client.query<{ id: string }>(
      `INSERT INTO crop_cycles (plot_id, crop_name, variety, start_date, end_date, status, estimated_yield_kg)
       VALUES ($1, $2, $3, $4, NULL, 'active', $5) RETURNING id;`,
      [plot1.id, 'At 362 Red Nadu', 'Ambalantota 362', '2026-10-01', 5200.0],
    );

    // Active cycle on Plot 3
    const {
      rows: [cycle3],
    } = await client.query<{ id: string }>(
      `INSERT INTO crop_cycles (plot_id, crop_name, variety, start_date, end_date, status, estimated_yield_kg)
       VALUES ($1, $2, $3, $4, NULL, 'active', $5) RETURNING id;`,
      [plot3.id, 'MI-2 Green Chili', 'Maha Illuppallama 2', '2026-08-15', 1500.0],
    );

    // 8. Seed Farm Logs
    logger.info('Seeding farm logs...');
    await client.query(
      `INSERT INTO activity_logs (cycle_id, log_type, log_date, notes) VALUES
       ($1, 'observation', '2026-10-05', 'Land preparation completed and seedlings transplanted evenly across 2.45 hectares.'),
       ($1, 'irrigation', '2026-10-12', 'Maintained 5cm water level across all liyaddas from canal inflow.'),
       ($1, 'disease', '2026-10-20', 'Routine inspection: no signs of leaf blast or brown planthopper pest damage.'),
       ($2, 'observation', '2026-09-01', 'First flowering observed on 60% of chili plants.');`,
      [cycle2.id, cycle3.id],
    );

    // 9. Seed input_applications
    logger.info('Seeding input_applications...');
    await client.query(
      `INSERT INTO input_applications (cycle_id, input_type, name, quantity, unit, application_date, cost) VALUES
       ($1, 'seed', 'Certified At 362 Seed Paddy', 100.00, 'kg', '2026-10-01', 22000.00),
       ($1, 'fertilizer', 'Triple Super Phosphate (TSP)', 50.00, 'kg', '2026-10-06', 12500.00),
       ($1, 'organic_matter', 'Compost & Paddy Husk Ash', 500.00, 'kg', '2026-10-10', 8000.00);`,
      [cycle2.id],
    );

    // 10. Seed Harvests (for completed Cycle 1)
    logger.info('Seeding harvests...');
    await client.query(
      `INSERT INTO harvests (cycle_id, harvest_date, quantity, unit, quality_grade, revenue, notes) VALUES
       ($1, '2026-09-14', 4750.00, 'kg', 'Grade A', 617500.00, 'High quality Samba grain with moisture content verified at 13.5%.');`,
      [cycle1.id],
    );

    // 11. Seed Audit Log (append-only)
    logger.info('Seeding audit log entry...');
    await client.query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, metadata, ip_address, user_agent)
       VALUES ($1, 'share_grant', 'shared_plots', $2, $3, '127.0.0.1', 'GoviyaPlus/1.0 SeedScript');`,
      [
        farmer1Id,
        share1.id,
        JSON.stringify({
          plot_name: 'Maha Ela Paddy Field',
          officer_email: 'aruna.officer@goviya.lk',
          scope: 'advisory',
        }),
      ],
    );

    await client.query('COMMIT');
    logger.info('Database seeded successfully!');
    logger.info(`Summary:
  - 1 Admin: admin@goviya.lk (ID: ${adminId})
  - 2 Verified Officers: aruna.officer@goviya.lk (${officer1Id}), chathuri.officer@goviya.lk (${officer2Id})
  - 1 Unverified Officer: kavinda.officer@goviya.lk (${unverifiedOfficerId})
  - 2 Farmers: sunil.farmer@goviya.lk (${farmer1Id}), anula.farmer@goviya.lk (${farmer2Id})
  - 1 Active Share: Plot '${plot1.id}' shared with Officer '${officer1Id}'
  - Demo password for all accounts: ${DEMO_PASSWORD}`);
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error({ err: error }, 'Database seed failed');
    throw error;
  } finally {
    client.release();
  }
}

// Support executing directly via CLI (e.g. npm run seed)
if (require.main === module) {
  seedDatabase()
    .then(async () => {
      await pool.end();
      process.exit(0);
    })
    .catch(async (err) => {
      logger.error({ err }, 'Failed to seed database');
      await pool.end();
      process.exit(1);
    });
}
