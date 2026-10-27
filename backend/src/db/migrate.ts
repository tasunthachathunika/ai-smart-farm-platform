import fs from 'fs';
import path from 'path';
import { pool } from './index';
import { logger } from '../utils/logger';
import { env } from '../config/env';

/**
 * Migration Runner for Goviya Plus PostgreSQL database.
 * Automatically runs pending migrations on startup or via CLI.
 */
export async function runMigrations(): Promise<void> {
  // Skip migrations if explicitly requested or in test environment
  if (
    (env.NODE_ENV === 'test' && !process.env.RUN_MIGRATIONS_IN_TEST) ||
    process.env.SKIP_MIGRATIONS === 'true'
  ) {
    logger.info('Skipping database migrations');
    return;
  }

  logger.info('Checking database migrations...');

  const client = await pool.connect();
  try {
    // 1. Ensure migrations tracking table exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        version VARCHAR(255) NOT NULL UNIQUE,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // 2. Fetch applied migrations
    const { rows: appliedRows } = await client.query<{ version: string }>(
      'SELECT version FROM schema_migrations ORDER BY id ASC;',
    );
    const appliedVersions = new Set(appliedRows.map((r) => r.version));

    // 3. Locate migration files (support both src/ in tsx/dev and dist/ in production)
    const possibleDirs = [
      path.resolve(__dirname, 'migrations'),
      path.resolve(process.cwd(), 'src/db/migrations'),
      path.resolve(process.cwd(), 'dist/db/migrations'),
    ];

    const migrationsDir = possibleDirs.find((dir) => fs.existsSync(dir));
    if (!migrationsDir) {
      logger.warn('No migrations directory found in search paths');
      return;
    }

    const migrationFiles = fs
      .readdirSync(migrationsDir)
      .filter((file) => file.endsWith('.sql'))
      .sort();

    // 4. Run pending migrations in order
    for (const file of migrationFiles) {
      if (!appliedVersions.has(file)) {
        logger.info(`Applying migration: ${file}...`);
        const filePath = path.join(migrationsDir, file);
        const sql = fs.readFileSync(filePath, 'utf8');

        await client.query('BEGIN');
        try {
          await client.query(sql);
          await client.query('INSERT INTO schema_migrations (version) VALUES ($1);', [file]);
          await client.query('COMMIT');
          logger.info(`Successfully applied migration: ${file}`);
        } catch (migrationError) {
          await client.query('ROLLBACK');
          logger.error({ err: migrationError }, `Failed to apply migration ${file}`);
          throw migrationError;
        }
      }
    }

    logger.info('Database migrations are up to date.');
  } finally {
    client.release();
  }
}

// Support running directly from command line (e.g. npm run migrate)
if (require.main === module) {
  runMigrations()
    .then(async () => {
      logger.info('Migration process finished.');
      await pool.end();
      process.exit(0);
    })
    .catch(async (err) => {
      logger.error({ err }, 'Migration failed');
      await pool.end();
      process.exit(1);
    });
}
