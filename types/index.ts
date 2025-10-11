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
  created_at: string
  updated_at: string
}

export interface PlayerStats {
  player: Player
  total_goals: number
  total_assists: number
  total_yellow_cards: number
  total_red_cards: number
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
  }>
}

export interface RegistrationData {
  email: string
  password: string
  name: string
  position?: string
  phone?: string
}
