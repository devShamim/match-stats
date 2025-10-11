import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

export async function GET(request: NextRequest) {
  try {
    // Get all stats with player information
    const { data: allStats, error: allStatsError } = await supabaseAdmin
      .from('stats')
      .select(`
        *,
        match_player:match_players(
          *,
          match:matches(*),
          player:players(
            *,
            user_profile:user_profiles(*)
          )
        )
      `)

    if (allStatsError) {
      console.error('Error fetching all stats:', allStatsError)
      return NextResponse.json(
        { error: `Failed to fetch stats: ${allStatsError.message}` },
        { status: 400 }
      )
    }

    // Aggregate stats by player
    const playerStatsMap = new Map()

    allStats.forEach(stat => {
      const playerId = stat.match_player.player_id
      const playerName = stat.match_player.player?.user_profile?.name
      const playerPhoto = stat.match_player.player?.user_profile?.photo_url

      if (!playerStatsMap.has(playerId)) {
        playerStatsMap.set(playerId, {
          player_id: playerId,
          player_name: playerName,
          player_photo: playerPhoto,
          total_goals: 0,
          total_assists: 0,
          total_yellow_cards: 0,
          total_red_cards: 0,
          total_minutes: 0,
          matches_played: 0,
          recent_matches: []
        })
      }

      const playerStats = playerStatsMap.get(playerId)
      playerStats.total_goals += stat.goals
      playerStats.total_assists += stat.assists
      playerStats.total_yellow_cards += stat.yellow_cards
      playerStats.total_red_cards += stat.red_cards
      playerStats.total_minutes += stat.minutes_played
      playerStats.matches_played += 1

      // Add to recent matches (we'll limit this later)
      playerStats.recent_matches.push({
        match_id: stat.match_player.match.id,
        date: stat.match_player.match.date,
        opponent: stat.match_player.match.opponent,
        teamA_name: stat.match_player.match.teamA_name,
        teamB_name: stat.match_player.match.teamB_name,
        goals: stat.goals,
        assists: stat.assists,
        yellow_cards: stat.yellow_cards,
        red_cards: stat.red_cards,
        minutes_played: stat.minutes_played
      })
    })

    // Convert to arrays and sort
    const allPlayerStats = Array.from(playerStatsMap.values())

    // Sort recent matches by date for each player
    allPlayerStats.forEach(player => {
      player.recent_matches.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
      player.recent_matches = player.recent_matches.slice(0, 5) // Keep only last 5 matches
    })

    // Top scorers (limit to 5)
    const topScorers = allPlayerStats
      .filter(player => player.total_goals > 0)
      .sort((a, b) => b.total_goals - a.total_goals)
      .slice(0, 5)

    // Top assists (limit to 5)
    const topAssists = allPlayerStats
      .filter(player => player.total_assists > 0)
      .sort((a, b) => b.total_assists - a.total_assists)
      .slice(0, 5)

    // Most active players (by minutes played)
    const mostActivePlayers = allPlayerStats
      .sort((a, b) => b.total_minutes - a.total_minutes)
      .slice(0, 10)

    // Players with most cards (disciplinary issues)
    const mostCards = allPlayerStats
      .filter(player => (player.total_yellow_cards + player.total_red_cards) > 0)
      .sort((a, b) => (b.total_yellow_cards + b.total_red_cards) - (a.total_yellow_cards + a.total_red_cards))
      .slice(0, 10)

    // Top performers (combined goals + assists)
    const topPerformers = allPlayerStats
      .filter(player => (player.total_goals + player.total_assists) > 0)
      .sort((a, b) => (b.total_goals + b.total_assists) - (a.total_goals + a.total_assists))
      .slice(0, 5)

    // Get recent matches (last 5 matches)
    const { data: recentMatches, error: recentMatchesError } = await supabaseAdmin
      .from('matches')
      .select(`
        *,
        teams(*)
      `)
      .order('date', { ascending: false })
      .limit(5)

    if (recentMatchesError) {
      console.error('Error fetching recent matches:', recentMatchesError)
    }

    // Calculate overall statistics
    const totalGoals = allPlayerStats.reduce((sum, player) => sum + player.total_goals, 0)
    const totalAssists = allPlayerStats.reduce((sum, player) => sum + player.total_assists, 0)
    const totalMatches = recentMatches?.length || 0
    const totalPlayers = allPlayerStats.length

    return NextResponse.json({
      success: true,
      stats: {
        overview: {
          total_goals: totalGoals,
          total_assists: totalAssists,
          total_matches: totalMatches,
          total_players: totalPlayers
        },
        leaderboards: {
          top_scorers: topScorers,
          top_assists: topAssists,
          top_performers: topPerformers,
          most_active: mostActivePlayers,
          most_cards: mostCards
        },
        recent_matches: recentMatches || []
      }
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Surrogate-Control': 'no-store'
      }
    })

  } catch (error: any) {
    console.error('Stats page API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
