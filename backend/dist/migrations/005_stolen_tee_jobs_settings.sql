-- Stolen Tee: Add Jobs and Settings tables for AI extraction workflow
-- This migration adds support for logo extraction jobs and admin settings

-- Settings table for storing system configuration
CREATE TABLE IF NOT EXISTS settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key VARCHAR(255) UNIQUE NOT NULL,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index on settings key for fast lookups
CREATE INDEX IF NOT EXISTS idx_settings_key ON settings(key);

-- Jobs table for tracking logo extraction jobs
CREATE TABLE IF NOT EXISTS jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  upload_asset_id UUID REFERENCES assets(id) ON DELETE SET NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'queued', -- 'queued', 'running', 'done', 'error'
  logs TEXT,
  error_message TEXT,
  result_data JSONB DEFAULT '{}'::jsonb, -- Store asset IDs and metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for jobs table
CREATE INDEX IF NOT EXISTS idx_jobs_user_id ON jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON jobs(created_at DESC);

-- Add constraint to validate status values
ALTER TABLE jobs ADD CONSTRAINT check_job_status
  CHECK (status IN ('queued', 'running', 'done', 'error'));

-- Update assets table to support new asset kinds for Stolen Tee
-- Add kind column if it doesn't exist
ALTER TABLE assets ADD COLUMN IF NOT EXISTS kind VARCHAR(50) DEFAULT 'upload';

-- Add constraint to validate kind values
DO $$
BEGIN
  -- Drop old constraint if it exists
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_asset_kind'
  ) THEN
    ALTER TABLE assets DROP CONSTRAINT check_asset_kind;
  END IF;

  -- Add new constraint with updated kinds
  ALTER TABLE assets ADD CONSTRAINT check_asset_kind
    CHECK (kind IN ('original', 'white_bg', 'mask', 'transparent', 'proof', 'bundle', 'upload'));
END $$;

-- Add job_id column to assets to link extracted assets to jobs
ALTER TABLE assets ADD COLUMN IF NOT EXISTS job_id UUID REFERENCES jobs(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_assets_job_id ON assets(job_id);

-- Insert default Gemini prompt setting
INSERT INTO settings (key, value)
VALUES (
  'gemini_extraction_prompt',
  '{
    "prompt": "You are a precision artwork extractor. Your task is to isolate and faithfully recreate the exact graphic design printed on a photographed shirt. Follow these rules strictly.\n\nInput: one photo that shows a shirt with a visible printed graphic. The shirt may be wrinkled or rotated. Lighting and perspective may vary.\n\nGoal: produce an exact one to one recreation of only the printed design, with perfect geometry, typography, colors, edges, and proportions. No shadows. No fabric texture. No wrinkles. No moire. No background.\n\nSteps:\n1. Analyze the photo and identify the printed design region. Correct for perspective and rotation so the design is front facing and orthographic.\n2. Recreate the design digitally with pixel perfect fidelity. Preserve original color values and gradients. Preserve exact character shapes and spacing. If parts are occluded by folds, infer the most likely completion using symmetry and typography rules. Do not add creative detail.\n3. Render the result on a pure white background at the highest resolution supported. Prefer at least 4000 pixels on the long edge if the input allows.\n4. Export PNG with no compression artifacts. Do not include the shirt or any background elements.\n\nOutput: return a single PNG image with the recreated design on a pure white background."
  }'::jsonb
)
ON CONFLICT (key) DO NOTHING;

-- Insert placeholder for Gemini API key
INSERT INTO settings (key, value)
VALUES (
  'gemini_api_key',
  '{"api_key": ""}'::jsonb
)
ON CONFLICT (key) DO NOTHING;

-- Insert placeholder for RemBG endpoint
INSERT INTO settings (key, value)
VALUES (
  'rembg_endpoint',
  '{"endpoint": "http://localhost:5000"}'::jsonb
)
ON CONFLICT (key) DO NOTHING;

-- Create a function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at columns
CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_jobs_updated_at BEFORE UPDATE ON jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE settings IS 'System configuration and admin settings for Stolen Tee';
COMMENT ON TABLE jobs IS 'Logo extraction job queue and status tracking';
COMMENT ON COLUMN jobs.result_data IS 'JSON containing extracted asset IDs: {white_bg_asset_id, mask_asset_id, transparent_asset_id}';
COMMENT ON COLUMN assets.job_id IS 'Reference to the extraction job that created this asset';
