-- Manual Stats Assignment Script
-- Run this AFTER running the complete-database-setup.sql
-- This will manually assign stats to existing matches for testing

-- 1. First, let's see what matches we have
SELECT
  id,
  teamA_name,
  teamB_name,
  score_teama,
  score_teamb,
  status,
  created_at
FROM matches
WHERE status = 'completed'
ORDER BY created_at DESC;

-- 2. Create some sample match events for testing (replace match_id with actual match ID)
-- You'll need to replace 'YOUR_MATCH_ID_HERE' with an actual match ID from step 1

-- Example: Add a goal event
INSERT INTO match_events (match_id, event_type, minute, scorer, assist)
VALUES (
  'YOUR_MATCH_ID_HERE', -- Replace with actual match ID
  'goal',
  15,
  'Player Name 1', -- Replace with actual player name
  'Player Name 2'  -- Replace with actual player name
);

-- Example: Add a card event
INSERT INTO match_events (match_id, event_type, minute, player, card_type)
VALUES (
  'YOUR_MATCH_ID_HERE', -- Replace with actual match ID
  'card',
  30,
  'Player Name 3', -- Replace with actual player name
  'yellow'
);

-- 3. Check if match_players exist for your matches
SELECT
  mp.id as match_player_id,
  mp.match_id,
  up.name as player_name,
  t.name as team_name
FROM match_players mp
JOIN players p ON mp.player_id = p.id
JOIN user_profiles up ON p.user_id = up.id
LEFT JOIN teams t ON mp.team_id = t.id
WHERE mp.match_id = 'YOUR_MATCH_ID_HERE' -- Replace with actual match ID
ORDER BY t.name, up.name;

-- 4. If no match_players exist, create them manually
-- First, get the default teams
SELECT id, name FROM teams WHERE name IN ('Team A', 'Team B');

-- Then create match_players entries (replace IDs with actual values)
INSERT INTO match_players (match_id, player_id, team_id)
VALUES
  ('YOUR_MATCH_ID', 'PLAYER_ID_1', 'TEAM_A_ID'),
  ('YOUR_MATCH_ID', 'PLAYER_ID_2', 'TEAM_A_ID'),
  ('YOUR_MATCH_ID', 'PLAYER_ID_3', 'TEAM_B_ID'),
  ('YOUR_MATCH_ID', 'PLAYER_ID_4', 'TEAM_B_ID')
ON CONFLICT (match_id, player_id) DO NOTHING;

-- 5. After creating match_events and match_players, trigger stats assignment
-- This will be done automatically when you save match details in the UI,
-- but you can also call the API manually

-- 6. Check the generated stats
SELECT
  s.id,
  s.goals,
  s.assists,
  s.yellow_cards,
  s.red_cards,
  s.minutes_played,
  up.name as player_name,
  m.teamA_name,
  m.teamB_name
FROM stats s
JOIN match_players mp ON s.match_player_id = mp.id
JOIN players p ON mp.player_id = p.id
JOIN user_profiles up ON p.user_id = up.id
JOIN matches m ON mp.match_id = m.id
ORDER BY s.created_at DESC;
