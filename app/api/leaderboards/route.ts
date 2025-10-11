import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

export async function GET() {
  try {
    // Get all stats with player and match information
    const { data: stats, error: statsError } = await supabaseAdmin
      .from('stats')
      .select(`
        *,
        match_player:match_players(
          *,
          player:players(
            *,
            user_profile:user_profiles(*)
          ),
          match:matches(*)
        )
      `)

    if (statsError) {
      console.error('Error fetching stats:', statsError)
      return NextResponse.json({ error: 'Failed to fetch stats data' }, { status: 500 })
    }

    // Aggregate player statistics
    const playerStatsMap = new Map()

    stats?.forEach(stat => {
      if (stat.match_player?.player?.user_profile?.name) {
        const playerName = stat.match_player.player.user_profile.name
        const playerId = stat.match_player.player.id

        if (!playerStatsMap.has(playerId)) {
          playerStatsMap.set(playerId, {
            id: playerId,
            name: playerName,
            photo_url: stat.match_player.player.user_profile.photo_url,
            goals: 0,
            assists: 0,
            yellow_cards: 0,
            red_cards: 0,
            matches_played: 0,
            total_minutes: 0,
            goals_per_match: 0,
            assists_per_match: 0
          })
        }

        const playerStats = playerStatsMap.get(playerId)
        playerStats.goals += stat.goals || 0
        playerStats.assists += stat.assists || 0
        playerStats.yellow_cards += stat.yellow_cards || 0
        playerStats.red_cards += stat.red_cards || 0
        playerStats.total_minutes += stat.minutes_played || 0
        playerStats.matches_played += 1
      }
    })

    // Calculate per-match ratios
    playerStatsMap.forEach(playerStats => {
      if (playerStats.matches_played > 0) {
        playerStats.goals_per_match = Number((playerStats.goals / playerStats.matches_played).toFixed(2))
        playerStats.assists_per_match = Number((playerStats.assists / playerStats.matches_played).toFixed(2))
      }
    })

    // Convert to array and sort
    const allPlayerStats = Array.from(playerStatsMap.values())

    // Top Goal Scorers
    const topGoalScorers = allPlayerStats
      .filter(player => player.goals > 0)
      .sort((a, b) => b.goals - a.goals)
      .slice(0, 10)

    // Top Assist Makers
    const topAssistMakers = allPlayerStats
      .filter(player => player.assists > 0)
      .sort((a, b) => b.assists - a.assists)
      .slice(0, 10)

    // Most Active Players (most matches played)
    const mostActivePlayers = allPlayerStats
      .filter(player => player.matches_played > 0)
      .sort((a, b) => b.matches_played - a.matches_played)
      .slice(0, 10)

    // Goals per Match (minimum 2 matches to qualify)
    const goalsPerMatch = allPlayerStats
      .filter(player => player.matches_played >= 2 && player.goals > 0)
      .sort((a, b) => b.goals_per_match - a.goals_per_match)
      .slice(0, 10)

    // Top Performers (combined goals + assists)
    const topPerformers = allPlayerStats
      .filter(player => (player.goals + player.assists) > 0)
      .sort((a, b) => (b.goals + b.assists) - (a.goals + a.assists))
      .slice(0, 10)

    // Most Minutes Played
    const mostMinutesPlayed = allPlayerStats
      .filter(player => player.total_minutes > 0)
      .sort((a, b) => b.total_minutes - a.total_minutes)
      .slice(0, 10)

    return NextResponse.json({
      success: true,
      data: {
        topGoalScorers,
        topAssistMakers,
        mostActivePlayers,
        goalsPerMatch,
        topPerformers,
        mostMinutesPlayed
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
    console.error('Leaderboards API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
