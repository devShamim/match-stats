-- Migration: Fix match_events table for own goals
-- Run this in your Supabase SQL Editor
-- IMPORTANT: After running, wait 10-20 seconds for Supabase to refresh its schema cache

-- Step 1: Add goal_type column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'match_events' AND column_name = 'goal_type'
    ) THEN
        ALTER TABLE match_events
        ADD COLUMN goal_type TEXT DEFAULT 'normal';

        -- Add CHECK constraint for goal_type
        ALTER TABLE match_events
        ADD CONSTRAINT match_events_goal_type_check
        CHECK (goal_type IS NULL OR goal_type IN ('normal', 'own_goal'));
    END IF;
END $$;

-- Step 2: Update existing goal records
UPDATE match_events
SET goal_type = 'normal'
WHERE event_type = 'goal' AND (goal_type IS NULL OR goal_type = '');

-- Step 3: Drop ALL existing event_type CHECK constraints
DO $$
DECLARE
    constraint_rec RECORD;
BEGIN
    -- Find and drop any existing event_type check constraint
    FOR constraint_rec IN
        SELECT constraint_name
        FROM information_schema.table_constraints
        WHERE table_name = 'match_events'
        AND constraint_type = 'CHECK'
        AND constraint_name LIKE '%event_type%'
    LOOP
        EXECUTE 'ALTER TABLE match_events DROP CONSTRAINT IF EXISTS ' || quote_ident(constraint_rec.constraint_name);
        RAISE NOTICE 'Dropped constraint: %', constraint_rec.constraint_name;
    END LOOP;
END $$;

-- Step 4: Add the new constraint that includes 'own_goal'
ALTER TABLE match_events
ADD CONSTRAINT match_events_event_type_check
CHECK (event_type IN ('goal', 'own_goal', 'card', 'substitution', 'save', 'clean_sheet'));

-- Step 5: Add comment
COMMENT ON COLUMN match_events.goal_type IS 'Type of goal: normal or own_goal. Only applicable for goal and own_goal event types.';

-- Step 6: Verify the changes
SELECT
    'Columns:' as info,
    column_name,
    data_type,
    column_default
FROM information_schema.columns
WHERE table_name = 'match_events'
AND column_name IN ('event_type', 'goal_type')
ORDER BY column_name;

SELECT
    'Constraints:' as info,
    constraint_name,
    check_clause
FROM information_schema.check_constraints
WHERE constraint_name LIKE '%match_events%event_type%'
   OR constraint_name LIKE '%match_events%goal_type%';
