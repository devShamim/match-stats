-- Check which matches are contributing to clean sheets
-- This shows all matches where defenders would get automatic clean sheet credit

SELECT
  m.id as match_id,
  m.date,
  m.teamA_name,
  m.teamB_name,
  m.score_teamA,
  m.score_teamB,
  m.status,
  CASE
    WHEN m.score_teamB = 0 THEN 'Team A kept clean sheet'
    WHEN m.score_teamA = 0 THEN 'Team B kept clean sheet'
    WHEN m.score_teamA = 0 AND m.score_teamB = 0 THEN 'Both teams kept clean sheet (0-0 draw)'
    ELSE 'No clean sheet'
  END as clean_sheet_status,
  COUNT(DISTINCT mp.id) as defenders_count
FROM matches m
INNER JOIN match_players mp ON m.id = mp.match_id
INNER JOIN players p ON mp.player_id = p.id
INNER JOIN user_profiles up ON p.user_id = up.id
WHERE m.status = 'completed'
  AND m.score_teamA IS NOT NULL
  AND m.score_teamB IS NOT NULL
  AND (
    (m.score_teamB = 0) OR  -- Team A kept clean sheet
    (m.score_teamA = 0)      -- Team B kept clean sheet
  )
  AND (
    LOWER(up.position) LIKE '%defender%' OR
    LOWER(up.position) LIKE '%cb%' OR
    LOWER(up.position) LIKE '%lb%' OR
    LOWER(up.position) LIKE '%rb%' OR
    LOWER(up.position) LIKE '%lwb%' OR
    LOWER(up.position) LIKE '%rwb%' OR
    LOWER(up.position) LIKE '%sw%' OR
    LOWER(up.position) LIKE '%cdm%' OR
    LOWER(p.preferred_position) LIKE '%defender%' OR
    LOWER(p.preferred_position) LIKE '%cb%' OR
    LOWER(p.preferred_position) LIKE '%lb%' OR
    LOWER(p.preferred_position) LIKE '%rb%' OR
    LOWER(p.preferred_position) LIKE '%lwb%' OR
    LOWER(p.preferred_position) LIKE '%rwb%' OR
    LOWER(p.preferred_position) LIKE '%sw%' OR
    LOWER(p.preferred_position) LIKE '%cdm%' OR
    LOWER(mp.position) LIKE '%defender%' OR
    LOWER(mp.position) LIKE '%cb%' OR
    LOWER(mp.position) LIKE '%lb%' OR
    LOWER(mp.position) LIKE '%rb%' OR
    LOWER(mp.position) LIKE '%lwb%' OR
    LOWER(mp.position) LIKE '%rwb%' OR
    LOWER(mp.position) LIKE '%sw%' OR
    LOWER(mp.position) LIKE '%cdm%'
  )
GROUP BY m.id, m.date, m.teamA_name, m.teamB_name, m.score_teamA, m.score_teamB, m.status
ORDER BY m.date DESC;

