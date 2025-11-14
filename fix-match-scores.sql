-- Option 1: Update specific matches that have incorrect 0-0 scores
-- Replace the match IDs with the actual IDs you want to fix
-- Example: If you know a match should be 2-1 instead of 0-0

-- UPDATE matches
-- SET score_teamA = 2, score_teamB = 1
-- WHERE id = 'your-match-id-here';

-- Option 2: Find all 0-0 matches and review them
SELECT
  id,
  date,
  teamA_name,
  teamB_name,
  score_teamA,
  score_teamB,
  status,
  created_at
FROM matches
WHERE score_teamA = 0
  AND score_teamB = 0
  AND status = 'completed'
ORDER BY date DESC;

-- Option 3: If you want to set all 0-0 matches to NULL scores (this will disable clean sheet calculation for them)
-- WARNING: This will make those matches appear incomplete
-- UPDATE matches
-- SET score_teamA = NULL, score_teamB = NULL
-- WHERE score_teamA = 0
--   AND score_teamB = 0
--   AND status = 'completed';

