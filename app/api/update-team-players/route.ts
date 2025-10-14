import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminAuth, supabaseAdmin } from '@/lib/auth'

export async function PUT(request: NextRequest) {
  try {
    // Verify admin authentication
    const { error: authError, user } = await verifyAdminAuth(request)
    if (authError || !user) {
      return NextResponse.json(
        { error: authError || 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { matchId, teamA_players, teamB_players } = body

    // Validate required fields
    if (!matchId) {
      return NextResponse.json(
        { error: 'Match ID is required' },
        { status: 400 }
      )
    }

    // Get teams for this match
    const { data: teams, error: teamsError } = await supabaseAdmin()
      .from('teams')
      .select('*')
      .eq('match_id', matchId)
      .order('created_at')

    if (teamsError) {
      console.error('Error fetching teams:', teamsError)
      return NextResponse.json(
        { error: `Failed to fetch teams: ${teamsError.message}` },
        { status: 400 }
      )
    }

    if (!teams || teams.length < 2) {
      return NextResponse.json(
        { error: 'Match must have at least 2 teams' },
        { status: 400 }
      )
    }

    const teamA = teams[0]
    const teamB = teams[1]

    // Remove all existing match players for this match
    const { error: deleteError } = await supabaseAdmin()
      .from('match_players')
      .delete()
      .eq('match_id', matchId)

    if (deleteError) {
      console.error('Error deleting existing match players:', deleteError)
      return NextResponse.json(
        { error: `Failed to clear existing players: ${deleteError.message}` },
        { status: 400 }
      )
    }

    // Add new match players
    const matchPlayersToInsert = []

    // Add Team A players
    if (teamA_players && Array.isArray(teamA_players)) {
      for (const playerId of teamA_players) {
        matchPlayersToInsert.push({
          match_id: matchId,
          player_id: playerId,
          team_id: teamA.id
        })
      }
    }

    // Add Team B players
    if (teamB_players && Array.isArray(teamB_players)) {
      for (const playerId of teamB_players) {
        matchPlayersToInsert.push({
          match_id: matchId,
          player_id: playerId,
          team_id: teamB.id
        })
      }
    }

    if (matchPlayersToInsert.length > 0) {
      const { error: insertError } = await supabaseAdmin()
        .from('match_players')
        .insert(matchPlayersToInsert)

      if (insertError) {
        console.error('Error inserting match players:', insertError)
        return NextResponse.json(
          { error: `Failed to assign players: ${insertError.message}` },
          { status: 400 }
        )
      }
    }

    // Get updated match data with teams and players
    const { data: matchData, error: matchFetchError } = await supabaseAdmin()
      .from('matches')
      .select(`
        *,
        teams(*),
        match_players(
          *,
          player:players(
            *,
            user_profile:user_profiles(*)
          )
        )
      `)
      .eq('id', matchId)
      .single()

    if (matchFetchError) {
      console.error('Match fetch error:', matchFetchError)
      return NextResponse.json(
        { error: `Failed to fetch updated match: ${matchFetchError.message}` },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      match: matchData
    })

  } catch (error: any) {
    console.error('Team players update API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
