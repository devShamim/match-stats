-- Enhanced Match Details Schema
-- This extends the existing matches table with comprehensive match tracking

-- Match Events Table (Goals, Cards, Substitutions)
CREATE TABLE IF NOT EXISTS match_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
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

-- Match Statistics Table
CREATE TABLE IF NOT EXISTS match_statistics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,

  -- Possession percentages
  possession_teamA INTEGER DEFAULT 50 CHECK (possession_teamA >= 0 AND possession_teamA <= 100),
  possession_teamB INTEGER DEFAULT 50 CHECK (possession_teamB >= 0 AND possession_teamB <= 100),

  -- Shots
  shots_teamA INTEGER DEFAULT 0 CHECK (shots_teamA >= 0),
  shots_teamB INTEGER DEFAULT 0 CHECK (shots_teamB >= 0),

  -- Shots on target
  shots_on_target_teamA INTEGER DEFAULT 0 CHECK (shots_on_target_teamA >= 0),
  shots_on_target_teamB INTEGER DEFAULT 0 CHECK (shots_on_target_teamB >= 0),

  -- Fouls
  fouls_teamA INTEGER DEFAULT 0 CHECK (fouls_teamA >= 0),
  fouls_teamB INTEGER DEFAULT 0 CHECK (fouls_teamB >= 0),

  -- Clean sheets
  clean_sheet_teamA BOOLEAN DEFAULT FALSE,
  clean_sheet_teamB BOOLEAN DEFAULT FALSE,

  -- Match summary
  match_summary TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(match_id)
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_match_events_match_id ON match_events(match_id);
CREATE INDEX IF NOT EXISTS idx_match_events_type ON match_events(event_type);
CREATE INDEX IF NOT EXISTS idx_match_statistics_match_id ON match_statistics(match_id);

-- Row Level Security Policies
ALTER TABLE match_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_statistics ENABLE ROW LEVEL SECURITY;

-- Policies for match_events
CREATE POLICY "Users can view match events" ON match_events
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage match events" ON match_events
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid() AND up.role = 'admin'
    )
  );

-- Policies for match_statistics
CREATE POLICY "Users can view match statistics" ON match_statistics
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage match statistics" ON match_statistics
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid() AND up.role = 'admin'
    )
  );

-- Functions to automatically update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_match_events_updated_at
  BEFORE UPDATE ON match_events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_match_statistics_updated_at
  BEFORE UPDATE ON match_statistics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
