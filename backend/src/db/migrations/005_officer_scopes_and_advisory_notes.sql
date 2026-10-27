-- Migration 005: Officer Category Scopes and Advisory Notes Table
-- Adds category-level scopes array to shared_plots and creates advisory_notes table

-- 1. Add scopes array to shared_plots
ALTER TABLE shared_plots 
ADD COLUMN IF NOT EXISTS scopes TEXT[] DEFAULT ARRAY['view_only', 'advisory', 'crop_cycles', 'activity_logs', 'input_applications', 'harvests', 'advisory_notes']::TEXT[];

-- 2. Create advisory_notes table
CREATE TABLE IF NOT EXISTS advisory_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plot_id UUID NOT NULL REFERENCES plots(id) ON DELETE CASCADE,
  officer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL DEFAULT 'Advisory Note',
  notes TEXT NOT NULL,
  recommendations TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_advisory_notes_plot_id ON advisory_notes(plot_id);
CREATE INDEX IF NOT EXISTS idx_advisory_notes_officer_id ON advisory_notes(officer_id);
CREATE INDEX IF NOT EXISTS idx_advisory_notes_created_at ON advisory_notes(created_at);
