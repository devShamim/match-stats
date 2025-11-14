-- Add rating column to the stats table
-- Rating is a decimal value from 0 to 10 representing player performance in a match
ALTER TABLE stats
ADD COLUMN IF NOT EXISTS rating DECIMAL(3,1) DEFAULT NULL CHECK (rating >= 0 AND rating <= 10);

-- Add comment to explain the column
COMMENT ON COLUMN stats.rating IS 'Player performance rating out of 10 for this match. NULL if not yet rated.';

