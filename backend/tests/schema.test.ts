import fs from 'fs';
import path from 'path';

describe('Database Schema & Migration Definition', () => {
  describe('001_initial_schema.sql', () => {
    const migrationPath = path.resolve(__dirname, '../src/db/migrations/001_initial_schema.sql');

    it('should find 001_initial_schema.sql migration file', () => {
      expect(fs.existsSync(migrationPath)).toBe(true);
    });

    const sql = fs.readFileSync(migrationPath, 'utf8');

    it('should create all required tables', () => {
      const requiredTables = [
        'users',
        'plots',
        'shared_plots',
        'crop_cycles',
        'farm_logs',
        'inputs',
        'harvests',
        'audit_logs',
      ];

      for (const table of requiredTables) {
        expect(sql).toMatch(new RegExp(`CREATE TABLE IF NOT EXISTS ${table}`, 'i'));
      }
    });

    it('should create required enums', () => {
      const requiredEnums = [
        'user_role',
        'share_scope',
        'cycle_status',
        'log_type',
        'input_type',
        'audit_action',
      ];

      for (const enumName of requiredEnums) {
        expect(sql).toMatch(new RegExp(`CREATE TYPE ${enumName} AS ENUM`, 'i'));
      }
    });

    it('should enforce CHECK (area_ha > 0) on plots table', () => {
      expect(sql).toMatch(/CHECK\s*\(\s*area_ha\s*>\s*0\s*\)/i);
    });

    it('should enforce CHECK (quantity > 0) on harvests table', () => {
      expect(sql).toMatch(
        /CONSTRAINT check_harvests_quantity_positive CHECK\s*\(\s*quantity\s*>\s*0\s*\)/i,
      );
    });

    it('should enforce CHECK (end_date IS NULL OR end_date >= start_date) on crop_cycles table', () => {
      expect(sql).toMatch(/CHECK\s*\(\s*end_date IS NULL OR end_date\s*>=\s*start_date\s*\)/i);
    });

    it('should create partial unique index on shared_plots(plot_id, officer_id) WHERE revoked_at IS NULL', () => {
      expect(sql).toMatch(
        /CREATE\s+UNIQUE\s+INDEX\s+IF\s+NOT\s+EXISTS\s+idx_shared_plots_active_unique\s+ON\s+shared_plots\s*\(\s*plot_id\s*,\s*officer_id\s*\)\s+WHERE\s+revoked_at\s+IS\s+NULL/i,
      );
    });

    it('should enforce append-only trigger on audit_logs table', () => {
      expect(sql).toMatch(/prevent_audit_logs_modification/i);
      expect(sql).toMatch(/BEFORE\s+UPDATE\s+OR\s+DELETE\s+ON\s+audit_logs/i);
      expect(sql).toMatch(/RAISE\s+EXCEPTION.*append-only/i);
    });
  });

  describe('002_auth_refresh_tokens_and_lockout.sql', () => {
    const migrationPath = path.resolve(
      __dirname,
      '../src/db/migrations/002_auth_refresh_tokens_and_lockout.sql',
    );

    it('should find 002_auth_refresh_tokens_and_lockout.sql migration file', () => {
      expect(fs.existsSync(migrationPath)).toBe(true);
    });

    const sql = fs.readFileSync(migrationPath, 'utf8');

    it('should add lockout columns to users table', () => {
      expect(sql).toMatch(/failed_login_attempts\s+INT/i);
      expect(sql).toMatch(/locked_until\s+TIMESTAMPTZ/i);
    });

    it('should create refresh_tokens table with token_hash and user_id foreign key', () => {
      expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS refresh_tokens/i);
      expect(sql).toMatch(/token_hash\s+VARCHAR\(255\)\s+NOT NULL\s+UNIQUE/i);
      expect(sql).toMatch(/user_id\s+UUID\s+NOT NULL\s+REFERENCES users/i);
      expect(sql).toMatch(/CREATE INDEX IF NOT EXISTS idx_refresh_tokens_hash/i);
    });

    it('should add logout to audit_action enum', () => {
      expect(sql).toMatch(/ALTER TYPE audit_action ADD VALUE 'logout'/i);
    });
  });

  describe('004_share_revocation_and_audit_actions.sql', () => {
    const migrationPath = path.resolve(
      __dirname,
      '../src/db/migrations/004_share_revocation_and_audit_actions.sql',
    );

    it('should find 004_share_revocation_and_audit_actions.sql migration file', () => {
      expect(fs.existsSync(migrationPath)).toBe(true);
    });

    const sql = fs.readFileSync(migrationPath, 'utf8');

    it('should add plot_viewed_by_officer and ai_used to audit_action enum', () => {
      expect(sql).toMatch(/ALTER TYPE audit_action ADD VALUE 'plot_viewed_by_officer'/i);
      expect(sql).toMatch(/ALTER TYPE audit_action ADD VALUE 'ai_used'/i);
    });

    it('should add granted_by and revoked_by columns to shared_plots', () => {
      expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS granted_by UUID REFERENCES users/i);
      expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS revoked_by UUID REFERENCES users/i);
    });
  });

  describe('005_officer_scopes_and_advisory_notes.sql', () => {
    const migrationPath = path.resolve(
      __dirname,
      '../src/db/migrations/005_officer_scopes_and_advisory_notes.sql',
    );

    it('should find 005_officer_scopes_and_advisory_notes.sql migration file', () => {
      expect(fs.existsSync(migrationPath)).toBe(true);
    });

    const sql = fs.readFileSync(migrationPath, 'utf8');

    it('should add scopes TEXT[] column to shared_plots', () => {
      expect(sql).toMatch(/ALTER TABLE shared_plots\s+ADD COLUMN IF NOT EXISTS scopes TEXT\[\]/i);
    });

    it('should create advisory_notes table with references to plots and users', () => {
      expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS advisory_notes/i);
      expect(sql).toMatch(/plot_id UUID NOT NULL REFERENCES plots/i);
      expect(sql).toMatch(/officer_id UUID NOT NULL REFERENCES users/i);
      expect(sql).toMatch(/notes TEXT NOT NULL/i);
    });
  });

  describe('006_plot_photos.sql', () => {
    const migrationPath = path.resolve(__dirname, '../src/db/migrations/006_plot_photos.sql');

    it('should find 006_plot_photos.sql migration file', () => {
      expect(fs.existsSync(migrationPath)).toBe(true);
    });

    const sql = fs.readFileSync(migrationPath, 'utf8');

    it('should create plot_photos table with required columns and constraints', () => {
      expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS plot_photos/i);
      expect(sql).toMatch(/plot_id UUID NOT NULL REFERENCES plots\(id\)/i);
      expect(sql).toMatch(/uploader_id UUID NOT NULL REFERENCES users\(id\)/i);
      expect(sql).toMatch(/filename VARCHAR\(255\) NOT NULL/i);
      expect(sql).toMatch(/thumbnail_filename VARCHAR\(255\) NOT NULL/i);
      expect(sql).toMatch(/original_name VARCHAR\(255\) NOT NULL/i);
      expect(sql).toMatch(/mime_type VARCHAR\(50\) NOT NULL/i);
      expect(sql).toMatch(/file_size INTEGER NOT NULL/i);
    });

    it('should create indexes for plot_photos', () => {
      expect(sql).toMatch(/idx_plot_photos_plot_id/i);
      expect(sql).toMatch(/idx_plot_photos_uploader_id/i);
      expect(sql).toMatch(/idx_plot_photos_created_at/i);
    });
  });

  describe('007_weather_data.sql', () => {
    const migrationPath = path.resolve(__dirname, '../src/db/migrations/007_weather_data.sql');

    it('should find 007_weather_data.sql migration file', () => {
      expect(fs.existsSync(migrationPath)).toBe(true);
    });

    const sql = fs.readFileSync(migrationPath, 'utf8');

    it('should create weather_data table with district, data, fetched_at, and constraints', () => {
      expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS weather_data/i);
      expect(sql).toMatch(/district VARCHAR\(100\) NOT NULL UNIQUE/i);
      expect(sql).toMatch(/data JSONB NOT NULL/i);
      expect(sql).toMatch(/fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW\(\)/i);
    });

    it('should create indexes for weather_data', () => {
      expect(sql).toMatch(/idx_weather_data_district/i);
      expect(sql).toMatch(/idx_weather_data_fetched_at/i);
    });
  });

  describe('008_ai_analyses.sql', () => {
    const migrationPath = path.resolve(__dirname, '../src/db/migrations/008_ai_analyses.sql');

    it('should find 008_ai_analyses.sql migration file', () => {
      expect(fs.existsSync(migrationPath)).toBe(true);
    });

    const sql = fs.readFileSync(migrationPath, 'utf8');

    it('should create ai_analyses table with required columns and constraints', () => {
      expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS ai_analyses/i);
      expect(sql).toMatch(/plot_id UUID NOT NULL REFERENCES plots\(id\)/i);
      expect(sql).toMatch(/user_id UUID NOT NULL REFERENCES users\(id\)/i);
      expect(sql).toMatch(/analysis_type VARCHAR\(50\) NOT NULL/i);
      expect(sql).toMatch(/flags JSONB/i);
      expect(sql).toMatch(/is_fallback BOOLEAN NOT NULL DEFAULT false/i);
      expect(sql).toMatch(/result JSONB NOT NULL/i);
    });

    it('should create indexes for ai_analyses', () => {
      expect(sql).toMatch(/idx_ai_analyses_plot_id/i);
      expect(sql).toMatch(/idx_ai_analyses_user_id/i);
      expect(sql).toMatch(/idx_ai_analyses_created_at/i);
    });
  });

  describe('009_user_activation_status.sql', () => {
    const migrationPath = path.resolve(
      __dirname,
      '../src/db/migrations/009_user_activation_status.sql',
    );

    it('should find 009_user_activation_status.sql migration file', () => {
      expect(fs.existsSync(migrationPath)).toBe(true);
    });

    const sql = fs.readFileSync(migrationPath, 'utf8');

    it('should add is_active column to users table', () => {
      expect(sql).toMatch(
        /ALTER TABLE users\s+ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true/i,
      );
    });

    it('should create index on users(is_active)', () => {
      expect(sql).toMatch(
        /CREATE INDEX IF NOT EXISTS idx_users_is_active ON users\s*\(\s*is_active\s*\)/i,
      );
    });
  });
});
