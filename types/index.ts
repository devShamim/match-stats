export interface UserProfile {
  id: string
  email: string
  name: string
  position?: string
  phone?: string
  photo_url?: string
  role: 'admin' | 'player'
  status: 'pending' | 'approved' | 'rejected'
  approved_at?: string
  approved_by?: string
  created_at: string
  updated_at: string
}

export interface Player {
  id: string
  user_id: string
  jersey_number?: number
  preferred_position?: string
  created_at: string
  updated_at: string
  user_profile?: UserProfile
}

export interface Match {
  id: string
  type: 'internal' | 'external'
  date: string
  opponent?: string
  location?: string
  status: 'scheduled' | 'in_progress' | 'completed'
  score_teamA: number
  score_teamB: number
  created_by: string
  created_at: string
  updated_at: string
}

export interface Team {
  id: string
  match_id: string
  name: string
  color?: string
  created_at: string
}

export interface MatchPlayer {
  id: string
  match_id: string
  player_id: string
  team_id: string
  position?: string
  created_at: string
  player?: Player
  team?: Team
}

export interface Stat {
  id: string
  match_player_id: string
  goals: number
  assists: number
  yellow_cards: number
  red_cards: number
  minutes_played: number
  own_goals: number
  created_at: string
  updated_at: string
}

export interface PlayerStats {
  player: Player
  total_goals: number
  total_assists: number
  total_yellow_cards: number
  total_red_cards: number
  total_own_goals: number
  matches_played: number
  total_minutes: number
}

export interface MatchWithDetails extends Match {
  teams: Team[]
  players: Array<{
    player: Player
    team: Team
    position?: string
    goals: number
    assists: number
    yellow_cards: number
    red_cards: number
    minutes_played: number
    own_goals: number
  }>
  own_goals?: Array<{
    id?: string
    player_id: string
    player_name: string
    minute: number
    team: 'A' | 'B'
    opponent_team: 'A' | 'B'
  }>
}

export interface RegistrationData {
  email: string
  password: string
  name: string
  position?: string
  phone?: string
}

// Tournament Types
export interface PersistentTeam {
  id: string
  name: string
  logo_url?: string
  color?: string
  captain_id?: string
  created_by: string
  created_at: string
  updated_at: string
  captain?: Player
  players?: TeamPlayer[]
}

export interface TeamPlayer {
  id: string
  team_id: string
  player_id: string
  jersey_number?: number
  position?: string
  is_captain: boolean
  joined_at: string
  player?: Player
}

export interface Tournament {
  id: string
  name: string
  description?: string
  type: 'round_robin' | 'knockout' | 'hybrid' | 'double_round_robin'
  status: 'draft' | 'registration' | 'in_progress' | 'completed' | 'cancelled'
  start_date?: string
  end_date?: string
  max_teams?: number
  min_players_per_team: number
  max_players_per_team: number
  points_per_win: number
  points_per_draw: number
  points_per_loss: number
  prize_structure?: Record<string, number | string>
  created_by: string
  created_at: string
  updated_at: string
  teams?: TournamentTeam[]
  standings?: TournamentStanding[]
}

export interface TournamentTeam {
  id: string
  tournament_id: string
  team_id: string
  group_name?: string
  seed?: number
  status: 'registered' | 'active' | 'eliminated' | 'withdrawn'
  registered_at: string
  team?: PersistentTeam
}

export interface TournamentStanding {
  id: string
  tournament_id: string
  team_id: string
  group_name?: string
  matches_played: number
  wins: number
  draws: number
  losses: number
  goals_for: number
  goals_against: number
  goal_difference: number
  points: number
  position?: number
  updated_at: string
  team?: PersistentTeam
}

export interface TournamentPlayerStat {
  id: string
  tournament_id: string
  player_id: string
  team_id: string
  matches_played: number
  goals: number
  assists: number
  clean_sheets: number
  saves: number
  yellow_cards: number
  red_cards: number
  average_rating?: number
  unified_score: number
  updated_at: string
  player?: Player
  team?: PersistentTeam
}

export interface TournamentPrize {
  id: string
  tournament_id: string
  category: string
  rank?: number
  recipient_type: 'team' | 'player'
  recipient_team_id?: string
  recipient_player_id?: string
  prize_amount?: number
  prize_description?: string
  awarded_at?: string
  created_at: string
  recipient_team?: PersistentTeam
  recipient_player?: Player
}
