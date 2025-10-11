-- Add missing columns to matches table for match details
-- Run this in your Supabase SQL Editor

-- Add team name and color columns to matches table
ALTER TABLE matches
ADD COLUMN IF NOT EXISTS teamA_name TEXT DEFAULT 'Team A',
ADD COLUMN IF NOT EXISTS teamB_name TEXT DEFAULT 'Team B',
ADD COLUMN IF NOT EXISTS teamA_color TEXT DEFAULT '#3B82F6',
ADD COLUMN IF NOT EXISTS teamB_color TEXT DEFAULT '#EF4444';

-- Add match details columns
ALTER TABLE matches
ADD COLUMN IF NOT EXISTS match_summary TEXT,
ADD COLUMN IF NOT EXISTS possession_teamA INTEGER DEFAULT 50,
ADD COLUMN IF NOT EXISTS possession_teamB INTEGER DEFAULT 50,
ADD COLUMN IF NOT EXISTS shots_teamA INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS shots_teamB INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS shots_on_target_teamA INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS shots_on_target_teamB INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS fouls_teamA INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS fouls_teamB INTEGER DEFAULT 0;

-- Create match_events table for goals, cards, substitutions
CREATE TABLE IF NOT EXISTS match_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE NOT NULL,
  event_type VARCHAR(20) NOT NULL CHECK (event_type IN ('goal', 'card', 'substitution')),
  minute INTEGER NOT NULL CHECK (minute >= 0 AND minute <= 120),
  team VARCHAR(1) NOT NULL CHECK (team IN ('A', 'B')),

  -- Goal specific fields
  scorer VARCHAR(255),
  assist VARCHAR(255),

  -- Card specific fields
  player VARCHAR(255),
  card_type VARCHAR(10) CHECK (card_type IN ('yellow', 'red')),

  -- Substitution specific fields
  player_out VARCHAR(255),
  player_in VARCHAR(255),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create teams table if it doesn't exist
CREATE TABLE IF NOT EXISTS teams (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  color TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create match_players table if it doesn't exist
CREATE TABLE IF NOT EXISTS match_players (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE NOT NULL,
  player_id UUID REFERENCES players(id) ON DELETE CASCADE NOT NULL,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE NOT NULL,
  position TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(match_id, player_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_match_events_match_id ON match_events(match_id);
CREATE INDEX IF NOT EXISTS idx_match_events_type ON match_events(event_type);
CREATE INDEX IF NOT EXISTS idx_teams_match_id ON teams(match_id);
CREATE INDEX IF NOT EXISTS idx_match_players_match_id ON match_players(match_id);
CREATE INDEX IF NOT EXISTS idx_match_players_player_id ON match_players(player_id);

-- Enable Row Level Security
ALTER TABLE match_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_players ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies for match_events
CREATE POLICY "Approved users can view match events" ON match_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND status = 'approved'
    )
  );

CREATE POLICY "Admins can manage match events" ON match_events
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin' AND status = 'approved'
    )
  );

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

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_match_events_updated_at
  BEFORE UPDATE ON match_events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
