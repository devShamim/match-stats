-- Debug script to check player statistics aggregation
-- Run this in Supabase SQL Editor to see what's happening

-- 1. First, let's check the structure of the players table
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'players'
ORDER BY ordinal_position;

-- 2. Check all stats for Shamim Saj (player ID: 0755965a-8740-4121-80a3-cb793bb94741)
-- Using user_profiles table instead of user_profile column
SELECT
  s.id,
  s.goals,
  s.assists,
  s.yellow_cards,
  s.red_cards,
  s.minutes_played,
  mp.match_id,
  m.date,
  m.teamA_name,
  m.teamB_name,
  up.name as player_name
FROM stats s
JOIN match_players mp ON s.match_player_id = mp.id
JOIN matches m ON mp.match_id = m.id
JOIN players p ON mp.player_id = p.id
JOIN user_profiles up ON p.user_id = up.id
WHERE p.id = '0755965a-8740-4121-80a3-cb793bb94741'
ORDER BY m.date DESC;

-- 3. Check if there are any duplicate stats records
SELECT
  match_player_id,
  COUNT(*) as record_count,
  SUM(goals) as total_goals,
  SUM(assists) as total_assists
FROM stats s
JOIN match_players mp ON s.match_player_id = mp.id
WHERE mp.player_id = '0755965a-8740-4121-80a3-cb793bb94741'
GROUP BY match_player_id
HAVING COUNT(*) > 1;

-- 4. Check the API query structure (simplified)
SELECT
  s.*,
  mp.match_id,
  mp.player_id,
  m.date,
  m.teamA_name,
  m.teamB_name,
  up.name as player_name
FROM stats s
JOIN match_players mp ON s.match_player_id = mp.id
JOIN matches m ON mp.match_id = m.id
JOIN players p ON mp.player_id = p.id
JOIN user_profiles up ON p.user_id = up.id
WHERE mp.player_id = '0755965a-8740-4121-80a3-cb793bb94741';

-- 5. Check if there are any match_events that might be affecting the count
SELECT
  me.event_type,
  me.scorer,
  me.assist,
  me.player,
  m.date,
  m.teamA_name,
  m.teamB_name
FROM match_events me
JOIN matches m ON me.match_id = m.id
WHERE me.match_id IN (
  SELECT DISTINCT mp.match_id
  FROM match_players mp
  WHERE mp.player_id = '0755965a-8740-4121-80a3-cb793bb94741'
)
ORDER BY m.date DESC;
