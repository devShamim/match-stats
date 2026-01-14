import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/auth'

// GET - Get tournament player statistics
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tournamentId = params.id

    // Get all completed matches for this tournament
    const { data: matches } = await supabaseAdmin()
      .from('matches')
      .select('id')
      .eq('tournament_id', tournamentId)
      .eq('status', 'completed')

    if (!matches || matches.length === 0) {
      return NextResponse.json({ playerStats: [] })
    }

    const matchIds = matches.map(m => m.id)

    // Get all match_players with stats for tournament matches
    const { data: matchPlayers, error } = await supabaseAdmin()
      .from('match_players')
      .select(`
        player_id,
        stats(goals, assists, rating, clean_sheets, saves, yellow_cards, red_cards),
        player:players(
          id,
          user_profile:user_profiles(name, photo_url)
        )
      `)
      .in('match_id', matchIds)

    if (error) {
      console.error('Error fetching match players:', error)
      return NextResponse.json(
        { error: 'Failed to fetch player statistics' },
        { status: 400 }
      )
    }

    // Aggregate stats by player
    const playerStatsMap = new Map<string, {
      player_id: string
      player_name: string
      photo_url?: string
      matches_played: number
      goals: number
      assists: number
      clean_sheets: number
      saves: number
      yellow_cards: number
      red_cards: number
      total_rating: number
      rated_matches: number
      average_rating: number
    }>()

    matchPlayers?.forEach(mp => {
      if (!mp.player_id || !mp.player) return

      const playerId = mp.player_id
      const playerName = mp.player.user_profile?.name || 'Unknown'
      const photoUrl = mp.player.user_profile?.photo_url

      if (!playerStatsMap.has(playerId)) {
        playerStatsMap.set(playerId, {
          player_id: playerId,
          player_name: playerName,
          photo_url: photoUrl,
          matches_played: 0,
          goals: 0,
          assists: 0,
          clean_sheets: 0,
          saves: 0,
          yellow_cards: 0,
          red_cards: 0,
          total_rating: 0,
          rated_matches: 0,
          average_rating: 0
        })
      }

      const stats = playerStatsMap.get(playerId)!
      stats.matches_played++

      if (mp.stats) {
        const s = mp.stats as any
        stats.goals += s.goals || 0
        stats.assists += s.assists || 0
        stats.clean_sheets += s.clean_sheets || 0
        stats.saves += s.saves || 0
        stats.yellow_cards += s.yellow_cards || 0
        stats.red_cards += s.red_cards || 0

        if (s.rating !== null && s.rating !== undefined) {
          stats.total_rating += s.rating
          stats.rated_matches++
        }
      }
    })

    // Calculate average ratings
    const playerStats = Array.from(playerStatsMap.values()).map(ps => ({
      ...ps,
      average_rating: ps.rated_matches > 0 ? ps.total_rating / ps.rated_matches : 0
    }))

    // Sort by goals, then assists, then average rating
    playerStats.sort((a, b) => {
      if (b.goals !== a.goals) return b.goals - a.goals
      if (b.assists !== a.assists) return b.assists - a.assists
      return b.average_rating - a.average_rating
    })

    return NextResponse.json({ playerStats })
  } catch (error: any) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
