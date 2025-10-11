-- Enhanced Supabase Database Schema for Football Stats Tracker
-- Run these SQL commands in your Supabase SQL Editor

-- Enable Row Level Security
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE stats ENABLE ROW LEVEL SECURITY;

-- Create user_profiles table to extend auth.users
CREATE TABLE user_profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  position TEXT, -- e.g., 'Forward', 'Midfielder', 'Defender', 'Goalkeeper'
  phone TEXT,
  photo_url TEXT,
  role TEXT NOT NULL DEFAULT 'player' CHECK (role IN ('admin', 'player')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  approved_at TIMESTAMP WITH TIME ZONE,
  approved_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create players table (simplified - now references user_profiles)
CREATE TABLE players (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE UNIQUE NOT NULL,
  jersey_number INTEGER,
  preferred_position TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create matches table
CREATE TABLE matches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('internal', 'external')),
  date TIMESTAMP WITH TIME ZONE NOT NULL,
  opponent TEXT, -- Only for external matches
  location TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed')),
  score_teamA INTEGER DEFAULT 0,
  score_teamB INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create teams table for match teams
CREATE TABLE teams (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL, -- 'Team A', 'Team B', or custom names
  color TEXT, -- Optional team color
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create match_players table (updated)
CREATE TABLE match_players (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE NOT NULL,
  player_id UUID REFERENCES players(id) ON DELETE CASCADE NOT NULL,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE NOT NULL,
  position TEXT, -- Player's position in this specific match
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(match_id, player_id)
);

-- Create stats table (updated)
CREATE TABLE stats (
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
CREATE INDEX idx_user_profiles_email ON user_profiles(email);
CREATE INDEX idx_user_profiles_role ON user_profiles(role);
CREATE INDEX idx_user_profiles_status ON user_profiles(status);
CREATE INDEX idx_players_user_id ON players(user_id);
CREATE INDEX idx_matches_date ON matches(date);
CREATE INDEX idx_matches_status ON matches(status);
CREATE INDEX idx_match_players_match_id ON match_players(match_id);
CREATE INDEX idx_match_players_player_id ON match_players(player_id);
CREATE INDEX idx_stats_match_player_id ON stats(match_player_id);

-- Create RLS Policies

-- User profiles policies
CREATE POLICY "Users can view their own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON user_profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin' AND status = 'approved'
    )
  );

CREATE POLICY "Admins can update all profiles" ON user_profiles
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin' AND status = 'approved'
    )
  );

CREATE POLICY "Anyone can insert new profile" ON user_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Players policies
CREATE POLICY "Approved users can view all players" ON players
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND status = 'approved'
    )
  );

CREATE POLICY "Admins can manage players" ON players
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin' AND status = 'approved'
    )
  );

-- Matches policies
CREATE POLICY "Approved users can view all matches" ON matches
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND status = 'approved'
    )
  );

CREATE POLICY "Admins can manage matches" ON matches
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin' AND status = 'approved'
    )
  );

-- Teams policies
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

-- Match players policies
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

-- Stats policies
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

-- Create function to automatically create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, name, role, status)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    'player',
    'pending'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically create user profile
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_players_updated_at
  BEFORE UPDATE ON players
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_matches_updated_at
  BEFORE UPDATE ON matches
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_stats_updated_at
  BEFORE UPDATE ON stats
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
