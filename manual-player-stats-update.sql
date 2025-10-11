-- Manual Player Stats Update SQL Queries
-- Run these in your Supabase SQL Editor

-- ============================================
-- 1. VIEW CURRENT PLAYER STATS
-- ============================================
-- Use this to see current stats for all players
SELECT
    p.id as player_id,
    up.name as player_name,
    up.email,
    COUNT(DISTINCT mp.match_id) as matches_played,
    COALESCE(SUM(s.goals), 0) as total_goals,
    COALESCE(SUM(s.assists), 0) as total_assists,
    COALESCE(SUM(s.yellow_cards), 0) as total_yellow_cards,
    COALESCE(SUM(s.red_cards), 0) as total_red_cards,
    COALESCE(SUM(s.minutes_played), 0) as total_minutes
FROM players p
JOIN user_profiles up ON p.user_id = up.id
LEFT JOIN match_players mp ON p.id = mp.player_id
LEFT JOIN stats s ON mp.id = s.match_player_id
WHERE up.status = 'approved'
GROUP BY p.id, up.name, up.email
ORDER BY total_goals DESC, matches_played DESC;

-- ============================================
-- 2. UPDATE GOALS FOR SPECIFIC PLAYER
-- ============================================
-- Replace 'PLAYER_EMAIL_HERE' with actual player email
-- Replace 'MATCH_ID_HERE' with actual match ID
-- Replace GOALS_COUNT with number of goals

-- First, find the player and match_player_id
WITH player_match AS (
    SELECT
        mp.id as match_player_id,
        up.name as player_name,
        m.date as match_date,
        s.goals as current_goals
    FROM players p
    JOIN user_profiles up ON p.user_id = up.id
    JOIN match_players mp ON p.id = mp.player_id
    JOIN matches m ON mp.match_id = m.id
    LEFT JOIN stats s ON mp.id = s.match_player_id
    WHERE up.email = 'PLAYER_EMAIL_HERE'
    AND m.id = 'MATCH_ID_HERE'
)
-- Update the goals
UPDATE stats
SET
    goals = GOALS_COUNT,
    updated_at = NOW()
WHERE match_player_id = (
    SELECT match_player_id FROM player_match
);

-- ============================================
-- 3. ADD NEW STATS RECORD FOR PLAYER IN MATCH
-- ============================================
-- Use this if the player doesn't have stats for a specific match yet
-- Replace the values below with actual data

INSERT INTO stats (
    match_player_id,
    goals,
    assists,
    yellow_cards,
    red_cards,
    minutes_played
) VALUES (
    'MATCH_PLAYER_ID_HERE',  -- Get this from match_players table
    GOALS_COUNT,             -- Number of goals
    ASSISTS_COUNT,           -- Number of assists
    YELLOW_CARDS_COUNT,      -- Number of yellow cards
    RED_CARDS_COUNT,         -- Number of red cards
    MINUTES_PLAYED           -- Minutes played (default 90)
);

-- ============================================
-- 4. FIND MATCH_PLAYER_ID FOR SPECIFIC PLAYER AND MATCH
-- ============================================
-- Use this to get the match_player_id needed for updates
SELECT
    mp.id as match_player_id,
    up.name as player_name,
    up.email as player_email,
    m.date as match_date,
    m.type as match_type,
    t.name as team_name
FROM players p
JOIN user_profiles up ON p.user_id = up.id
JOIN match_players mp ON p.id = mp.player_id
JOIN matches m ON mp.match_id = m.id
JOIN teams t ON mp.team_id = t.id
WHERE up.email = 'PLAYER_EMAIL_HERE'  -- Replace with actual email
AND m.id = 'MATCH_ID_HERE';           -- Replace with actual match ID

-- ============================================
-- 5. BULK UPDATE MULTIPLE PLAYERS' GOALS
-- ============================================
-- Update goals for multiple players in one query
-- Replace the values in the CASE statements

UPDATE stats
SET
    goals = CASE
        WHEN match_player_id = 'MATCH_PLAYER_ID_1' THEN GOALS_FOR_PLAYER_1
        WHEN match_player_id = 'MATCH_PLAYER_ID_2' THEN GOALS_FOR_PLAYER_2
        WHEN match_player_id = 'MATCH_PLAYER_ID_3' THEN GOALS_FOR_PLAYER_3
        -- Add more cases as needed
        ELSE goals
    END,
    updated_at = NOW()
WHERE match_player_id IN (
    'MATCH_PLAYER_ID_1',
    'MATCH_PLAYER_ID_2',
    'MATCH_PLAYER_ID_3'
    -- Add more match_player_ids as needed
);

-- ============================================
-- 6. UPDATE PLAYER STATS BY PLAYER NAME
-- ============================================
-- Update goals for a player by name (be careful with duplicate names)
UPDATE stats
SET
    goals = GOALS_COUNT,
    assists = ASSISTS_COUNT,
    updated_at = NOW()
WHERE match_player_id IN (
    SELECT mp.id
    FROM players p
    JOIN user_profiles up ON p.user_id = up.id
    JOIN match_players mp ON p.id = mp.player_id
    JOIN matches m ON mp.match_id = m.id
    WHERE up.name = 'PLAYER_NAME_HERE'  -- Replace with actual name
    AND m.id = 'MATCH_ID_HERE'         -- Replace with actual match ID
);

-- ============================================
-- 7. DELETE STATS RECORD
-- ============================================
-- Use this to remove stats for a player in a specific match
DELETE FROM stats
WHERE match_player_id = 'MATCH_PLAYER_ID_HERE';

-- ============================================
-- 8. VERIFY UPDATES
-- ============================================
-- Run this after making updates to verify changes
SELECT
    up.name as player_name,
    m.date as match_date,
    s.goals,
    s.assists,
    s.yellow_cards,
    s.red_cards,
    s.minutes_played,
    s.updated_at
FROM stats s
JOIN match_players mp ON s.match_player_id = mp.id
JOIN players p ON mp.player_id = p.id
JOIN user_profiles up ON p.user_id = up.id
JOIN matches m ON mp.match_id = m.id
WHERE up.email = 'PLAYER_EMAIL_HERE'  -- Replace with actual email
ORDER BY m.date DESC;

-- ============================================
-- 9. EMERGENCY: RESET ALL STATS FOR A PLAYER
-- ============================================
-- Use with caution - this will reset ALL stats for a player
UPDATE stats
SET
    goals = 0,
    assists = 0,
    yellow_cards = 0,
    red_cards = 0,
    minutes_played = 90,
    updated_at = NOW()
WHERE match_player_id IN (
    SELECT mp.id
    FROM players p
    JOIN user_profiles up ON p.user_id = up.id
    JOIN match_players mp ON p.id = mp.player_id
    WHERE up.email = 'PLAYER_EMAIL_HERE'  -- Replace with actual email
);

-- ============================================
-- USAGE INSTRUCTIONS:
-- ============================================
-- 1. First run query #1 to see current stats
-- 2. Use query #4 to find match_player_id for specific player/match
-- 3. Use query #2 or #6 to update goals
-- 4. Use query #8 to verify your changes
-- 5. Always backup your data before making changes!
