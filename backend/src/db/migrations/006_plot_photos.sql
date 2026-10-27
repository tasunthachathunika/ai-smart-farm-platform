-- Migration 006: Plot Photos Table
-- Stores metadata for uploaded plot photos stored securely in private disk storage

CREATE TABLE IF NOT EXISTS plot_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plot_id UUID NOT NULL REFERENCES plots(id) ON DELETE CASCADE,
  uploader_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  filename VARCHAR(255) NOT NULL,
  thumbnail_filename VARCHAR(255) NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(50) NOT NULL,
  file_size INTEGER NOT NULL,
  width INTEGER,
  height INTEGER,
  caption TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_plot_photos_plot_id ON plot_photos(plot_id);
CREATE INDEX IF NOT EXISTS idx_plot_photos_uploader_id ON plot_photos(uploader_id);
CREATE INDEX IF NOT EXISTS idx_plot_photos_created_at ON plot_photos(created_at DESC);
