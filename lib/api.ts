import { supabase } from './supabaseClient'
import { UserProfile, Player, Match, Team, MatchPlayer, Stat, PlayerStats, MatchWithDetails, RegistrationData } from '@/types'

// User Profiles
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) {
      console.error('Error fetching user profile:', error)
      // If RLS is blocking, try to create a basic profile
      if (error.code === '42P17' || error.message.includes('infinite recursion')) {
        console.log('RLS issue detected, creating basic profile')
        const { data: newProfile, error: insertError } = await supabase
          .from('user_profiles')
          .insert({
            id: userId,
            email: '', // Will be updated by the user
            name: 'New User',
            role: 'player',
            status: 'pending'
          })
          .select()
          .single()

        if (insertError) {
          console.error('Failed to create profile:', insertError)
          return null
        }
        return newProfile
      }
      throw error
    }
    return data
  } catch (err) {
    console.error('Unexpected error in getUserProfile:', err)
    return null
  }
}

export async function updateUserProfile(userId: string, updates: Partial<UserProfile>): Promise<UserProfile> {
  const { data, error } = await supabase
    .from('user_profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function approveUser(userId: string, approvedBy: string): Promise<UserProfile> {
  const { data, error } = await supabase
    .from('user_profiles')
    .update({
      status: 'approved',
      approved_at: new Date().toISOString(),
      approved_by: approvedBy
    })
    .eq('id', userId)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function rejectUser(userId: string, approvedBy: string): Promise<UserProfile> {
  const { data, error } = await supabase
    .from('user_profiles')
    .update({
      status: 'rejected',
      approved_at: new Date().toISOString(),
      approved_by: approvedBy
    })
    .eq('id', userId)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function getPendingUsers(): Promise<UserProfile[]> {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

export async function getAllUsers(): Promise<UserProfile[]> {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

// Players
export async function getPlayers(): Promise<Player[]> {
  const { data, error } = await supabase
    .from('players')
    .select(`
      *,
      user_profile:user_profiles(*)
    `)
    .order('created_at')

  if (error) throw error
  return data || []
}

export async function getPlayerByUserId(userId: string): Promise<Player | null> {
  const { data, error } = await supabase
    .from('players')
    .select(`
      *,
      user_profile:user_profiles(*)
    `)
    .eq('user_id', userId)
    .single()

  if (error) throw error
  return data
}

export async function createPlayer(player: Omit<Player, 'id' | 'created_at' | 'updated_at'>): Promise<Player> {
  const { data, error } = await supabase
    .from('players')
    .insert(player)
    .select(`
      *,
      user_profile:user_profiles(*)
    `)
    .single()

  if (error) throw error
  return data
}

export async function updatePlayer(id: string, updates: Partial<Player>): Promise<Player> {
  const { data, error } = await supabase
    .from('players')
    .update(updates)
    .eq('id', id)
    .select(`
      *,
      user_profile:user_profiles(*)
    `)
    .single()

  if (error) throw error
  return data
}

export async function deletePlayer(id: string): Promise<void> {
  const { error } = await supabase
    .from('players')
    .delete()
    .eq('id', id)

  if (error) throw error
}

// Matches
export async function getMatches(): Promise<Match[]> {
  const { data, error } = await supabase
    .from('matches')
    .select('*')
    .order('date', { ascending: false })

  if (error) throw error
  return data || []
}

export async function getMatchWithDetails(id: string): Promise<MatchWithDetails | null> {
  const { data: match, error: matchError } = await supabase
    .from('matches')
    .select('*')
    .eq('id', id)
    .single()

  if (matchError) throw matchError
  if (!match) return null

  const { data: teams, error: teamsError } = await supabase
    .from('teams')
    .select('*')
    .eq('match_id', id)

  if (teamsError) throw teamsError

  const { data: matchPlayers, error: playersError } = await supabase
    .from('match_players')
    .select(`
      *,
      player:players(
        *,
        user_profile:user_profiles(*)
      ),
      team:teams(*),
      stats:stats(*)
    `)
    .eq('match_id', id)

  if (playersError) throw playersError

  const players = matchPlayers?.map(mp => ({
    player: mp.player as Player,
    team: mp.team as Team,
    position: mp.position,
    goals: mp.stats?.[0]?.goals || 0,
    assists: mp.stats?.[0]?.assists || 0,
    yellow_cards: mp.stats?.[0]?.yellow_cards || 0,
    red_cards: mp.stats?.[0]?.red_cards || 0,
    minutes_played: mp.stats?.[0]?.minutes_played || 90
  })) || []

  return {
    ...match,
    teams: teams || [],
    players
  }
}

export async function createMatch(match: Omit<Match, 'id' | 'created_at' | 'updated_at'>): Promise<Match> {
  const { data, error } = await supabase
    .from('matches')
    .insert(match)
    .select()
    .single()

  if (error) throw error
  return data
}

// Teams
export async function createTeam(team: Omit<Team, 'id' | 'created_at'>): Promise<Team> {
  const { data, error } = await supabase
    .from('teams')
    .insert(team)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function getTeamsForMatch(matchId: string): Promise<Team[]> {
  const { data, error } = await supabase
    .from('teams')
    .select('*')
    .eq('match_id', matchId)

  if (error) throw error
  return data || []
}

// Match Players
export async function assignPlayerToMatch(matchId: string, playerId: string, teamId: string, position?: string): Promise<MatchPlayer> {
  const { data, error } = await supabase
    .from('match_players')
    .insert({
      match_id: matchId,
      player_id: playerId,
      team_id: teamId,
      position
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updatePlayerTeam(matchId: string, playerId: string, teamId: string): Promise<void> {
  const { error } = await supabase
    .from('match_players')
    .update({ team_id: teamId })
    .eq('match_id', matchId)
    .eq('player_id', playerId)

  if (error) throw error
}

// Stats
export async function updatePlayerStats(matchPlayerId: string, stats: {
  goals?: number
  assists?: number
  yellow_cards?: number
  red_cards?: number
  minutes_played?: number
}): Promise<Stat> {
  const { data, error } = await supabase
    .from('stats')
    .upsert({
      match_player_id: matchPlayerId,
      ...stats
    })
    .select()
    .single()

  if (error) throw error
  return data
}

// Leaderboards
export async function getPlayerStats(): Promise<PlayerStats[]> {
  const { data, error } = await supabase
    .from('players')
    .select(`
      *,
      user_profile:user_profiles(*),
      match_players(
        stats(goals, assists, yellow_cards, red_cards, minutes_played)
      )
    `)

  if (error) throw error

  return data?.map(player => {
    const totalGoals = player.match_players?.reduce((sum: number, mp: any) =>
      sum + (mp.stats?.[0]?.goals || 0), 0) || 0
    const totalAssists = player.match_players?.reduce((sum: number, mp: any) =>
      sum + (mp.stats?.[0]?.assists || 0), 0) || 0
    const totalYellowCards = player.match_players?.reduce((sum: number, mp: any) =>
      sum + (mp.stats?.[0]?.yellow_cards || 0), 0) || 0
    const totalRedCards = player.match_players?.reduce((sum: number, mp: any) =>
      sum + (mp.stats?.[0]?.red_cards || 0), 0) || 0
    const totalMinutes = player.match_players?.reduce((sum: number, mp: any) =>
      sum + (mp.stats?.[0]?.minutes_played || 0), 0) || 0
    const matchesPlayed = player.match_players?.length || 0

    return {
      player,
      total_goals: totalGoals,
      total_assists: totalAssists,
      total_yellow_cards: totalYellowCards,
      total_red_cards: totalRedCards,
      matches_played: matchesPlayed,
      total_minutes: totalMinutes
    }
  }) || []
}
