import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const matchId = params.id

    if (!matchId) {
      return NextResponse.json(
        { error: 'Match ID is required' },
        { status: 400 }
      )
    }

    // Get match with teams and players
    const { data: match, error: matchError } = await supabaseAdmin()
      .from('matches')
      .select(`
        *,
        teams(*),
        match_players(
          *,
          player:players(
            *,
            user_profile:user_profiles(*)
          ),
          team:teams(*)
        )
      `)
      .eq('id', matchId)
      .single()

    if (matchError) {
      console.error('Error fetching match:', matchError)
      return NextResponse.json(
        { error: `Failed to fetch match: ${matchError.message}` },
        { status: 400 }
      )
    }

    // Get match events
    const { data: events, error: eventsError } = await supabaseAdmin()
      .from('match_events')
      .select('*')
      .eq('match_id', matchId)
      .order('minute', { ascending: true })

    if (eventsError) {
      console.error('Error fetching events:', eventsError)
    }

    // Organize events by type
    const goals = events?.filter(e => e.event_type === 'goal') || []
    const cards = events?.filter(e => e.event_type === 'card') || []
    const substitutions = events?.filter(e => e.event_type === 'substitution') || []
    const saves = events?.filter(e => e.event_type === 'save') || []
    const cleanSheets = events?.filter(e => e.event_type === 'clean_sheet') || []

    // Get team players - with fallback if match_players table doesn't exist
    let teamAPlayers: string[] = []
    let teamBPlayers: string[] = []
    let teamAPlayerIds: string[] = []
    let teamBPlayerIds: string[] = []

    if (match.match_players && match.match_players.length > 0) {
      // Get teams ordered by creation time (first team = Team A, second team = Team B)
      const teams = match.teams?.sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) || []

      if (teams.length >= 2) {
        const teamAId = teams[0].id
        const teamBId = teams[1].id

        const teamAPlayersData = match.match_players.filter((mp: any) => mp.team_id === teamAId)
        teamAPlayers = teamAPlayersData.map((mp: any) => mp.player?.user_profile?.name).filter(Boolean) || []
        teamAPlayerIds = teamAPlayersData.map((mp: any) => mp.player?.id).filter(Boolean) || []

        const teamBPlayersData = match.match_players.filter((mp: any) => mp.team_id === teamBId)
        teamBPlayers = teamBPlayersData.map((mp: any) => mp.player?.user_profile?.name).filter(Boolean) || []
        teamBPlayerIds = teamBPlayersData.map((mp: any) => mp.player?.id).filter(Boolean) || []
      }
    } else {
      // Fallback: Get all players if match_players table doesn't exist
      const { data: allPlayers, error: playersError } = await supabaseAdmin()
        .from('players')
        .select(`
          *,
          user_profile:user_profiles(*)
        `)

      if (!playersError && allPlayers) {
        const playerNames = allPlayers.map(p => p.user_profile?.name).filter(Boolean)
        const playerIds = allPlayers.map(p => p.id).filter(Boolean)
        teamAPlayers = playerNames
        teamBPlayers = playerNames
        teamAPlayerIds = playerIds
        teamBPlayerIds = playerIds
      }
    }


    const details = {
      goals: goals.map(goal => ({
        id: goal.id,
        minute: goal.minute,
        scorer: goal.scorer,
        assist: goal.assist,
        team: goal.team
      })),
      cards: cards.map(card => ({
        id: card.id,
        minute: card.minute,
        player: card.player,
        type: card.card_type,
        team: card.team
      })),
      substitutions: substitutions.map(sub => ({
        id: sub.id,
        minute: sub.minute,
        playerOut: sub.player_out,
        playerIn: sub.player_in,
        team: sub.team
      })),
      saves: saves.map(save => ({
        id: save.id,
        minute: save.minute,
        player: save.player,
        team: save.team
      })),
      clean_sheets: cleanSheets.map(cleanSheet => ({
        id: cleanSheet.id,
        player: cleanSheet.player,
        team: cleanSheet.team
      })),
      stats: {
        possession_teamA: match.possession_teama || 50,
        possession_teamB: match.possession_teamb || 50,
        shots_teamA: match.shots_teama || 0,
        shots_teamB: match.shots_teamb || 0,
        shots_on_target_teamA: match.shots_on_target_teama || 0,
        shots_on_target_teamB: match.shots_on_target_teamb || 0,
        fouls_teamA: match.fouls_teama || 0,
        fouls_teamB: match.fouls_teamb || 0
      },
      match_summary: match.match_summary || '',
      teamAPlayers,
      teamBPlayers,
      teamAPlayerIds,
      teamBPlayerIds,
      teamAName: match.teamA_name || 'Team A',
      teamBName: match.teamB_name || 'Team B'
    }

    return NextResponse.json({
      success: true,
      details
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Surrogate-Control': 'no-store'
      }
    })

  } catch (error: any) {
    console.error('Match details API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
