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
      return NextResponse.json(
        { error: `Failed to fetch match players: ${allMatchPlayersError.message}` },
        { status: 400 }
      )
    }

    // Aggregate stats by player
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
      if (!savesPerPlayerPerMatch.has(key)) {
        savesPerPlayerPerMatch.set(key, 0)
      }
      savesPerPlayerPerMatch.set(key, savesPerPlayerPerMatch.get(key) + 1)
    })

    // Create a map of clean sheets per player per match
    const cleanSheetsPerPlayerPerMatch = new Map()
    allCleanSheets?.forEach(cleanSheet => {
      const key = `${cleanSheet.match_id}-${cleanSheet.player}`
      if (!cleanSheetsPerPlayerPerMatch.has(key)) {
        cleanSheetsPerPlayerPerMatch.set(key, 0)
      }
      cleanSheetsPerPlayerPerMatch.set(key, cleanSheetsPerPlayerPerMatch.get(key) + 1)
    })

    allMatchPlayers.forEach(matchPlayer => {
      const playerId = matchPlayer.player_id
      const playerName = matchPlayer.player?.user_profile?.name
      const playerPhoto = matchPlayer.player?.user_profile?.photo_url

      if (!playerStatsMap.has(playerId)) {
        playerStatsMap.set(playerId, {
          player_id: playerId,
          player_name: playerName,
          player_photo: playerPhoto,
          total_goals: 0,
          total_assists: 0,
          total_yellow_cards: 0,
          total_red_cards: 0,
          total_clean_sheets: 0,
          total_saves: 0,
          total_minutes: 0,
          matches_played: 0,
          recent_matches: [],
          unique_matches: new Set() // Track unique matches
        })
      }

      const playerStats = playerStatsMap.get(playerId)

      // Add unique match to set (this ensures we count all matches, not just those with stats)
      playerStats.unique_matches.add(matchPlayer.match.id)

      // Get stats for this match_player (stats is an object, not array)
      const stats = matchPlayer.stats || null

      if (stats) {
        playerStats.total_goals += stats.goals || 0
        playerStats.total_assists += stats.assists || 0
        playerStats.total_yellow_cards += stats.yellow_cards || 0
        playerStats.total_red_cards += stats.red_cards || 0
        // Get clean sheets from events for this player in this match
        const cleanSheetsKey = `${matchPlayer.match.id}-${playerName}`
        const matchCleanSheets = cleanSheetsPerPlayerPerMatch.get(cleanSheetsKey) || 0
        playerStats.total_clean_sheets += matchCleanSheets
        // Get saves from events for this player in this match
        const savesKey = `${matchPlayer.match.id}-${playerName}`
        const matchSaves = savesPerPlayerPerMatch.get(savesKey) || 0
        playerStats.total_saves += matchSaves
        playerStats.total_minutes += stats.minutes_played || 90

        // Add to recent matches
        playerStats.recent_matches.push({
          match_id: matchPlayer.match.id,
          date: matchPlayer.match.date,
          opponent: matchPlayer.match.opponent,
          teamA_name: matchPlayer.match.teamA_name,
          teamB_name: matchPlayer.match.teamB_name,
          goals: stats.goals || 0,
          assists: stats.assists || 0,
          yellow_cards: stats.yellow_cards || 0,
          red_cards: stats.red_cards || 0,
          clean_sheets: matchCleanSheets,
          saves: matchSaves,
          minutes_played: stats.minutes_played || 90
        })
      } else {
        // If no stats record exists, assume 90 minutes played
        playerStats.total_minutes += 90
        // Get clean sheets from events for this player in this match even if no stats record
        const cleanSheetsKey = `${matchPlayer.match.id}-${playerName}`
        const matchCleanSheets = cleanSheetsPerPlayerPerMatch.get(cleanSheetsKey) || 0
        playerStats.total_clean_sheets += matchCleanSheets
        // Get saves from events for this player in this match even if no stats record
        const savesKey = `${matchPlayer.match.id}-${playerName}`
        const matchSaves = savesPerPlayerPerMatch.get(savesKey) || 0
        playerStats.total_saves += matchSaves

        // Add to recent matches with default values
        playerStats.recent_matches.push({
          match_id: matchPlayer.match.id,
          date: matchPlayer.match.date,
          opponent: matchPlayer.match.opponent,
          teamA_name: matchPlayer.match.teamA_name,
          teamB_name: matchPlayer.match.teamB_name,
          goals: 0,
          assists: 0,
          yellow_cards: 0,
          red_cards: 0,
          clean_sheets: matchCleanSheets,
          saves: matchSaves,
          minutes_played: 90
        })
      }
    })

    // Convert unique matches set to count
    playerStatsMap.forEach(playerStats => {
      playerStats.matches_played = playerStats.unique_matches.size
      delete playerStats.unique_matches // Clean up
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

    // Top clean sheets (defenders and goalkeepers)
    const topCleanSheets = allPlayerStats
      .filter(player => player.total_clean_sheets > 0)
      .sort((a, b) => b.total_clean_sheets - a.total_clean_sheets)
      .slice(0, 5)

    // Top saves (goalkeepers)
    const topSaves = allPlayerStats
      .filter(player => player.total_saves > 0)
      .sort((a, b) => b.total_saves - a.total_saves)
      .slice(0, 5)

    // Get recent matches (last 5 matches)
    const { data: recentMatches, error: recentMatchesError } = await supabaseAdmin()
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

    // Get upcoming matches (next 3 matches)
    // Use a more flexible date comparison - get matches from 1 hour ago to avoid timezone issues
    const oneHourAgo = new Date()
    oneHourAgo.setHours(oneHourAgo.getHours() - 1)

    const { data: upcomingMatches, error: upcomingMatchesError } = await supabaseAdmin()
      .from('matches')
      .select(`
        *,
        teams(*)
      `)
      .eq('status', 'scheduled')
      .gte('date', oneHourAgo.toISOString())
      .order('date', { ascending: true })
      .limit(3)

    if (upcomingMatchesError) {
      console.error('Error fetching upcoming matches:', upcomingMatchesError)
    }

    // Calculate overall statistics
    const totalGoals = allPlayerStats.reduce((sum, player) => sum + player.total_goals, 0)
    const totalAssists = allPlayerStats.reduce((sum, player) => sum + player.total_assists, 0)
    const totalMatches = recentMatches?.length || 0

    // Get total registered players count (not just players with stats)
    const { data: allPlayers, error: playersError } = await supabaseAdmin()
      .from('players')
      .select('id')

    const totalPlayers = allPlayers?.length || 0

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
          most_cards: mostCards,
          top_clean_sheets: topCleanSheets,
          top_saves: topSaves
        },
        recent_matches: recentMatches || [],
        upcoming_matches: upcomingMatches || []
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
