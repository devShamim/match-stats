-- Tournament Feature Migration
-- Run this SQL in your Supabase SQL Editor

-- 1. Persistent Teams Table
CREATE TABLE IF NOT EXISTS persistent_teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  logo_url TEXT,
  color TEXT,
  captain_id UUID REFERENCES players(id),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. Team Players (Many-to-Many)
CREATE TABLE IF NOT EXISTS team_players (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID REFERENCES persistent_teams(id) ON DELETE CASCADE,
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  jersey_number INTEGER,
  position TEXT,
  is_captain BOOLEAN DEFAULT FALSE,
  joined_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(team_id, player_id)
);

-- 3. Tournaments Table
CREATE TABLE IF NOT EXISTS tournaments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL DEFAULT 'round_robin', -- 'round_robin', 'knockout', 'hybrid'
  status TEXT NOT NULL DEFAULT 'draft', -- 'draft', 'registration', 'in_progress', 'completed', 'cancelled'
  start_date TIMESTAMP,
  end_date TIMESTAMP,
  max_teams INTEGER,
  min_players_per_team INTEGER DEFAULT 5,
  max_players_per_team INTEGER DEFAULT 6,
  points_per_win INTEGER DEFAULT 3,
  points_per_draw INTEGER DEFAULT 1,
  points_per_loss INTEGER DEFAULT 0,
  prize_structure JSONB,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 4. Tournament Teams (Junction)
CREATE TABLE IF NOT EXISTS tournament_teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE,
  team_id UUID REFERENCES persistent_teams(id) ON DELETE CASCADE,
  group_name TEXT,
  seed INTEGER,
  status TEXT DEFAULT 'registered', -- 'registered', 'active', 'eliminated', 'withdrawn'
  registered_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(tournament_id, team_id)
);

-- 5. Extend Matches Table for Tournaments
ALTER TABLE matches
  ADD COLUMN IF NOT EXISTS tournament_id UUID REFERENCES tournaments(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS round TEXT,
  ADD COLUMN IF NOT EXISTS is_fixture BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS fixture_order INTEGER;

-- 6. Tournament Standings
CREATE TABLE IF NOT EXISTS tournament_standings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE,
  team_id UUID REFERENCES persistent_teams(id) ON DELETE CASCADE,
  group_name TEXT,
  matches_played INTEGER DEFAULT 0,
  wins INTEGER DEFAULT 0,
  draws INTEGER DEFAULT 0,
  losses INTEGER DEFAULT 0,
  goals_for INTEGER DEFAULT 0,
  goals_against INTEGER DEFAULT 0,
  goal_difference INTEGER DEFAULT 0,
  points INTEGER DEFAULT 0,
  position INTEGER,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Unique constraint for tournament_standings (handles NULL group_name properly)
-- PostgreSQL treats NULL as distinct, so we use a unique index with COALESCE
CREATE UNIQUE INDEX IF NOT EXISTS idx_tournament_standings_unique
ON tournament_standings(tournament_id, team_id, COALESCE(group_name, ''));

-- 7. Tournament Player Statistics
CREATE TABLE IF NOT EXISTS tournament_player_stats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE,
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  team_id UUID REFERENCES persistent_teams(id) ON DELETE CASCADE,
  matches_played INTEGER DEFAULT 0,
  goals INTEGER DEFAULT 0,
  assists INTEGER DEFAULT 0,
  clean_sheets INTEGER DEFAULT 0,
  saves INTEGER DEFAULT 0,
  yellow_cards INTEGER DEFAULT 0,
  red_cards INTEGER DEFAULT 0,
  average_rating DECIMAL(3,1),
  unified_score DECIMAL(10,2) DEFAULT 0,
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(tournament_id, player_id, team_id)
);

-- 8. Tournament Prizes
CREATE TABLE IF NOT EXISTS tournament_prizes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE,
  category TEXT NOT NULL, -- 'team_rank', 'top_scorer', 'best_defender', 'most_assists', 'best_goalkeeper', 'mvp'
  rank INTEGER,
  recipient_type TEXT NOT NULL, -- 'team' or 'player'
  recipient_team_id UUID REFERENCES persistent_teams(id),
  recipient_player_id UUID REFERENCES players(id),
  prize_amount DECIMAL(10,2),
  prize_description TEXT,
  awarded_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_tournament_teams_tournament ON tournament_teams(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_teams_team ON tournament_teams(team_id);
CREATE INDEX IF NOT EXISTS idx_tournament_standings_tournament ON tournament_standings(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_standings_team ON tournament_standings(team_id);
CREATE INDEX IF NOT EXISTS idx_tournament_player_stats_tournament ON tournament_player_stats(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_player_stats_player ON tournament_player_stats(player_id);
CREATE INDEX IF NOT EXISTS idx_matches_tournament ON matches(tournament_id);
CREATE INDEX IF NOT EXISTS idx_team_players_team ON team_players(team_id);
CREATE INDEX IF NOT EXISTS idx_team_players_player ON team_players(player_id);

-- Row Level Security Policies

-- Persistent Teams: Admins can do everything, players can read
ALTER TABLE persistent_teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage persistent teams"
  ON persistent_teams FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
      AND user_profiles.status = 'approved'
    )
  );

CREATE POLICY "Players can view persistent teams"
  ON persistent_teams FOR SELECT
  USING (true);

-- Team Players: Admins can manage, players can view
ALTER TABLE team_players ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage team players"
  ON team_players FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
      AND user_profiles.status = 'approved'
    )
  );

CREATE POLICY "Players can view team players"
  ON team_players FOR SELECT
  USING (true);

-- Tournaments: Admins can manage, players can view
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage tournaments"
  ON tournaments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
      AND user_profiles.status = 'approved'
    )
  );

CREATE POLICY "Players can view tournaments"
  ON tournaments FOR SELECT
  USING (true);

-- Tournament Teams: Admins can manage, players can view
ALTER TABLE tournament_teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage tournament teams"
  ON tournament_teams FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
      AND user_profiles.status = 'approved'
    )
  );

CREATE POLICY "Players can view tournament teams"
  ON tournament_teams FOR SELECT
  USING (true);

-- Tournament Standings: Everyone can view
ALTER TABLE tournament_standings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage tournament standings"
  ON tournament_standings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
      AND user_profiles.status = 'approved'
    )
  );

CREATE POLICY "Everyone can view tournament standings"
  ON tournament_standings FOR SELECT
  USING (true);

-- Tournament Player Stats: Everyone can view
ALTER TABLE tournament_player_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage tournament player stats"
  ON tournament_player_stats FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
      AND user_profiles.status = 'approved'
    )
  );

CREATE POLICY "Everyone can view tournament player stats"
  ON tournament_player_stats FOR SELECT
  USING (true);

-- Tournament Prizes: Everyone can view
ALTER TABLE tournament_prizes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage tournament prizes"
  ON tournament_prizes FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
      AND user_profiles.status = 'approved'
    )
  );

CREATE POLICY "Everyone can view tournament prizes"
  ON tournament_prizes FOR SELECT
  USING (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_persistent_teams_updated_at
  BEFORE UPDATE ON persistent_teams
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tournaments_updated_at
  BEFORE UPDATE ON tournaments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
