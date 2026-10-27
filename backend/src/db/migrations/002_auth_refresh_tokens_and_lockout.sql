-- Migration 002: Refresh Tokens & Account Lockout
-- Adds refresh token storage and rate limiting / lockout security to users

-- Add 'logout' to audit_action enum if not already present
DO $$ BEGIN
  ALTER TYPE audit_action ADD VALUE 'logout';
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Add failed attempts and lockout timestamp to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS failed_login_attempts INT NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ;

-- Create refresh_tokens table
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_hash ON refresh_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
