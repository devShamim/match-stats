import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/auth'

export async function GET(request: NextRequest) {
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

    // Get all saves from match_events
    const { data: allSaves, error: savesError } = await supabaseAdmin()
      .from('match_events')
      .select('*')
      .eq('event_type', 'save')

    if (savesError) {
      console.error('Error fetching saves:', savesError)
    }

    // Get all clean sheets from match_events
    const { data: allCleanSheets, error: cleanSheetsError } = await supabaseAdmin()
      .from('match_events')
      .select('*')
      .eq('event_type', 'clean_sheet')

    if (cleanSheetsError) {
      console.error('Error fetching clean sheets:', cleanSheetsError)
    }

    // Create a map of saves per player per match
    const savesPerPlayerPerMatch = new Map()
    allSaves?.forEach(save => {
      const key = `${save.match_id}-${save.player}`
      savesPerPlayerPerMatch.set(key, (savesPerPlayerPerMatch.get(key) || 0) + 1)
    })

    // Create a map of clean sheets per player per match
    const cleanSheetsPerPlayerPerMatch = new Map()
    allCleanSheets?.forEach(cleanSheet => {
      const key = `${cleanSheet.match_id}-${cleanSheet.player}`
      cleanSheetsPerPlayerPerMatch.set(key, (cleanSheetsPerPlayerPerMatch.get(key) || 0) + 1)
    })

    // Process all match_players to aggregate stats
    allMatchPlayers?.forEach(matchPlayer => {
      if (matchPlayer.player && matchPlayer.player.id) {
        const playerId = matchPlayer.player.id
        const playerName = matchPlayer.player.user_profile?.name || 'Unknown'

        if (!playerStatsMap.has(playerId)) {
          playerStatsMap.set(playerId, {
            player_id: playerId,
            player_name: playerName,
            total_goals: 0,
            total_assists: 0,
            total_saves: 0,
            matches_played: 0,
            created_at: matchPlayer.player.created_at || ''
          })
        }

        const playerStats = playerStatsMap.get(playerId)
        playerStats.unique_matches = playerStats.unique_matches || new Set()
        playerStats.unique_matches.add(matchPlayer.match.id)

        const stats = matchPlayer.stats || null

        if (stats) {
          playerStats.total_goals += stats.goals || 0
          playerStats.total_assists += stats.assists || 0
        }

        // Get saves from events for this player in this match (even if no stats record)
        const savesKey = `${matchPlayer.match.id}-${playerName}`
        const matchSaves = savesPerPlayerPerMatch.get(savesKey) || 0
        playerStats.total_saves += matchSaves
      }
    })

    // Convert unique matches set to count
    playerStatsMap.forEach(playerStats => {
      playerStats.matches_played = playerStats.unique_matches.size
      delete playerStats.unique_matches // Clean up
    })

    // Convert to array
    const allPlayerStats = Array.from(playerStatsMap.values())

    return NextResponse.json({
      success: true,
      players: allPlayerStats
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Surrogate-Control': 'no-store'
      }
    })

  } catch (error: any) {
    console.error('Players Stats API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

