import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/auth'

export async function GET() {
  try {
    // Get all match_players with stats and player information
    const { data: allMatchPlayers, error: allMatchPlayersError } = await supabaseAdmin()
      .from('match_players')
      .select(`
        *,
        match:matches(*),
        player:players(
          *,
          user_profile:user_profiles(*)
        ),
        stats(*)
      `)

    if (allMatchPlayersError) {
      console.error('Error fetching match players:', allMatchPlayersError)
      return NextResponse.json({ error: 'Failed to fetch match players data' }, { status: 500 })
    }

    // Aggregate player statistics
    const playerStatsMap = new Map()

    allMatchPlayers?.forEach(matchPlayer => {
      if (matchPlayer.player?.user_profile?.name) {
        const playerName = matchPlayer.player.user_profile.name
        const playerId = matchPlayer.player.id

        if (!playerStatsMap.has(playerId)) {
          playerStatsMap.set(playerId, {
            id: playerId,
            name: playerName,
            photo_url: matchPlayer.player.user_profile.photo_url,
            goals: 0,
            assists: 0,
            yellow_cards: 0,
            red_cards: 0,
            matches_played: 0,
            total_minutes: 0,
            goals_per_match: 0,
            assists_per_match: 0,
            unique_matches: new Set() // Track unique matches
          })
        }

        const playerStats = playerStatsMap.get(playerId)

        // Add unique match to set (this ensures we count all matches, not just those with stats)
        playerStats.unique_matches.add(matchPlayer.match.id)

        // Get stats for this match_player (stats is an object, not array)
        const stats = matchPlayer.stats || null

        if (stats) {
          playerStats.goals += stats.goals || 0
          playerStats.assists += stats.assists || 0
          playerStats.yellow_cards += stats.yellow_cards || 0
          playerStats.red_cards += stats.red_cards || 0
          playerStats.total_minutes += stats.minutes_played || 90
        } else {
          // If no stats record exists, assume 90 minutes played
          playerStats.total_minutes += 90
        }
      }
    })

    // Convert unique matches set to count
    playerStatsMap.forEach(playerStats => {
      playerStats.matches_played = playerStats.unique_matches.size
      delete playerStats.unique_matches // Clean up
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
