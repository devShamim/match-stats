-- Quick fix: Clear any duplicate or incorrect stats records
-- Run this in Supabase SQL Editor

-- 1. Check current stats for Shamim Saj
SELECT
  s.id as stats_id,
  s.goals,
  s.assists,
  s.yellow_cards,
  s.red_cards,
  mp.match_id,
  m.date,
  up.name as player_name
FROM stats s
JOIN match_players mp ON s.match_player_id = mp.id
JOIN matches m ON mp.match_id = m.id
JOIN players p ON mp.player_id = p.id
JOIN user_profiles up ON p.user_id = up.id
WHERE p.id = '0755965a-8740-4121-80a3-cb793bb94741'
ORDER BY m.date DESC;

-- 2. If there are multiple stats records, keep only the latest one
-- (This will fix any duplicate stats issues)
WITH latest_stats AS (
  SELECT DISTINCT ON (mp.id)
    s.id as stats_id,
    mp.id as match_player_id,
    s.goals,
    s.assists,
    s.yellow_cards,
    s.red_cards,
    s.minutes_played,
    s.created_at
  FROM stats s
  JOIN match_players mp ON s.match_player_id = mp.id
  WHERE mp.player_id = '0755965a-8740-4121-80a3-cb793bb94741'
  ORDER BY mp.id, s.created_at DESC
)
DELETE FROM stats
WHERE id NOT IN (SELECT stats_id FROM latest_stats)
AND id IN (
  SELECT s.id
  FROM stats s
  JOIN match_players mp ON s.match_player_id = mp.id
  WHERE mp.player_id = '0755965a-8740-4121-80a3-cb793bb94741'
);

-- 3. Verify the fix
SELECT
  'After cleanup:' as status,
  COUNT(*) as stats_records,
  SUM(s.goals) as total_goals,
  SUM(s.assists) as total_assists
FROM stats s
JOIN match_players mp ON s.match_player_id = mp.id
WHERE mp.player_id = '0755965a-8740-4121-80a3-cb793bb94741';
