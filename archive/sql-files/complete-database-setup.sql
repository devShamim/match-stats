-- Complete Database Setup for Player Statistics
-- Run this in your Supabase SQL Editor

-- 1. Create match_events table (if it doesn't exist)
CREATE TABLE IF NOT EXISTS match_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  event_type VARCHAR(20) NOT NULL CHECK (event_type IN ('goal', 'card', 'substitution')),
  minute INTEGER,
  scorer VARCHAR(255),
  assist VARCHAR(255),
  player VARCHAR(255),
  card_type VARCHAR(10) CHECK (card_type IN ('yellow', 'red')),
  player_in VARCHAR(255),
  player_out VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create teams table (if it doesn't exist)
CREATE TABLE IF NOT EXISTS teams (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  color VARCHAR(7) DEFAULT '#3B82F6',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create match_players table (if it doesn't exist)
CREATE TABLE IF NOT EXISTS match_players (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(match_id, player_id)
);

-- 4. Create stats table (if it doesn't exist)
CREATE TABLE IF NOT EXISTS stats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  match_player_id UUID NOT NULL REFERENCES match_players(id) ON DELETE CASCADE,
  goals INTEGER DEFAULT 0,
  assists INTEGER DEFAULT 0,
  yellow_cards INTEGER DEFAULT 0,
  red_cards INTEGER DEFAULT 0,
  minutes_played INTEGER DEFAULT 90,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(match_player_id)
);

-- 5. Add missing columns to matches table
DO $$
BEGIN
  -- Add team names if they don't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'matches' AND column_name = 'teamA_name') THEN
    ALTER TABLE matches ADD COLUMN teamA_name VARCHAR(255) DEFAULT 'Team A';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'matches' AND column_name = 'teamB_name') THEN
    ALTER TABLE matches ADD COLUMN teamB_name VARCHAR(255) DEFAULT 'Team B';
  END IF;

  -- Add team colors if they don't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'matches' AND column_name = 'teamA_color') THEN
    ALTER TABLE matches ADD COLUMN teamA_color VARCHAR(7) DEFAULT '#3B82F6';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'matches' AND column_name = 'teamB_color') THEN
    ALTER TABLE matches ADD COLUMN teamB_color VARCHAR(7) DEFAULT '#EF4444';
  END IF;

  -- Add match summary if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'matches' AND column_name = 'match_summary') THEN
    ALTER TABLE matches ADD COLUMN match_summary TEXT;
  END IF;

  -- Add statistics columns if they don't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'matches' AND column_name = 'possession_teama') THEN
    ALTER TABLE matches ADD COLUMN possession_teama INTEGER DEFAULT 50;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'matches' AND column_name = 'possession_teamb') THEN
    ALTER TABLE matches ADD COLUMN possession_teamb INTEGER DEFAULT 50;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'matches' AND column_name = 'shots_teama') THEN
    ALTER TABLE matches ADD COLUMN shots_teama INTEGER DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'matches' AND column_name = 'shots_teamb') THEN
    ALTER TABLE matches ADD COLUMN shots_teamb INTEGER DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'matches' AND column_name = 'shots_on_target_teama') THEN
    ALTER TABLE matches ADD COLUMN shots_on_target_teama INTEGER DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'matches' AND column_name = 'shots_on_target_teamb') THEN
    ALTER TABLE matches ADD COLUMN shots_on_target_teamb INTEGER DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'matches' AND column_name = 'fouls_teama') THEN
    ALTER TABLE matches ADD COLUMN fouls_teama INTEGER DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'matches' AND column_name = 'fouls_teamb') THEN
    ALTER TABLE matches ADD COLUMN fouls_teamb INTEGER DEFAULT 0;
  END IF;
END $$;

-- 6. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_match_events_match_id ON match_events(match_id);
CREATE INDEX IF NOT EXISTS idx_match_events_event_type ON match_events(event_type);
CREATE INDEX IF NOT EXISTS idx_match_players_match_id ON match_players(match_id);
CREATE INDEX IF NOT EXISTS idx_match_players_player_id ON match_players(player_id);
CREATE INDEX IF NOT EXISTS idx_stats_match_player_id ON stats(match_player_id);

-- 7. Enable Row Level Security (RLS)
ALTER TABLE match_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE stats ENABLE ROW LEVEL SECURITY;

-- 8. Create RLS policies
-- Allow everyone to read match events
CREATE POLICY "Anyone can read match events" ON match_events
  FOR SELECT USING (true);

-- Allow admins to insert/update/delete match events
CREATE POLICY "Admins can manage match events" ON match_events
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- Allow everyone to read teams
CREATE POLICY "Anyone can read teams" ON teams
  FOR SELECT USING (true);

-- Allow admins to manage teams
CREATE POLICY "Admins can manage teams" ON teams
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- Allow everyone to read match players
CREATE POLICY "Anyone can read match players" ON match_players
  FOR SELECT USING (true);

-- Allow admins to manage match players
CREATE POLICY "Admins can manage match players" ON match_players
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- Allow everyone to read stats
CREATE POLICY "Anyone can read stats" ON stats
  FOR SELECT USING (true);

-- Allow admins to manage stats
CREATE POLICY "Admins can manage stats" ON stats
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- 9. Create default teams if they don't exist
INSERT INTO teams (id, name, color) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Team A', '#3B82F6'),
  ('00000000-0000-0000-0000-000000000002', 'Team B', '#EF4444')
ON CONFLICT (id) DO NOTHING;

-- 10. Create triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_match_events_updated_at BEFORE UPDATE ON match_events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON teams
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_match_players_updated_at BEFORE UPDATE ON match_players
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_stats_updated_at BEFORE UPDATE ON stats
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 11. Verify the setup
SELECT
  'match_events' as table_name,
  COUNT(*) as row_count
FROM match_events
UNION ALL
SELECT
  'teams' as table_name,
  COUNT(*) as row_count
FROM teams
UNION ALL
SELECT
  'match_players' as table_name,
  COUNT(*) as row_count
FROM match_players
UNION ALL
SELECT
  'stats' as table_name,
  COUNT(*) as row_count
FROM stats;
