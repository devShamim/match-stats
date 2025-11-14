-- Migration: Add Own Goals Support
-- Run this in your Supabase SQL Editor

-- Add own_goals column to stats table
ALTER TABLE stats
ADD COLUMN IF NOT EXISTS own_goals INTEGER DEFAULT 0;

-- Update existing records to have 0 own goals
UPDATE stats
SET own_goals = 0
WHERE own_goals IS NULL;

-- Add comment to document the column
COMMENT ON COLUMN stats.own_goals IS 'Number of own goals scored by the player (counts negatively in statistics)';

