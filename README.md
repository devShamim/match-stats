# Football Stats Tracker

A simple internal football stats tracker for company matches built with Next.js 14, TypeScript, TailwindCSS, and Supabase.

## Features

- **Player Management**: Add, edit, and view player profiles
- **Match Tracking**: Record internal and external matches
- **Team Assignment**: Assign players to teams for each match
- **Statistics**: Track goals and assists per player per match
- **Dashboard**: Overview of key statistics
- **Leaderboards**: Top performers and statistics
- **Admin Panel**: Manage players, matches, and statistics

## Tech Stack

- **Next.js 14** with App Router and TypeScript
- **TailwindCSS** for styling
- **Supabase** for database and authentication
- **shadcn/ui** for UI components
- **React Context** for state management

## Getting Started

### Prerequisites

- Node.js 18+
- A Supabase account

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd football-stats
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp env.example .env.local
```

4. Fill in your Supabase credentials in `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

### Supabase Setup

1. Create a new Supabase project
2. Run the following SQL to create the database schema:

```sql
-- Enable Row Level Security
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE stats ENABLE ROW LEVEL SECURITY;

-- Create players table
CREATE TABLE players (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  photo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create matches table
CREATE TABLE matches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('internal', 'external')),
  date TIMESTAMP WITH TIME ZONE NOT NULL,
  opponent TEXT,
  score_teamA INTEGER DEFAULT 0,
  score_teamB INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create match_players table
CREATE TABLE match_players (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  team TEXT NOT NULL CHECK (team IN ('A', 'B')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(match_id, player_id)
);

-- Create stats table
CREATE TABLE stats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  match_player_id UUID REFERENCES match_players(id) ON DELETE CASCADE,
  goals INTEGER DEFAULT 0,
  assists INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(match_player_id)
);

-- Create RLS policies (adjust based on your needs)
-- Allow all authenticated users to read data
CREATE POLICY "Allow read access for authenticated users" ON players FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow read access for authenticated users" ON matches FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow read access for authenticated users" ON match_players FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow read access for authenticated users" ON stats FOR SELECT TO authenticated USING (true);

-- Allow admins to insert/update/delete (you'll need to implement admin role logic)
CREATE POLICY "Allow admin access" ON players FOR ALL TO authenticated USING (auth.jwt() ->> 'email' LIKE '%admin%');
CREATE POLICY "Allow admin access" ON matches FOR ALL TO authenticated USING (auth.jwt() ->> 'email' LIKE '%admin%');
CREATE POLICY "Allow admin access" ON match_players FOR ALL TO authenticated USING (auth.jwt() ->> 'email' LIKE '%admin%');
CREATE POLICY "Allow admin access" ON stats FOR ALL TO authenticated USING (auth.jwt() ->> 'email' LIKE '%admin%');
```

3. Set up authentication in Supabase:
   - Go to Authentication > Settings
   - Enable email/password authentication
   - Configure your site URL (e.g., `http://localhost:3000` for development)

### Running the Application

1. Start the development server:
```bash
npm run dev
```

2. Open [http://localhost:3000](http://localhost:3000) in your browser

3. Register an account or sign in to access the dashboard

## Project Structure

```
/app
  /auth        → login/register pages
  /dashboard   → main homepage showing summary
  /players     → player list & profile
  /matches     → match list & details
  /admin       → forms for admin (add player/match, assign stats)
  /layout.tsx  → sidebar + layout structure

/components
  /ui          → buttons, cards, tables, form inputs
  /forms       → PlayerForm, MatchForm, AssignPlayerForm, StatsForm

/lib
  supabaseClient.ts
  api.ts (for CRUD helpers)
  utils.ts (utility functions)

/types
  player.ts
  match.ts
  stat.ts
  index.ts

/context
  UserContext.tsx
```

## Features Overview

### Dashboard
- Overview of key statistics
- Recent matches
- Top performers

### Players
- View all players
- Player profiles with statistics
- Add/edit players (admin only)

### Matches
- Match history
- Match details with player assignments
- Add matches (admin only)

### Leaderboards
- Top goal scorers
- Top assist makers
- Most active players
- Goals per match ratio

### Admin Panel
- Manage players
- Create matches
- Assign players to teams
- Update statistics

## Deployment

### Vercel Deployment

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

### Environment Variables for Production

Make sure to set these in your Vercel dashboard:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

This project is licensed under the MIT License.
