import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/auth'

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
    const { data: events, error: eventsError } = await supabaseAdmin()
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
    const { data: matchPlayers, error: matchPlayersError } = await supabaseAdmin()
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
              playerStats.set(playerId, { goals: 0, assists: 0, yellow_cards: 0, red_cards: 0, own_goals: 0, minutes_played: 90 })
            }
            playerStats.get(playerId).goals += 1
          }
        }

        // Handle assists
        if (event.assist) {
          const playerId = playerNameToIdMap.get(event.assist)
          if (playerId) {
            if (!playerStats.has(playerId)) {
              playerStats.set(playerId, { goals: 0, assists: 0, yellow_cards: 0, red_cards: 0, own_goals: 0, minutes_played: 90 })
            }
            playerStats.get(playerId).assists += 1
          }
        }
      } else if (event.event_type === 'own_goal') {
        // Handle own goals - count against the player who scored it
        if (event.scorer) {
          const playerId = playerNameToIdMap.get(event.scorer)
          if (playerId) {
            if (!playerStats.has(playerId)) {
              playerStats.set(playerId, { goals: 0, assists: 0, yellow_cards: 0, red_cards: 0, own_goals: 0, minutes_played: 90 })
            }
            playerStats.get(playerId).own_goals += 1
            // Own goals do NOT count as regular goals or assists
          }
        }
      } else if (event.event_type === 'card') {
        // Handle cards
        if (event.player) {
          const playerId = playerNameToIdMap.get(event.player)
          if (playerId) {
            if (!playerStats.has(playerId)) {
              playerStats.set(playerId, { goals: 0, assists: 0, yellow_cards: 0, red_cards: 0, own_goals: 0, minutes_played: 90 })
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
          own_goals: stats.own_goals || 0,
          minutes_played: stats.minutes_played
        })
      }
    }

    // Insert or update stats
    if (statsUpdates.length > 0) {
      const { error: statsError } = await supabaseAdmin()
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
      const { data: playerStats, error: playerStatsError } = await supabaseAdmin()
        .from('match_players')
        .select(`
          *,
          match:matches(*),
          team:teams(*),
          player:players(
            *,
            user_profile:user_profiles(*)
          ),
          stats(rating, goals, assists, yellow_cards, red_cards, minutes_played, own_goals)
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
            total_own_goals: 0,
            total_minutes: 0,
            total_clean_sheets: 0,
            total_saves: 0,
            average_rating: 0,
            matches_played: 0,
            recent_matches: []
          }
        })
      }

      // Debug: Log the raw data
      console.log('Raw playerStats (match_players with stats):', JSON.stringify(playerStats, null, 2))

      // Get saves from match_events for this player
      const { data: savesEvents, error: savesError } = await supabaseAdmin()
        .from('match_events')
        .select(`
          *,
          match:matches(*)
        `)
        .eq('event_type', 'save')
        .eq('player', playerStats[0]?.player?.user_profile?.name)

      if (savesError) {
        console.error('Error fetching saves:', savesError)
      }

      // Get clean sheets from match_events for this player
      const { data: cleanSheetsEvents, error: cleanSheetsError } = await supabaseAdmin()
        .from('match_events')
        .select(`
          *,
          match:matches(*)
        `)
        .eq('event_type', 'clean_sheet')
        .eq('player', playerStats[0]?.player?.user_profile?.name)

      if (cleanSheetsError) {
        console.error('Error fetching clean sheets:', cleanSheetsError)
      }

      // Create a map of saves per match
      const savesPerMatch = new Map()
      savesEvents?.forEach(save => {
        if (!savesPerMatch.has(save.match_id)) {
          savesPerMatch.set(save.match_id, 0)
        }
        savesPerMatch.set(save.match_id, savesPerMatch.get(save.match_id) + 1)
      })

      // Create a map of clean sheets per match
      const cleanSheetsPerMatch = new Map()
      cleanSheetsEvents?.forEach(cleanSheet => {
        if (!cleanSheetsPerMatch.has(cleanSheet.match_id)) {
          cleanSheetsPerMatch.set(cleanSheet.match_id, 0)
        }
        cleanSheetsPerMatch.set(cleanSheet.match_id, cleanSheetsPerMatch.get(cleanSheet.match_id) + 1)
      })

      // Aggregate stats from match_players with nested stats
      const aggregatedStats = {
        total_goals: 0,
        total_assists: 0,
        total_yellow_cards: 0,
        total_red_cards: 0,
        total_own_goals: 0,
        total_minutes: 0,
        total_clean_sheets: 0,
        total_saves: 0,
        total_ratings: 0,
        rated_matches: 0,
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
          own_goals: number
          minutes_played: number
          clean_sheets: number
          saves: number
          rating: number | null
        }>
      }

      // Get player position (from first match player record)
      const playerPosition = playerStats[0]?.position ||
                            playerStats[0]?.player?.user_profile?.position ||
                            playerStats[0]?.player?.preferred_position ||
                            null
      const isPlayerDefender = isDefender(playerPosition)

      // Process each match_player and their stats
      playerStats.forEach((matchPlayer, index) => {
        console.log(`Match Player ${index}:`, {
          match_id: matchPlayer.match?.id,
          player_name: matchPlayer.player?.user_profile?.name,
          has_stats: !!matchPlayer.stats
        })

        // Get the stats for this match_player (stats is an object, not array)
        const stats = matchPlayer.stats || null

        // Get clean sheets from events for this match (before auto-credit logic)
        const match = matchPlayer.match
        const playerTeam = matchPlayer.team
        let matchCleanSheets = cleanSheetsPerMatch.get(matchPlayer.match.id) || 0

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
          aggregatedStats.total_own_goals += stats.own_goals || 0
          aggregatedStats.total_clean_sheets += matchCleanSheets
          // Get saves from events for this match
          const matchSaves = savesPerMatch.get(matchPlayer.match.id) || 0
          aggregatedStats.total_saves += matchSaves
          // Use 90 minutes per match if minutes_played is 0 or not set
          aggregatedStats.total_minutes += stats.minutes_played || 90
          // Track ratings
          if (stats.rating !== null && stats.rating !== undefined) {
            aggregatedStats.total_ratings += stats.rating
            aggregatedStats.rated_matches += 1
          }

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
              own_goals: stats.own_goals || 0,
              minutes_played: stats.minutes_played || 90,
              clean_sheets: matchCleanSheets,
              saves: matchSaves,
              rating: stats.rating || null
            })
          }
        } else {
          // If no stats record exists, assume 90 minutes played
          aggregatedStats.total_minutes += 90
          aggregatedStats.total_clean_sheets += matchCleanSheets
          // Get saves from events for this match even if no stats record
          const matchSaves = savesPerMatch.get(matchPlayer.match.id) || 0
          aggregatedStats.total_saves += matchSaves

          // Add to recent matches with default values
          if (matchPlayer.match) {
            aggregatedStats.recent_matches.push({
              match_id: matchPlayer.match.id,
              date: matchPlayer.match.date,
              opponent: matchPlayer.match.opponent,
              teamA_name: matchPlayer.match.teamA_name,
              teamB_name: matchPlayer.match.teamB_name,
              goals: 0,
              assists: 0,
              yellow_cards: 0,
              red_cards: 0,
              own_goals: 0,
              minutes_played: 90,
              clean_sheets: matchCleanSheets,
              saves: matchSaves,
              rating: null
            })
          }
        }
      })

      // Sort recent matches by date and limit to 5
      aggregatedStats.recent_matches = aggregatedStats.recent_matches
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 5)

      // Calculate average rating
      const average_rating = aggregatedStats.rated_matches > 0
        ? aggregatedStats.total_ratings / aggregatedStats.rated_matches
        : 0

      // Debug: Log final aggregated stats
      console.log('Final aggregated stats:', {
        total_goals: aggregatedStats.total_goals,
        total_assists: aggregatedStats.total_assists,
        total_yellow_cards: aggregatedStats.total_yellow_cards,
        total_red_cards: aggregatedStats.total_red_cards,
        total_own_goals: aggregatedStats.total_own_goals,
        total_minutes: aggregatedStats.total_minutes,
        matches_played: aggregatedStats.matches_played,
        average_rating: average_rating,
        recent_matches_count: aggregatedStats.recent_matches.length
      })

      return NextResponse.json({
        success: true,
        stats: {
          ...aggregatedStats,
          average_rating: average_rating
        }
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
      const { data: allStats, error: allStatsError } = await supabaseAdmin()
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
