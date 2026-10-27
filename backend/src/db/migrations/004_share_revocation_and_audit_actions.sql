-- Migration 004: Share Revocation Tracking & Plot Viewed Audit Actions
-- Adds revoked_by, granted_by to shared_plots and expands audit_action enum

-- Add 'plot_viewed_by_officer' and 'ai_used' to audit_action enum
DO $$ BEGIN
  ALTER TYPE audit_action ADD VALUE 'plot_viewed_by_officer';
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TYPE audit_action ADD VALUE 'ai_used';
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Add granted_by and revoked_by columns to shared_plots
ALTER TABLE shared_plots 
ADD COLUMN IF NOT EXISTS granted_by UUID REFERENCES users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS revoked_by UUID REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_shared_plots_granted_by ON shared_plots(granted_by);
CREATE INDEX IF NOT EXISTS idx_shared_plots_revoked_by ON shared_plots(revoked_by);
