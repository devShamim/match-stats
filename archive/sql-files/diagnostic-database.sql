-- Diagnostic Script for Player Statistics
-- Run this in your Supabase SQL Editor to check current database state

-- 1. Check if required tables exist
SELECT
  table_name,
  CASE
    WHEN table_name IN ('match_events', 'teams', 'match_players', 'stats') THEN 'Required'
    ELSE 'Optional'
  END as status
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('matches', 'players', 'user_profiles', 'match_events', 'teams', 'match_players', 'stats')
ORDER BY table_name;

-- 2. Check matches table structure
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'matches'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. Check if match_events table exists and has data
SELECT
  CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'match_events')
    THEN 'EXISTS'
    ELSE 'MISSING'
  END as match_events_table,
  CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'match_events')
    THEN (SELECT COUNT(*)::text FROM match_events)
    ELSE 'N/A'
  END as match_events_count;

-- 4. Check if match_players table exists and has data
SELECT
  CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'match_players')
    THEN 'EXISTS'
    ELSE 'MISSING'
  END as match_players_table,
  CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'match_players')
    THEN (SELECT COUNT(*)::text FROM match_players)
    ELSE 'N/A'
  END as match_players_count;

-- 5. Check if stats table exists and has data
SELECT
  CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'stats')
    THEN 'EXISTS'
    ELSE 'MISSING'
  END as stats_table,
  CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'stats')
    THEN (SELECT COUNT(*)::text FROM stats)
    ELSE 'N/A'
  END as stats_count;

-- 6. Check if teams table exists and has data
SELECT
  CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'teams')
    THEN 'EXISTS'
    ELSE 'MISSING'
  END as teams_table,
  CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'teams')
    THEN (SELECT COUNT(*)::text FROM teams)
    ELSE 'N/A'
  END as teams_count;

-- 7. Check recent matches and their events (if tables exist)
SELECT
  m.id as match_id,
  m.teamA_name,
  m.teamB_name,
  m.score_teama,
  m.score_teamb,
  m.status,
  CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'match_events')
    THEN (SELECT COUNT(*) FROM match_events WHERE match_id = m.id)
    ELSE 0
  END as event_count,
  CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'match_players')
    THEN (SELECT COUNT(*) FROM match_players WHERE match_id = m.id)
    ELSE 0
  END as player_count
FROM matches m
ORDER BY m.created_at DESC
LIMIT 5;

-- 8. Check if players are properly linked to matches (if match_players exists)
SELECT
  mp.match_id,
  p.user_profile.name as player_name,
  t.name as team_name
FROM match_players mp
JOIN players p ON mp.player_id = p.id
JOIN user_profiles up ON p.user_id = up.id
LEFT JOIN teams t ON mp.team_id = t.id
ORDER BY mp.match_id, t.name
LIMIT 10;
