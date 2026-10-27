-- Migration 001: Initial Schema for Goviya Plus
-- Derived from docs/database/schema.dbml

-- Enable pgcrypto for UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enums
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('farmer', 'officer', 'admin');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE share_scope AS ENUM ('view_only', 'advisory', 'full');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE cycle_status AS ENUM ('planned', 'active', 'completed', 'abandoned');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE log_type AS ENUM ('general', 'observation', 'irrigation', 'fertilizer', 'pest_control', 'disease', 'weather');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE input_type AS ENUM ('fertilizer', 'pesticide', 'seed', 'organic_matter', 'other');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE audit_action AS ENUM ('create', 'read', 'update', 'delete', 'login', 'share_grant', 'share_revoke');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- 1. Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  role user_role NOT NULL DEFAULT 'farmer',
  is_verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- 2. Plots table
CREATE TABLE IF NOT EXISTS plots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  district VARCHAR(100) NOT NULL,
  encrypted_gps TEXT NOT NULL,
  gps_iv VARCHAR(64) NOT NULL,
  gps_auth_tag VARCHAR(64) NOT NULL,
  area_ha NUMERIC(10, 4) NOT NULL,
  soil_type VARCHAR(100),
  irrigation_source VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT check_plots_area_positive CHECK (area_ha > 0)
);

CREATE INDEX IF NOT EXISTS idx_plots_farmer_id ON plots(farmer_id);
CREATE INDEX IF NOT EXISTS idx_plots_district ON plots(district);

-- 3. Shared Plots table
CREATE TABLE IF NOT EXISTS shared_plots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plot_id UUID NOT NULL REFERENCES plots(id) ON DELETE CASCADE,
  officer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  scope share_scope NOT NULL DEFAULT 'view_only',
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  CONSTRAINT check_shared_plots_expiry CHECK (expires_at IS NULL OR expires_at > granted_at)
);

-- Partial unique index ensuring only one active (non-revoked) share per plot-officer pair
CREATE UNIQUE INDEX IF NOT EXISTS idx_shared_plots_active_unique 
ON shared_plots(plot_id, officer_id) 
WHERE revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_shared_plots_officer_id ON shared_plots(officer_id);

-- 4. Crop Cycles table
CREATE TABLE IF NOT EXISTS crop_cycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plot_id UUID NOT NULL REFERENCES plots(id) ON DELETE CASCADE,
  crop_name VARCHAR(100) NOT NULL,
  variety VARCHAR(100),
  start_date DATE NOT NULL,
  end_date DATE,
  status cycle_status NOT NULL DEFAULT 'planned',
  estimated_yield_kg NUMERIC(10, 2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT check_crop_cycles_date_order CHECK (end_date IS NULL OR end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS idx_crop_cycles_plot_id ON crop_cycles(plot_id);
CREATE INDEX IF NOT EXISTS idx_crop_cycles_status ON crop_cycles(status);

-- 5. Farm Logs table
CREATE TABLE IF NOT EXISTS farm_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id UUID NOT NULL REFERENCES crop_cycles(id) ON DELETE CASCADE,
  log_type log_type NOT NULL DEFAULT 'general',
  log_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_farm_logs_cycle_id ON farm_logs(cycle_id);
CREATE INDEX IF NOT EXISTS idx_farm_logs_date ON farm_logs(log_date);

-- 6. Inputs table
CREATE TABLE IF NOT EXISTS inputs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id UUID NOT NULL REFERENCES crop_cycles(id) ON DELETE CASCADE,
  input_type input_type NOT NULL DEFAULT 'other',
  name VARCHAR(255) NOT NULL,
  quantity NUMERIC(10, 2) NOT NULL,
  unit VARCHAR(50) NOT NULL,
  application_date DATE NOT NULL,
  cost NUMERIC(12, 2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT check_inputs_quantity_positive CHECK (quantity > 0)
);

CREATE INDEX IF NOT EXISTS idx_inputs_cycle_id ON inputs(cycle_id);

-- 7. Harvests table
CREATE TABLE IF NOT EXISTS harvests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id UUID NOT NULL REFERENCES crop_cycles(id) ON DELETE CASCADE,
  harvest_date DATE NOT NULL,
  quantity NUMERIC(10, 2) NOT NULL,
  unit VARCHAR(50) NOT NULL,
  quality_grade VARCHAR(50),
  revenue NUMERIC(12, 2),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT check_harvests_quantity_positive CHECK (quantity > 0)
);

CREATE INDEX IF NOT EXISTS idx_harvests_cycle_id ON harvests(cycle_id);
CREATE INDEX IF NOT EXISTS idx_harvests_date ON harvests(harvest_date);

-- 8. Audit Logs table (Append-only)
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action audit_action NOT NULL,
  entity_type VARCHAR(100) NOT NULL,
  entity_id UUID,
  metadata JSONB,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type);

-- Trigger function enforcing append-only behavior on audit_logs
CREATE OR REPLACE FUNCTION prevent_audit_logs_modification()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Table audit_logs is append-only. UPDATE and DELETE operations are prohibited.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_audit_logs_immutable ON audit_logs;
CREATE TRIGGER trg_audit_logs_immutable
BEFORE UPDATE OR DELETE ON audit_logs
FOR EACH ROW
EXECUTE FUNCTION prevent_audit_logs_modification();
