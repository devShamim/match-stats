-- Diagnostic Script to Check Current Database Structure
-- Run this first to understand your current table structure

-- 1. Check the structure of the teams table
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'teams'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Check if teams table exists and what data it contains
SELECT
  CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'teams')
    THEN 'EXISTS'
    ELSE 'MISSING'
  END as teams_table_status;

-- 3. If teams table exists, show its current data
SELECT * FROM teams LIMIT 5;

-- 4. Check the structure of other related tables
SELECT
  'matches' as table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'matches'
  AND table_schema = 'public'
  AND column_name LIKE '%team%'
ORDER BY ordinal_position;

-- 5. Check if match_players table exists and its structure
SELECT
  CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'match_players')
    THEN 'EXISTS'
    ELSE 'MISSING'
  END as match_players_table_status;

-- 6. Check if match_events table exists
SELECT
  CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'match_events')
    THEN 'EXISTS'
    ELSE 'MISSING'
  END as match_events_table_status;

-- 7. Check if stats table exists
SELECT
  CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'stats')
    THEN 'EXISTS'
    ELSE 'MISSING'
  END as stats_table_status;
