-- Migration: Recalculate stats for existing matches with own goals
-- Run this in your Supabase SQL Editor
-- This will update the stats table with own_goals from match_events

-- First, ensure the own_goals column exists
ALTER TABLE stats
ADD COLUMN IF NOT EXISTS own_goals INTEGER DEFAULT 0;

-- Update stats table with own goals from match_events
UPDATE stats
SET own_goals = COALESCE((
  SELECT COUNT(*)
  FROM match_events me
  JOIN match_players mp ON mp.match_id = me.match_id
  WHERE mp.id = stats.match_player_id
    AND me.event_type = 'own_goal'
    AND me.scorer = (
      SELECT up.name
      FROM user_profiles up
      JOIN players p ON p.user_profile_id = up.id
      WHERE p.id = mp.player_id
    )
), 0)
WHERE EXISTS (
  SELECT 1
  FROM match_events me
  JOIN match_players mp ON mp.match_id = me.match_id
  WHERE mp.id = stats.match_player_id
    AND me.event_type = 'own_goal'
);

-- Alternative simpler approach: Count own goals by matching player names
-- This updates stats based on match_events where the scorer name matches
UPDATE stats s
SET own_goals = (
  SELECT COUNT(*)
  FROM match_events me
  JOIN match_players mp ON mp.id = s.match_player_id
  JOIN players p ON p.id = mp.player_id
  JOIN user_profiles up ON up.id = p.user_profile_id
  WHERE me.match_id = mp.match_id
    AND me.event_type = 'own_goal'
    AND me.scorer = up.name
)
WHERE EXISTS (
  SELECT 1
  FROM match_events me
  JOIN match_players mp ON mp.id = s.match_player_id
  WHERE me.match_id = mp.match_id
    AND me.event_type = 'own_goal'
);

-- Set own_goals to 0 for all stats that don't have any own goals
UPDATE stats
SET own_goals = 0
WHERE own_goals IS NULL;

-- Verify the update
SELECT
  s.id,
  up.name as player_name,
  s.own_goals,
  (SELECT COUNT(*)
   FROM match_events me
   JOIN match_players mp ON mp.id = s.match_player_id
   WHERE me.match_id = mp.match_id
     AND me.event_type = 'own_goal'
     AND me.scorer = up.name
  ) as calculated_own_goals
FROM stats s
JOIN match_players mp ON mp.id = s.match_player_id
JOIN players p ON p.id = mp.player_id
JOIN user_profiles up ON up.id = p.user_profile_id
WHERE s.own_goals > 0
LIMIT 10;

