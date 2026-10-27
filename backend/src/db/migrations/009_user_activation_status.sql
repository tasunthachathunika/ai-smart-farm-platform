-- Migration 009: User Activation Status
-- Adds is_active flag to users table and corresponding index

ALTER TABLE users
ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);
