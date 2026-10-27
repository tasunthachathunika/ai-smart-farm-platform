-- Migration 007: Weather Data Cache Table
-- Stores cached weather forecasts from Open-Meteo by district coordinates

CREATE TABLE IF NOT EXISTS weather_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  district VARCHAR(100) NOT NULL UNIQUE,
  plot_id UUID REFERENCES plots(id) ON DELETE SET NULL,
  data JSONB NOT NULL,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_weather_data_district ON weather_data (district);
CREATE INDEX IF NOT EXISTS idx_weather_data_fetched_at ON weather_data (fetched_at DESC);
