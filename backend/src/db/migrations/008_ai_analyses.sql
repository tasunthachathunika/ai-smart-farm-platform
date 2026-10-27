-- Migration 008: AI Analyses Table
-- Stores responsible AI summaries and visit prep outputs with tokens and safety flags

CREATE TABLE IF NOT EXISTS ai_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plot_id UUID NOT NULL REFERENCES plots(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  analysis_type VARCHAR(50) NOT NULL,
  prompt_tokens INTEGER,
  completion_tokens INTEGER,
  total_tokens INTEGER,
  flags JSONB DEFAULT '[]'::JSONB,
  is_fallback BOOLEAN NOT NULL DEFAULT false,
  result JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_analyses_plot_id ON ai_analyses (plot_id);
CREATE INDEX IF NOT EXISTS idx_ai_analyses_user_id ON ai_analyses (user_id);
CREATE INDEX IF NOT EXISTS idx_ai_analyses_created_at ON ai_analyses (created_at DESC);
