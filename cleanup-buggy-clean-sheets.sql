-- Clean up incorrectly added clean sheet events from the bug
-- This script removes clean sheet events where the player didn't actually play in that match

-- Option 1: Delete clean sheet events where player didn't play in the match
-- This is the safest option - it only removes incorrectly added ones
DELETE FROM match_events
WHERE event_type = 'clean_sheet'
  AND NOT EXISTS (
    -- Check if the player actually played in this match
    SELECT 1
    FROM match_players mp
    INNER JOIN players p ON mp.player_id = p.id
    INNER JOIN user_profiles up ON p.user_id = up.id
    WHERE mp.match_id = match_events.match_id
      AND up.name = match_events.player
  );

-- Option 2: If you want to see what will be deleted first (RECOMMENDED - run this first to preview)
-- Uncomment the lines below to see the count and details before deleting

-- SELECT
--   me.id,
--   me.match_id,
--   me.player,
--   m.date as match_date,
--   CASE
--     WHEN EXISTS (
--       SELECT 1
--       FROM match_players mp
--       INNER JOIN players p ON mp.player_id = p.id
--       INNER JOIN user_profiles up ON p.user_id = up.id
--       WHERE mp.match_id = me.match_id
--         AND up.name = me.player
--     ) THEN 'VALID - Player played in match'
--     ELSE 'INVALID - Player did NOT play in match'
--   END as status
-- FROM match_events me
-- INNER JOIN matches m ON me.match_id = m.id
-- WHERE me.event_type = 'clean_sheet'
-- ORDER BY m.date DESC;

-- Option 3: Nuclear option - Delete ALL clean sheet events (use with caution!)
-- This will remove all clean sheets, including manually added ones
-- The system will recalculate them automatically with the fixed code
-- Uncomment only if you want to start fresh:

-- DELETE FROM match_events WHERE event_type = 'clean_sheet';

