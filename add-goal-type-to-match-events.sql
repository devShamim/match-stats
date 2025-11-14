-- Migration: Add goal_type column and own_goal event type to match_events table
-- Run this in your Supabase SQL Editor

-- Step 1: Add goal_type column to match_events table
ALTER TABLE match_events
ADD COLUMN IF NOT EXISTS goal_type TEXT DEFAULT 'normal' CHECK (goal_type IN ('normal', 'own_goal'));

-- Step 2: Update existing goal records to have 'normal' as default
UPDATE match_events
SET goal_type = 'normal'
WHERE event_type = 'goal' AND goal_type IS NULL;

-- Step 3: Update the event_type CHECK constraint to include 'own_goal'
-- First, drop the existing constraint if it exists
ALTER TABLE match_events
DROP CONSTRAINT IF EXISTS match_events_event_type_check;

-- Add the new constraint that includes 'own_goal'
ALTER TABLE match_events
ADD CONSTRAINT match_events_event_type_check
CHECK (event_type IN ('goal', 'own_goal', 'card', 'substitution', 'save', 'clean_sheet'));

-- Step 4: Add comment to document the column
COMMENT ON COLUMN match_events.goal_type IS 'Type of goal: normal or own_goal. Only applicable for goal and own_goal event types.';

