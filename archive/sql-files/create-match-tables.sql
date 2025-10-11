-- Essential tables for match player assignments
-- Run this in your Supabase SQL Editor if the match_players table doesn't exist

-- Create teams table if it doesn't exist
CREATE TABLE IF NOT EXISTS teams (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL, -- 'Team A', 'Team B', or custom names
  color TEXT, -- Optional team color
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create match_players table if it doesn't exist
CREATE TABLE IF NOT EXISTS match_players (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE NOT NULL,
  player_id UUID REFERENCES players(id) ON DELETE CASCADE NOT NULL,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE NOT NULL,
  position TEXT, -- Player's position in this specific match
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(match_id, player_id)
);

-- Create stats table if it doesn't exist
CREATE TABLE IF NOT EXISTS stats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  match_player_id UUID REFERENCES match_players(id) ON DELETE CASCADE NOT NULL,
  goals INTEGER DEFAULT 0,
  assists INTEGER DEFAULT 0,
  yellow_cards INTEGER DEFAULT 0,
  red_cards INTEGER DEFAULT 0,
  minutes_played INTEGER DEFAULT 90,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(match_player_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_teams_match_id ON teams(match_id);
CREATE INDEX IF NOT EXISTS idx_match_players_match_id ON match_players(match_id);
CREATE INDEX IF NOT EXISTS idx_match_players_player_id ON match_players(player_id);
CREATE INDEX IF NOT EXISTS idx_stats_match_player_id ON stats(match_player_id);

-- Enable Row Level Security
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE stats ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies for teams
CREATE POLICY "Approved users can view teams" ON teams
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND status = 'approved'
    )
  );

CREATE POLICY "Admins can manage teams" ON teams
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin' AND status = 'approved'
    )
  );

-- Create RLS Policies for match_players
CREATE POLICY "Approved users can view match players" ON match_players
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND status = 'approved'
    )
  );

CREATE POLICY "Admins can manage match players" ON match_players
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin' AND status = 'approved'
    )
  );

-- Create RLS Policies for stats
CREATE POLICY "Approved users can view stats" ON stats
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND status = 'approved'
    )
  );

CREATE POLICY "Admins can manage stats" ON stats
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin' AND status = 'approved'
    )
  );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_stats_updated_at
  BEFORE UPDATE ON stats
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
