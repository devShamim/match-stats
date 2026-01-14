import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, verifyAdminAuth } from '@/lib/auth'

// Unified Scoring System Constants (same values as /api/leaderboards for consistency)
const GOALS_POINT = 3
const ASSIST_POINT = 2
const SAVES_POINT = 0.5
const CLEAN_SHEET_POINT_DEFENDER = 3
const CLEAN_SHEET_POINT_OTHER = 2
const OWN_GOAL_PENALTY = 2
const RATING_MULTIPLIER_DEFENDER = 2.6
const RATING_MULTIPLIER_OTHER = 2

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
         pos.includes('dm')
}

// GET - Get tournament prizes
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tournamentId = params.id

    const { data: prizes, error } = await supabaseAdmin()
      .from('tournament_prizes')
      .select(`
        *,
        recipient_team:persistent_teams(id, name),
        recipient_player:players(
          id,
          user_profile:user_profiles(name, photo_url)
        )
      `)
      .eq('tournament_id', tournamentId)
      .order('category', { ascending: true })
      .order('rank', { ascending: true })

    if (error) {
      console.error('Error fetching prizes:', error)
      return NextResponse.json(
        { error: 'Failed to fetch prizes' },
        { status: 400 }
      )
    }

    return NextResponse.json({ prizes: prizes || [] })
  } catch (error: any) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Calculate and award prizes automatically
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tournamentId = params.id

    const normalizeName = (s: unknown) =>
      String(s || '')
        .trim()
        .toLowerCase()

    // Get tournament
    const { data: tournament } = await supabaseAdmin()
      .from('tournaments')
      .select('*')
      .eq('id', tournamentId)
      .single()

    if (!tournament) {
      return NextResponse.json(
        { error: 'Tournament not found' },
        { status: 404 }
      )
    }

    // Map match team names -> persistent team ids for this tournament
    // (match_players.team_id points to per-match `teams`, but prizes FK expects `persistent_teams`)
    const { data: tournamentTeamsForMap } = await supabaseAdmin()
      .from('tournament_teams')
      .select('team_id, team:persistent_teams(id, name)')
      .eq('tournament_id', tournamentId)

    const persistentTeamIdByName = new Map<string, string>()
    ;(tournamentTeamsForMap || []).forEach((tt: any) => {
      const name = tt?.team?.name
      const id = tt?.team_id
      if (name && id) persistentTeamIdByName.set(normalizeName(name), id)
    })

    // Get standings
    const { data: standings } = await supabaseAdmin()
      .from('tournament_standings')
      .select(`
        *,
        team:persistent_teams(*)
      `)
      .eq('tournament_id', tournamentId)
      .is('group_name', null)
      .order('points', { ascending: false })
      .order('goal_difference', { ascending: false })
      .order('goals_for', { ascending: false })

    // Get player stats from completed matches (same logic as player-stats endpoint)
    const { data: completedMatches } = await supabaseAdmin()
      .from('matches')
      .select('id')
      .eq('tournament_id', tournamentId)
      .eq('status', 'completed')

    let playerStats: any[] = []

    if (completedMatches && completedMatches.length > 0) {
      const matchIds = completedMatches.map(m => m.id)

      // Pull saves + clean sheets from match_events (same source as leaderboards)
      const { data: matchEvents } = await supabaseAdmin()
        .from('match_events')
        .select('match_id, event_type, player')
        .in('match_id', matchIds)
        .in('event_type', ['save', 'clean_sheet'])

      const savesPerPlayerPerMatch = new Map<string, number>()
      const cleanSheetsPerPlayerPerMatch = new Map<string, number>()
      ;(matchEvents || []).forEach((e: any) => {
        const key = `${e.match_id}-${e.player}`
        if (e.event_type === 'save') {
          savesPerPlayerPerMatch.set(key, (savesPerPlayerPerMatch.get(key) || 0) + 1)
        } else if (e.event_type === 'clean_sheet') {
          cleanSheetsPerPlayerPerMatch.set(key, (cleanSheetsPerPlayerPerMatch.get(key) || 0) + 1)
        }
      })

      const { data: matchPlayers } = await supabaseAdmin()
        .from('match_players')
        .select(`
          match_id,
          player_id,
          team_id,
          stats(goals, assists, rating, clean_sheets, saves, own_goals),
          player:players(
            id,
            user_profile:user_profiles(name, position)
          ),
          team:teams!match_players_team_id_fkey(
            name
          )
        `)
        .in('match_id', matchIds)

      // Aggregate stats by player
      const playerStatsMap = new Map<string, any>()

      matchPlayers?.forEach(mp => {
        if (!mp.player_id || !mp.player) return

        const matchTeamName = (mp as any)?.team?.name
        const persistentTeamId =
          matchTeamName ? (persistentTeamIdByName.get(normalizeName(matchTeamName)) || null) : null

        const playerId = mp.player_id
        if (!playerStatsMap.has(playerId)) {
          playerStatsMap.set(playerId, {
            player_id: playerId,
            player: mp.player,
            // Use persistent team id for downstream consumers (prizes FK)
            team_id: persistentTeamId,
            team: mp.team,
            position: (mp as any)?.player?.user_profile?.position || null,
            is_defender: isDefender((mp as any)?.player?.user_profile?.position),
            matches_played: 0,
            goals: 0,
            assists: 0,
            clean_sheets: 0,
            saves: 0,
            own_goals: 0,
            total_rating: 0,
            rated_matches: 0,
            average_rating: 0
          })
        }

        const stats = playerStatsMap.get(playerId)!
        stats.matches_played++

        const playerName = (mp as any)?.player?.user_profile?.name
        const key = `${(mp as any).match_id}-${playerName}`
        // Prefer event-based saves/clean sheets (source of truth)
        stats.saves += savesPerPlayerPerMatch.get(key) || 0
        stats.clean_sheets += cleanSheetsPerPlayerPerMatch.get(key) || 0

        if (mp.stats) {
          const s = mp.stats as any
          stats.goals += s.goals || 0
          stats.assists += s.assists || 0
          stats.own_goals += s.own_goals || 0
          if (s.rating !== null && s.rating !== undefined) {
            stats.total_rating += s.rating
            stats.rated_matches++
          }
        }
      })

      playerStats = Array.from(playerStatsMap.values()).map(ps => ({
        ...ps,
        average_rating: ps.rated_matches > 0 ? ps.total_rating / ps.rated_matches : 0,
        goal_contributions: (ps.goals || 0) + (ps.assists || 0),
        goalkeeper_score: (ps.saves || 0) + (ps.clean_sheets || 0),
        unified_score: (() => {
          const goalsPoints = (ps.goals || 0) * GOALS_POINT
          const assistsPoints = (ps.assists || 0) * ASSIST_POINT
          const savesPoints = (ps.saves || 0) * SAVES_POINT
          const cleanSheetsPoints = ps.is_defender
            ? (ps.clean_sheets || 0) * CLEAN_SHEET_POINT_DEFENDER
            : (ps.clean_sheets || 0) * CLEAN_SHEET_POINT_OTHER
          const ownGoalsPenalty = (ps.own_goals || 0) * OWN_GOAL_PENALTY
          const ratingMultiplier = ps.is_defender ? RATING_MULTIPLIER_DEFENDER : RATING_MULTIPLIER_OTHER
          const matchRatingPoints = (ps.average_rating || 0) * ratingMultiplier
          return Math.round((goalsPoints + assistsPoints + savesPoints + cleanSheetsPoints - ownGoalsPenalty + matchRatingPoints) * 10) / 10
        })()
      }))
    }

    const prizes: any[] = []

    // Award team prizes (1st, 2nd, 3rd place)
    if (standings && standings.length > 0) {
      const top3 = standings.slice(0, 3)
      top3.forEach((standing, index) => {
        if (standing.team_id) {
          prizes.push({
            tournament_id: tournamentId,
            category: 'team_rank',
            rank: index + 1,
            recipient_type: 'team',
            recipient_team_id: standing.team_id,
            recipient_player_id: null,
            prize_amount: null,
            prize_description: `${index + 1 === 1 ? 'Champion' : index + 1 === 2 ? 'Runner-up' : 'Third Place'}`,
            awarded_at: new Date().toISOString()
          })
        }
      })
    }

    // Award individual prizes
    if (playerStats && playerStats.length > 0) {
      const awardAllTied = (
        category: string,
        valueKey: string,
        valueLabel: (value: number) => string
      ) => {
        const max = Math.max(...playerStats.map(p => Number(p[valueKey] || 0)))
        if (!isFinite(max) || max <= 0) return

        const winners = playerStats.filter(p => Number(p[valueKey] || 0) === max)
        const isTie = winners.length > 1

        winners.forEach((w) => {
          prizes.push({
            tournament_id: tournamentId,
            category,
            rank: null,
            recipient_type: 'player',
            recipient_team_id: w.team_id || null,
            recipient_player_id: w.player_id,
            prize_amount: null,
            prize_description: `${isTie ? 'Tied ' : ''}${valueLabel(max)}`,
            awarded_at: new Date().toISOString()
          })
        })
      }

      // Top Goals
      awardAllTied('top_goals', 'goals', (v) => `Top Goals (${v} goals)`)

      // Top Assists
      awardAllTied('top_assists', 'assists', (v) => `Top Assists (${v} assists)`)

      // Most Valuable Player (Goals + Assists)
      const byGoalContrib = [...playerStats]
        .sort((a, b) => (b.goal_contributions || 0) - (a.goal_contributions || 0))

      const mvp = byGoalContrib[0]
      if (mvp && (mvp.goal_contributions || 0) > 0) {
        prizes.push({
          tournament_id: tournamentId,
          category: 'most_valuable_player',
          rank: null,
          recipient_type: 'player',
          recipient_team_id: mvp.team_id || null,
          recipient_player_id: mvp.player_id,
          prize_amount: null,
          prize_description: `Most Valuable Player (${mvp.goal_contributions} G+A)`,
          awarded_at: new Date().toISOString()
        })
      }

      /**
       * Player of the Tournament (Goals + Assists)
       * Check if there's a manual selection first, otherwise auto-calculate.
       * We require at least 2 matches to avoid 1-match outliers.
       * If it would duplicate MVP, pick the next best eligible player.
       */
      // Check for existing manual selection before calculating
      const { data: existingManualPot } = await supabaseAdmin()
        .from('tournament_prizes')
        .select('*')
        .eq('tournament_id', tournamentId)
        .eq('category', 'player_of_tournament')
        .like('prize_description', '%Manual Selection%')
        .maybeSingle()

      if (!existingManualPot) {
        // Auto-calculate if no manual selection exists
        const potEligible = byGoalContrib.filter(p => (p.matches_played || 0) >= 2 && (p.goal_contributions || 0) > 0)
        const pot = potEligible.find(p => p.player_id !== mvp?.player_id) || potEligible[0]
        if (pot && (pot.goal_contributions || 0) > 0) {
          prizes.push({
            tournament_id: tournamentId,
            category: 'player_of_tournament',
            rank: null,
            recipient_type: 'player',
            recipient_team_id: pot.team_id || null,
            recipient_player_id: pot.player_id,
            prize_amount: null,
            prize_description: `Player of the Tournament (${pot.goal_contributions} G+A)`,
            awarded_at: new Date().toISOString()
          })
        }
      }

      // Most Saves
      awardAllTied('most_saves', 'saves', (v) => `Most Saves (${v} saves)`)

      // Best Goalkeeper (Saves + Clean Sheets)
      // For GK we tie-break by awarding all tied on GK score (saves+clean sheets)
      const maxGK = Math.max(...playerStats.map(p => Number(p.goalkeeper_score || 0)))
      if (isFinite(maxGK) && maxGK > 0) {
        const winners = playerStats.filter(p => Number(p.goalkeeper_score || 0) === maxGK)
        const isTie = winners.length > 1
        winners.forEach((w) => {
          prizes.push({
            tournament_id: tournamentId,
            category: 'best_goalkeeper',
            rank: null,
            recipient_type: 'player',
            recipient_team_id: w.team_id || null,
            recipient_player_id: w.player_id,
            prize_amount: null,
            prize_description: `${isTie ? 'Tied ' : ''}Best Goalkeeper (${w.saves} saves + ${w.clean_sheets} clean sheets)`,
            awarded_at: new Date().toISOString()
          })
        })
      }

      // Top Performer (Unified Scoring System)
      // Award all tied on unified score
      const maxUnified = Math.max(...playerStats.map(p => Number(p.unified_score || 0)))
      if (isFinite(maxUnified) && maxUnified > 0) {
        const winners = playerStats.filter(p => Number(p.unified_score || 0) === maxUnified)
        const isTie = winners.length > 1
        winners.forEach((w) => {
          prizes.push({
            tournament_id: tournamentId,
            category: 'top_performer',
            rank: null,
            recipient_type: 'player',
            recipient_team_id: w.team_id || null,
            recipient_player_id: w.player_id,
            prize_amount: null,
            prize_description: `${isTie ? 'Tied ' : ''}Top Performer (Unified Score ${w.unified_score})`,
            awarded_at: new Date().toISOString()
          })
        })
      }
    }

    // Delete existing prizes (except manual Player of Tournament) and insert new ones
    // Check if there's a manual selection to preserve
    const { data: manualPot } = await supabaseAdmin()
      .from('tournament_prizes')
      .select('*')
      .eq('tournament_id', tournamentId)
      .eq('category', 'player_of_tournament')
      .like('prize_description', '%Manual Selection%')
      .maybeSingle()

    // Delete all prizes except manual Player of Tournament
    if (manualPot) {
      await supabaseAdmin()
        .from('tournament_prizes')
        .delete()
        .eq('tournament_id', tournamentId)
        .neq('id', manualPot.id)
    } else {
      await supabaseAdmin()
        .from('tournament_prizes')
        .delete()
        .eq('tournament_id', tournamentId)
    }

    // Insert new prizes (exclude id field to let database auto-generate)
    if (prizes.length > 0) {
      // Remove id field from all prize objects to ensure auto-generation
      const prizesToInsert = prizes.map(({ id, ...prize }) => prize)

      const { error: insertError } = await supabaseAdmin()
        .from('tournament_prizes')
        .insert(prizesToInsert)

      if (insertError) {
        console.error('Error inserting prizes:', insertError)
        return NextResponse.json(
          { error: 'Failed to award prizes' },
          { status: 400 }
        )
      }
    }

    // Add manual selection back to response if it exists
    if (manualPot) {
      prizes.push(manualPot)
    }

    return NextResponse.json({
      success: true,
      prizes_awarded: prizes.length,
      prizes
    })
  } catch (error: any) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT - Manually set Player of the Tournament
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify admin authentication
    const { error: authError, user } = await verifyAdminAuth(request)
    if (authError || !user) {
      return NextResponse.json(
        { error: authError || 'Authentication required' },
        { status: 401 }
      )
    }

    const tournamentId = params.id
    const body = await request.json()
    const { player_id, team_id } = body

    if (!player_id) {
      return NextResponse.json(
        { error: 'Player ID is required' },
        { status: 400 }
      )
    }

    // Get player info
    const { data: player, error: playerError } = await supabaseAdmin()
      .from('players')
      .select(`
        id,
        user_profile:user_profiles(name)
      `)
      .eq('id', player_id)
      .single()

    if (playerError || !player) {
      return NextResponse.json(
        { error: 'Player not found' },
        { status: 404 }
      )
    }

    // Delete existing Player of Tournament prize
    await supabaseAdmin()
      .from('tournament_prizes')
      .delete()
      .eq('tournament_id', tournamentId)
      .eq('category', 'player_of_tournament')

    // Insert manual selection
    const { data: newPrize, error: insertError } = await supabaseAdmin()
      .from('tournament_prizes')
      .insert({
        tournament_id: tournamentId,
        category: 'player_of_tournament',
        rank: null,
        recipient_type: 'player',
        recipient_team_id: team_id || null,
        recipient_player_id: player_id,
        prize_amount: null,
        prize_description: `Player of the Tournament (Manual Selection)`,
        awarded_at: new Date().toISOString()
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error inserting manual Player of Tournament:', insertError)
      return NextResponse.json(
        { error: 'Failed to set Player of the Tournament' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      prize: newPrize
    })
  } catch (error: any) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
