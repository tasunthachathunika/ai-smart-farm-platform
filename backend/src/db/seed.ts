import argon2 from 'argon2';
import { pool } from './index';
import { logger } from '../utils/logger';
import { encryptGps } from '../utils/crypto';
import { runMigrations } from './migrate';

export const DEMO_PASSWORD = 'DemoUser@2026!';

export async function seedDatabase(): Promise<void> {
  logger.info('Starting database seed...');

  // 1. Ensure migrations have run first
  await runMigrations();

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Clean existing test data (respecting append-only trigger by temporarily disabling it for re-seed)
    logger.info('Clearing old seed data...');
    await client.query('DROP TRIGGER IF EXISTS trg_audit_logs_immutable ON audit_logs;');
    await client.query('TRUNCATE TABLE audit_logs CASCADE;');
    await client.query('TRUNCATE TABLE users CASCADE;'); // cascades to plots, shared_plots, cycles, etc.

    // Re-create immutable trigger on audit_logs
    await client.query(`
      CREATE TRIGGER trg_audit_logs_immutable
      BEFORE UPDATE OR DELETE ON audit_logs
      FOR EACH ROW
      EXECUTE FUNCTION prevent_audit_logs_modification();
    `);

    // 2. Hash default password with Argon2
    const passwordHash = await argon2.hash(DEMO_PASSWORD);

    // 3. Seed Users
    logger.info('Seeding users...');
    // 1 Admin
    const {
      rows: [admin],
    } = await client.query<{ id: string }>(
      `INSERT INTO users (email, password_hash, full_name, phone, role, is_verified)
       VALUES ($1, $2, $3, $4, 'admin', true) RETURNING id;`,
      ['admin@goviya.lk', passwordHash, 'Nalaka Admin', '+94771000001'],
    );

    // 2 Verified Officers
    const {
      rows: [officer1],
    } = await client.query<{ id: string }>(
      `INSERT INTO users (email, password_hash, full_name, phone, role, is_verified)
       VALUES ($1, $2, $3, $4, 'officer', true) RETURNING id;`,
      ['aruna.officer@goviya.lk', passwordHash, 'Aruna Wickramasinghe', '+94771000002'],
    );

    const {
      rows: [officer2],
    } = await client.query<{ id: string }>(
      `INSERT INTO users (email, password_hash, full_name, phone, role, is_verified)
       VALUES ($1, $2, $3, $4, 'officer', true) RETURNING id;`,
      ['chathuri.officer@goviya.lk', passwordHash, 'Chathuri Jayasuriya', '+94771000003'],
    );

    // 1 Unverified Officer
    const {
      rows: [unverifiedOfficer],
    } = await client.query<{ id: string }>(
      `INSERT INTO users (email, password_hash, full_name, phone, role, is_verified)
       VALUES ($1, $2, $3, $4, 'officer', false) RETURNING id;`,
      ['kavinda.officer@goviya.lk', passwordHash, 'Kavinda Senanayake', '+94771000004'],
    );

    // 2 Farmers
    const {
      rows: [farmer1],
    } = await client.query<{ id: string }>(
      `INSERT INTO users (email, password_hash, full_name, phone, role, is_verified)
       VALUES ($1, $2, $3, $4, 'farmer', true) RETURNING id;`,
      ['sunil.farmer@goviya.lk', passwordHash, 'Sunil Bandara', '+94771000005'],
    );

    const {
      rows: [farmer2],
    } = await client.query<{ id: string }>(
      `INSERT INTO users (email, password_hash, full_name, phone, role, is_verified)
       VALUES ($1, $2, $3, $4, 'farmer', true) RETURNING id;`,
      ['anula.farmer@goviya.lk', passwordHash, 'Anula Kumari', '+94771000006'],
    );

    // 4. Seed Plots with AES-256-GCM encrypted GPS coordinates
    logger.info('Seeding plots...');
    const gps1 = encryptGps(JSON.stringify({ lat: 7.4863, lng: 80.3623 }));
    const {
      rows: [plot1],
    } = await client.query<{ id: string }>(
      `INSERT INTO plots (farmer_id, name, district, encrypted_gps, gps_iv, gps_auth_tag, area_ha, soil_type, irrigation_source)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id;`,
      [
        farmer1.id,
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
        farmer1.id,
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
        farmer2.id,
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

    // 5. Seed 1 Active Share (Farmer 1 shares Plot 1 with Verified Officer 1)
    logger.info('Seeding active plot share...');
    const {
      rows: [share1],
    } = await client.query<{ id: string }>(
      `INSERT INTO shared_plots (plot_id, officer_id, scope, granted_at, expires_at, revoked_at)
       VALUES ($1, $2, 'advisory', NOW() - INTERVAL '3 days', NOW() + INTERVAL '27 days', NULL)
       RETURNING id;`,
      [plot1.id, officer1.id],
    );

    // 6. Seed Crop Cycles
    logger.info('Seeding crop cycles...');
    // Completed cycle with harvest
    const {
      rows: [cycle1],
    } = await client.query<{ id: string }>(
      `INSERT INTO crop_cycles (plot_id, crop_name, variety, start_date, end_date, status, estimated_yield_kg)
       VALUES ($1, $2, $3, $4, $5, 'completed', $6) RETURNING id;`,
      [plot1.id, 'Bg 358 White Samba', 'DOA Bg 358', '2026-05-10', '2026-09-15', 4800.0],
    );

    // Active cycle with current logs and inputs
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

    // 7. Seed Farm Logs
    logger.info('Seeding farm logs...');
    await client.query(
      `INSERT INTO farm_logs (cycle_id, log_type, log_date, notes) VALUES
       ($1, 'observation', '2026-10-05', 'Land preparation completed and seedlings transplanted evenly across 2.45 hectares.'),
       ($1, 'irrigation', '2026-10-12', 'Maintained 5cm water level across all liyaddas from canal inflow.'),
       ($1, 'disease', '2026-10-20', 'Routine inspection: no signs of leaf blast or brown planthopper pest damage.'),
       ($2, 'observation', '2026-09-01', 'First flowering observed on 60% of chili plants.');`,
      [cycle2.id, cycle3.id],
    );

    // 8. Seed Inputs
    logger.info('Seeding inputs...');
    await client.query(
      `INSERT INTO inputs (cycle_id, input_type, name, quantity, unit, application_date, cost) VALUES
       ($1, 'seed', 'Certified At 362 Seed Paddy', 100.00, 'kg', '2026-10-01', 22000.00),
       ($1, 'fertilizer', 'Triple Super Phosphate (TSP)', 50.00, 'kg', '2026-10-06', 12500.00),
       ($1, 'organic_matter', 'Compost & Paddy Husk Ash', 500.00, 'kg', '2026-10-10', 8000.00);`,
      [cycle2.id],
    );

    // 9. Seed Harvests (for completed Cycle 1)
    logger.info('Seeding harvests...');
    await client.query(
      `INSERT INTO harvests (cycle_id, harvest_date, quantity, unit, quality_grade, revenue, notes) VALUES
       ($1, '2026-09-14', 4750.00, 'kg', 'Grade A', 617500.00, 'High quality Samba grain with moisture content verified at 13.5%.');`,
      [cycle1.id],
    );

    // 10. Seed Audit Log (Append-only)
    logger.info('Seeding audit logs...');
    await client.query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, metadata, ip_address, user_agent)
       VALUES ($1, 'share_grant', 'shared_plots', $2, $3, '127.0.0.1', 'GoviyaPlus/1.0 SeedScript');`,
      [
        farmer1.id,
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
  - 1 Admin: admin@goviya.lk (ID: ${admin.id})
  - 2 Verified Officers: aruna.officer@goviya.lk (${officer1.id}), chathuri.officer@goviya.lk (${officer2.id})
  - 1 Unverified Officer: kavinda.officer@goviya.lk (${unverifiedOfficer.id})
  - 2 Farmers: sunil.farmer@goviya.lk (${farmer1.id}), anula.farmer@goviya.lk (${farmer2.id})
  - 1 Active Share: Plot '${plot1.id}' shared with Officer '${officer1.id}'
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
