-- Migration 003: Fields table and activity_logs / input_applications alignment

-- 1. Create fields table
CREATE TABLE IF NOT EXISTS fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  district VARCHAR(100) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fields_farmer_id ON fields(farmer_id);
CREATE INDEX IF NOT EXISTS idx_fields_district ON fields(district);

-- Link plots to parent fields optionally
ALTER TABLE plots ADD COLUMN IF NOT EXISTS field_id UUID REFERENCES fields(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_plots_field_id ON plots(field_id);

-- 2. Rename farm_logs to activity_logs if farm_logs exists
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'farm_logs') 
     AND NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'activity_logs') THEN
    ALTER TABLE farm_logs RENAME TO activity_logs;
  END IF;
END $$;

-- Ensure activity_logs table exists
CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id UUID NOT NULL REFERENCES crop_cycles(id) ON DELETE CASCADE,
  log_type log_type NOT NULL DEFAULT 'general',
  log_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_cycle_id ON activity_logs(cycle_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_date ON activity_logs(log_date);
CREATE INDEX IF NOT EXISTS idx_activity_logs_type ON activity_logs(log_type);

-- 3. Rename inputs to input_applications if inputs exists
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'inputs') 
     AND NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'input_applications') THEN
    ALTER TABLE inputs RENAME TO input_applications;
  END IF;
END $$;

-- Ensure input_applications table exists
CREATE TABLE IF NOT EXISTS input_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id UUID NOT NULL REFERENCES crop_cycles(id) ON DELETE CASCADE,
  input_type input_type NOT NULL DEFAULT 'other',
  name VARCHAR(255) NOT NULL,
  quantity NUMERIC(10, 2) NOT NULL,
  unit VARCHAR(50) NOT NULL,
  application_date DATE NOT NULL,
  cost NUMERIC(12, 2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT check_input_applications_quantity_positive CHECK (quantity > 0)
);

CREATE INDEX IF NOT EXISTS idx_input_applications_cycle_id ON input_applications(cycle_id);
