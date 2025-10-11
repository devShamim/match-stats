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

// Function to assign stats to players based on match events
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { matchId } = body

    if (!matchId) {
      return NextResponse.json(
        { error: 'Match ID is required' },
        { status: 400 }
      )
    }

    // Get match events
    const { data: events, error: eventsError } = await supabaseAdmin
      .from('match_events')
      .select('*')
      .eq('match_id', matchId)

    if (eventsError) {
      console.error('Error fetching match events:', eventsError)
      return NextResponse.json(
        { error: `Failed to fetch match events: ${eventsError.message}` },
        { status: 400 }
      )
    }

    // Get match players to map player names to player IDs
    const { data: matchPlayers, error: matchPlayersError } = await supabaseAdmin
      .from('match_players')
      .select(`
        *,
        player:players(
          *,
          user_profile:user_profiles(*)
        )
      `)
      .eq('match_id', matchId)

    if (matchPlayersError) {
      console.error('Error fetching match players:', matchPlayersError)
      return NextResponse.json(
        { error: `Failed to fetch match players: ${matchPlayersError.message}` },
        { status: 400 }
      )
    }

    // Create a map of player names to player IDs
    const playerNameToIdMap = new Map()
    matchPlayers.forEach(mp => {
      const playerName = mp.player?.user_profile?.name
      if (playerName) {
        playerNameToIdMap.set(playerName, mp.player.id)
      }
    })

    // Process events and calculate stats
    const playerStats = new Map()

    events.forEach(event => {
      if (event.event_type === 'goal') {
        // Handle goals
        if (event.scorer) {
          const playerId = playerNameToIdMap.get(event.scorer)
          if (playerId) {
            if (!playerStats.has(playerId)) {
              playerStats.set(playerId, { goals: 0, assists: 0, yellow_cards: 0, red_cards: 0, minutes_played: 90 })
            }
            playerStats.get(playerId).goals += 1
          }
        }

        // Handle assists
        if (event.assist) {
          const playerId = playerNameToIdMap.get(event.assist)
          if (playerId) {
            if (!playerStats.has(playerId)) {
              playerStats.set(playerId, { goals: 0, assists: 0, yellow_cards: 0, red_cards: 0, minutes_played: 90 })
            }
            playerStats.get(playerId).assists += 1
          }
        }
      } else if (event.event_type === 'card') {
        // Handle cards
        if (event.player) {
          const playerId = playerNameToIdMap.get(event.player)
          if (playerId) {
            if (!playerStats.has(playerId)) {
              playerStats.set(playerId, { goals: 0, assists: 0, yellow_cards: 0, red_cards: 0, minutes_played: 90 })
            }
            if (event.card_type === 'yellow') {
              playerStats.get(playerId).yellow_cards += 1
            } else if (event.card_type === 'red') {
              playerStats.get(playerId).red_cards += 1
            }
          }
        }
      }
    })

    // Update or create stats records
    const statsUpdates = []
    for (const [playerId, stats] of Array.from(playerStats.entries())) {
      // Find the match_player_id for this player
      const matchPlayer = matchPlayers.find(mp => mp.player_id === playerId)
      if (matchPlayer) {
        statsUpdates.push({
          match_player_id: matchPlayer.id,
          goals: stats.goals,
          assists: stats.assists,
          yellow_cards: stats.yellow_cards,
          red_cards: stats.red_cards,
          minutes_played: stats.minutes_played
        })
      }
    }

    // Insert or update stats
    if (statsUpdates.length > 0) {
      const { error: statsError } = await supabaseAdmin
        .from('stats')
        .upsert(statsUpdates, {
          onConflict: 'match_player_id',
          ignoreDuplicates: false
        })

      if (statsError) {
        console.error('Error updating stats:', statsError)
        return NextResponse.json(
          { error: `Failed to update stats: ${statsError.message}` },
          { status: 400 }
        )
      }
    }

    return NextResponse.json({
      success: true,
      message: `Stats assigned for ${statsUpdates.length} players`,
      statsUpdated: statsUpdates.length
    })

  } catch (error: any) {
    console.error('Stats assignment API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

// Function to get aggregated player stats
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const playerId = url.searchParams.get('playerId')

    if (playerId) {
      // Get stats for a specific player - filter match_players first to avoid null records
      const { data: playerStats, error: playerStatsError } = await supabaseAdmin
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
        .eq('player_id', playerId)

      if (playerStatsError) {
        console.error('Error fetching player stats:', playerStatsError)
        return NextResponse.json(
          { error: `Failed to fetch player stats: ${playerStatsError.message}` },
          { status: 400 }
        )
      }

      console.log('Player stats data:', JSON.stringify(playerStats, null, 2))

      // Check if player has any stats
      if (!playerStats || playerStats.length === 0) {
        return NextResponse.json({
          success: true,
          stats: {
            total_goals: 0,
            total_assists: 0,
            total_yellow_cards: 0,
            total_red_cards: 0,
            total_minutes: 0,
            matches_played: 0,
            recent_matches: []
          }
        })
      }

      // Debug: Log the raw data
      console.log('Raw playerStats (match_players with stats):', JSON.stringify(playerStats, null, 2))

      // Aggregate stats from match_players with nested stats
      const aggregatedStats = {
        total_goals: 0,
        total_assists: 0,
        total_yellow_cards: 0,
        total_red_cards: 0,
        total_minutes: 0,
        matches_played: playerStats.length,
        recent_matches: [] as Array<{
          match_id: string
          date: string
          opponent: string
          teamA_name: string
          teamB_name: string
          goals: number
          assists: number
          yellow_cards: number
          red_cards: number
          minutes_played: number
        }>
      }

      // Process each match_player and their stats
      playerStats.forEach((matchPlayer, index) => {
        console.log(`Match Player ${index}:`, {
          match_id: matchPlayer.match?.id,
          player_name: matchPlayer.player?.user_profile?.name,
          has_stats: !!matchPlayer.stats
        })

        // Get the stats for this match_player (stats is an object, not array)
        const stats = matchPlayer.stats || null

        if (stats) {
          console.log(`Stats for match ${matchPlayer.match?.id}:`, {
            goals: stats.goals,
            assists: stats.assists,
            yellow_cards: stats.yellow_cards,
            red_cards: stats.red_cards,
            minutes_played: stats.minutes_played
          })

          aggregatedStats.total_goals += stats.goals || 0
          aggregatedStats.total_assists += stats.assists || 0
          aggregatedStats.total_yellow_cards += stats.yellow_cards || 0
          aggregatedStats.total_red_cards += stats.red_cards || 0
          aggregatedStats.total_minutes += stats.minutes_played || 0

          // Add to recent matches
          if (matchPlayer.match) {
            aggregatedStats.recent_matches.push({
              match_id: matchPlayer.match.id,
              date: matchPlayer.match.date,
              opponent: matchPlayer.match.opponent,
              teamA_name: matchPlayer.match.teamA_name,
              teamB_name: matchPlayer.match.teamB_name,
              goals: stats.goals,
              assists: stats.assists,
              yellow_cards: stats.yellow_cards,
              red_cards: stats.red_cards,
              minutes_played: stats.minutes_played
            })
          }
        }
      })

      // Sort recent matches by date and limit to 5
      aggregatedStats.recent_matches = aggregatedStats.recent_matches
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 5)

      // Debug: Log final aggregated stats
      console.log('Final aggregated stats:', {
        total_goals: aggregatedStats.total_goals,
        total_assists: aggregatedStats.total_assists,
        total_yellow_cards: aggregatedStats.total_yellow_cards,
        total_red_cards: aggregatedStats.total_red_cards,
        total_minutes: aggregatedStats.total_minutes,
        matches_played: aggregatedStats.matches_played,
        recent_matches_count: aggregatedStats.recent_matches.length
      })

      return NextResponse.json({
        success: true,
        stats: aggregatedStats
      }, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
          'Surrogate-Control': 'no-store'
        }
      })
    } else {
      // Get overall leaderboards
      const { data: allStats, error: allStatsError } = await supabaseAdmin
        .from('stats')
        .select(`
          *,
          match_player:match_players(
            *,
            player:players(
              *,
              user_profile:user_profiles(*)
            )
          )
        `)

      if (allStatsError) {
        console.error('Error fetching all stats:', allStatsError)
        return NextResponse.json(
          { error: `Failed to fetch all stats: ${allStatsError.message}` },
          { status: 400 }
        )
      }

      // Aggregate stats by player
      const playerAggregatedStats = new Map()

      allStats.forEach(stat => {
        // Add null checks for nested objects
        if (!stat.match_player || !stat.match_player.player) {
          return // Skip this stat if match_player or player is null
        }

        const playerId = stat.match_player.player_id
        const playerName = stat.match_player.player?.user_profile?.name

        if (!playerAggregatedStats.has(playerId)) {
          playerAggregatedStats.set(playerId, {
            player_id: playerId,
            player_name: playerName,
            total_goals: 0,
            total_assists: 0,
            total_yellow_cards: 0,
            total_red_cards: 0,
            total_minutes: 0,
            matches_played: 0
          })
        }

        const playerStats = playerAggregatedStats.get(playerId)
        playerStats.total_goals += stat.goals
        playerStats.total_assists += stat.assists
        playerStats.total_yellow_cards += stat.yellow_cards
        playerStats.total_red_cards += stat.red_cards
        playerStats.total_minutes += stat.minutes_played
        playerStats.matches_played += 1
      })

      // Convert to arrays and sort
      const topScorers = Array.from(playerAggregatedStats.values())
        .sort((a, b) => b.total_goals - a.total_goals)
        .slice(0, 10)

      const topAssists = Array.from(playerAggregatedStats.values())
        .sort((a, b) => b.total_assists - a.total_assists)
        .slice(0, 10)

      return NextResponse.json({
        success: true,
        leaderboards: {
          top_scorers: topScorers,
          top_assists: topAssists
        }
      }, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
          'Surrogate-Control': 'no-store'
        }
      })
    }

  } catch (error: any) {
    console.error('Stats API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
