import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/auth'

// Unified Scoring System Constants - Adjust these values to modify the scoring system
const GOALS_POINT = 3
const ASSIST_POINT = 2
const SAVES_POINT = 0.5
const CLEAN_SHEET_POINT_DEFENDER = 3
const CLEAN_SHEET_POINT_OTHER = 2
const OWN_GOAL_PENALTY = 2
const RATING_MULTIPLIER_DEFENDER = 2.6
const RATING_MULTIPLIER_OTHER = 2

// Helper function to detect if a player is a defender
function isDefender(position: string | null | undefined): boolean {
  if (!position) return false
  const pos = position.toLowerCase()
  return pos.includes('defender') ||
         pos.includes('cb') ||
         pos.includes('lb') ||
         pos.includes('rb') ||
         pos.includes('lwb') ||
         pos.includes('rwb') ||
         pos.includes('sw') ||
         pos.includes('cdm') ||
         pos === 'defender'
}

export async function GET() {
  try {
    // Get all match_players with stats and player information
    const { data: allMatchPlayers, error: allMatchPlayersError } = await supabaseAdmin()
      .from('match_players')
      .select(`
        *,
        match:matches(*),
        team:teams(*),
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

    allMatchPlayers?.forEach(matchPlayer => {
      if (matchPlayer.player?.user_profile?.name) {
        const playerName = matchPlayer.player.user_profile.name
        const playerId = matchPlayer.player.id

        // Use DEFAULT position (from user_profile or preferred_position) - NOT match-specific position
        // match_players.position is only for that specific match, not the player's default position
        const defaultPosition = matchPlayer.player.user_profile.position ||
                              matchPlayer.player.preferred_position ||
                              null

        // Match-specific position (for defender detection in this match only)
        const matchPosition = matchPlayer.position || defaultPosition
        const isPlayerDefender = isDefender(matchPosition) // Use match position for defender detection

        if (!playerStatsMap.has(playerId)) {
          playerStatsMap.set(playerId, {
            id: playerId,
            name: playerName,
            photo_url: matchPlayer.player.user_profile.photo_url,
            position: defaultPosition, // Always use default position for display
            is_defender: isDefender(defaultPosition), // Use default position for defender status
            goals: 0,
            assists: 0,
            own_goals: 0,
            yellow_cards: 0,
            red_cards: 0,
            clean_sheets: 0,
            saves: 0,
            matches_played: 0,
            total_minutes: 0,
            goals_per_match: 0,
            assists_per_match: 0,
            total_ratings: 0,
            rated_matches: 0,
            unique_matches: new Set() // Track unique matches
          })
        }

        const playerStats = playerStatsMap.get(playerId)
        // Only update position if not set (use default position, never match-specific)
        if (!playerStats.position) {
          playerStats.position = defaultPosition
          playerStats.is_defender = isDefender(defaultPosition)
        }

        // Add unique match to set (this ensures we count all matches, not just those with stats)
        playerStats.unique_matches.add(matchPlayer.match.id)

        // Get stats for this match_player (stats is an object, not array)
        const stats = matchPlayer.stats || null

        // Get clean sheets from events for this player in this match (before auto-credit logic)
        const match = matchPlayer.match
        const playerTeam = matchPlayer.team
        const cleanSheetsKey = `${matchPlayer.match.id}-${playerName}`
        let matchCleanSheets = cleanSheetsPerPlayerPerMatch.get(cleanSheetsKey) || 0

        // Auto-credit defenders if their team kept a clean sheet (only if match is completed and player played in this match)
        // DISABLED: Automatic clean sheet distribution is currently disabled
        // Clean sheets must be manually added via match_events
        // if (match && match.status === 'completed' && match.score_teamA !== null && match.score_teamB !== null) {
        //   const teamName = playerTeam?.name || ''
        //   const isTeamA = teamName === match.teamA_name || teamName === 'Team A' || (!match.teamA_name && teamName.includes('A'))
        //   const opponentScore = isTeamA ? (match.score_teamB || 0) : (match.score_teamA || 0)
        //   const teamKeptCleanSheet = opponentScore === 0
        //
        //   // Only credit if player is a defender, team kept clean sheet, and they don't already have a clean sheet event
        //   if (isPlayerDefender && teamKeptCleanSheet && matchCleanSheets === 0) {
        //     matchCleanSheets = 1
        //   }
        // }

        // Get saves from events for this player in this match
        const savesKey = `${matchPlayer.match.id}-${playerName}`
        const matchSaves = savesPerPlayerPerMatch.get(savesKey) || 0

        if (stats) {
          playerStats.goals += stats.goals || 0
          playerStats.assists += stats.assists || 0
          playerStats.own_goals += stats.own_goals || 0
          playerStats.yellow_cards += stats.yellow_cards || 0
          playerStats.red_cards += stats.red_cards || 0
          playerStats.clean_sheets += matchCleanSheets
          playerStats.saves += matchSaves
          playerStats.total_minutes += stats.minutes_played || 90
          // Track ratings
          if (stats.rating !== null && stats.rating !== undefined) {
            playerStats.total_ratings += stats.rating
            playerStats.rated_matches += 1
          }
        } else {
          // If no stats record exists, assume 90 minutes played
          playerStats.total_minutes += 90
          playerStats.clean_sheets += matchCleanSheets
          playerStats.saves += matchSaves
        }
      }
    })

    // Convert unique matches set to count
    playerStatsMap.forEach(playerStats => {
      playerStats.matches_played = playerStats.unique_matches.size
      delete playerStats.unique_matches // Clean up
    })

    // Calculate per-match ratios and unified scores
    playerStatsMap.forEach(playerStats => {
      if (playerStats.matches_played > 0) {
        // Goals per match excludes own goals (own goals are negative)
        playerStats.goals_per_match = Number((playerStats.goals / playerStats.matches_played).toFixed(2))
        playerStats.assists_per_match = Number((playerStats.assists / playerStats.matches_played).toFixed(2))
      }

      // Calculate average rating
      playerStats.average_rating = playerStats.rated_matches > 0
        ? Number((playerStats.total_ratings / playerStats.rated_matches).toFixed(2))
        : 0

      // Calculate Unified Score
      // Using constants defined at the top of the file for easy adjustment
      const goalsPoints = playerStats.goals * GOALS_POINT
      const assistsPoints = playerStats.assists * ASSIST_POINT
      const savesPoints = playerStats.saves * SAVES_POINT
      // Defenders get more points per clean sheet
      const cleanSheetsPoints = playerStats.is_defender
        ? playerStats.clean_sheets * CLEAN_SHEET_POINT_DEFENDER
        : playerStats.clean_sheets * CLEAN_SHEET_POINT_OTHER
      const ownGoalsPenalty = playerStats.own_goals * OWN_GOAL_PENALTY // Negative points
      // Defenders get rating × 2.6, others get rating × 2
      const ratingMultiplier = playerStats.is_defender ? RATING_MULTIPLIER_DEFENDER : RATING_MULTIPLIER_OTHER
      const matchRatingPoints = (playerStats.average_rating || 0) * ratingMultiplier

      playerStats.unified_score = Math.round((goalsPoints + assistsPoints + savesPoints + cleanSheetsPoints - ownGoalsPenalty + matchRatingPoints) * 10) / 10

      // Store breakdown for display
      playerStats.score_breakdown = {
        goals: goalsPoints,
        assists: assistsPoints,
        saves: savesPoints,
        clean_sheets: cleanSheetsPoints,
        own_goals: -ownGoalsPenalty,
        match_rating: matchRatingPoints
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

    // Top Performers (Unified Scoring System)
    // Includes: Goals (3pts), Assists (2pts), Saves (0.5pts), Clean Sheets (2pts), Own Goals (-2pts)
    const topPerformers = allPlayerStats
      .filter(player => player.unified_score > 0)
      .sort((a, b) => b.unified_score - a.unified_score)
      .slice(0, 10)

    // Most Minutes Played
    const mostMinutesPlayed = allPlayerStats
      .filter(player => player.total_minutes > 0)
      .sort((a, b) => b.total_minutes - a.total_minutes)
      .slice(0, 10)

    // Top Clean Sheets
    const topCleanSheets = allPlayerStats
      .filter(player => player.clean_sheets > 0)
      .sort((a, b) => b.clean_sheets - a.clean_sheets)
      .slice(0, 10)

    // Top Saves
    const topSaves = allPlayerStats
      .filter(player => player.saves > 0)
      .sort((a, b) => b.saves - a.saves)
      .slice(0, 10)

    return NextResponse.json({
      success: true,
      data: {
        topGoalScorers,
        topAssistMakers,
        mostActivePlayers,
        goalsPerMatch,
        topPerformers,
        mostMinutesPlayed,
        topCleanSheets,
        topSaves
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
