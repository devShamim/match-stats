import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/auth'

// GET - Get tournament details
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tournamentId = params.id

    // Get tournament
    const { data: tournament, error: tournamentError } = await supabaseAdmin()
      .from('tournaments')
      .select('*')
      .eq('id', tournamentId)
      .single()

    if (tournamentError || !tournament) {
      return NextResponse.json(
        { error: 'Tournament not found' },
        { status: 404 }
      )
    }

    // Get registered teams
    const { data: tournamentTeams, error: teamsError } = await supabaseAdmin()
      .from('tournament_teams')
      .select(`
        *,
        team:persistent_teams(
          *,
          captain:players!persistent_teams_captain_id_fkey(
            *,
            user_profile:user_profiles(*)
          )
        )
      `)
      .eq('tournament_id', tournamentId)

    if (teamsError) {
      console.error('Error fetching tournament teams:', teamsError)
    }

    // Get standings
    const { data: standings, error: standingsError } = await supabaseAdmin()
      .from('tournament_standings')
      .select(`
        *,
        team:persistent_teams(*)
      `)
      .eq('tournament_id', tournamentId)
      .order('points', { ascending: false })
      .order('goal_difference', { ascending: false })

    if (standingsError) {
      console.error('Error fetching standings:', standingsError)
    }

    // Get tournament matches
    const { data: matches, error: matchesError } = await supabaseAdmin()
      .from('matches')
      .select('*')
      .eq('tournament_id', tournamentId)
      .order('date', { ascending: true })

    if (matchesError) {
      console.error('Error fetching tournament matches:', matchesError)
    }

    return NextResponse.json({
      tournament: {
        ...tournament,
        teams: tournamentTeams || [],
        standings: standings || [],
        matches: matches || []
      }
    })
  } catch (error: any) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT - Update tournament
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tournamentId = params.id
    const body = await request.json()

    const updateData: any = {}
    const allowedFields = [
      'name', 'description', 'type', 'status', 'start_date', 'end_date',
      'max_teams', 'min_players_per_team', 'max_players_per_team',
      'points_per_win', 'points_per_draw', 'points_per_loss', 'prize_structure'
    ]

    allowedFields.forEach(field => {
      if (body[field] !== undefined) {
        updateData[field] = body[field]
      }
    })

    const { data: tournament, error } = await supabaseAdmin()
      .from('tournaments')
      .update(updateData)
      .eq('id', tournamentId)
      .select()
      .single()

    if (error) {
      console.error('Error updating tournament:', error)
      return NextResponse.json(
        { error: `Failed to update tournament: ${error.message}` },
        { status: 400 }
      )
    }

    return NextResponse.json({ tournament })
  } catch (error: any) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE - Delete tournament and all related data
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tournamentId = params.id

    // First, get all matches for this tournament
    const { data: tournamentMatches, error: matchesError } = await supabaseAdmin()
      .from('matches')
      .select('id')
      .eq('tournament_id', tournamentId)

    if (matchesError) {
      console.error('Error fetching tournament matches:', matchesError)
      return NextResponse.json(
        { error: `Failed to fetch tournament matches: ${matchesError.message}` },
        { status: 400 }
      )
    }

    const matchIds = tournamentMatches?.map(m => m.id) || []

    if (matchIds.length > 0) {
      // Delete all match_events for these matches
      const { error: eventsError } = await supabaseAdmin()
        .from('match_events')
        .delete()
        .in('match_id', matchIds)

      if (eventsError) {
        console.error('Error deleting match events:', eventsError)
      }

      // Get all match_players for these matches
      const { data: matchPlayers, error: mpError } = await supabaseAdmin()
        .from('match_players')
        .select('id')
        .in('match_id', matchIds)

      if (!mpError && matchPlayers) {
        const matchPlayerIds = matchPlayers.map(mp => mp.id)

        // Delete all stats for these match_players
        if (matchPlayerIds.length > 0) {
          const { error: statsError } = await supabaseAdmin()
            .from('stats')
            .delete()
            .in('match_player_id', matchPlayerIds)

          if (statsError) {
            console.error('Error deleting stats:', statsError)
          }
        }

        // Delete all match_players
        const { error: matchPlayersError } = await supabaseAdmin()
          .from('match_players')
          .delete()
          .in('match_id', matchIds)

        if (matchPlayersError) {
          console.error('Error deleting match players:', matchPlayersError)
        }
      }

      // Get all teams (match-specific teams, not persistent_teams) for these matches
      const { data: matchTeams, error: teamsError } = await supabaseAdmin()
        .from('teams')
        .select('id')
        .in('match_id', matchIds)

      if (!teamsError && matchTeams) {
        // Delete all match-specific teams
        const { error: deleteTeamsError } = await supabaseAdmin()
          .from('teams')
          .delete()
          .in('match_id', matchIds)

        if (deleteTeamsError) {
          console.error('Error deleting match teams:', deleteTeamsError)
        }
      }

      // Delete all matches
      const { error: deleteMatchesError } = await supabaseAdmin()
        .from('matches')
        .delete()
        .in('id', matchIds)

      if (deleteMatchesError) {
        console.error('Error deleting matches:', deleteMatchesError)
        return NextResponse.json(
          { error: `Failed to delete matches: ${deleteMatchesError.message}` },
          { status: 400 }
        )
      }
    }

    // Delete the tournament
    // This will cascade delete:
    // - tournament_teams (registration records, but NOT persistent_teams themselves)
    // - tournament_standings
    // - tournament_player_stats
    // - tournament_prizes
    const { error: deleteError } = await supabaseAdmin()
      .from('tournaments')
      .delete()
      .eq('id', tournamentId)

    if (deleteError) {
      console.error('Error deleting tournament:', deleteError)
      return NextResponse.json(
        { error: `Failed to delete tournament: ${deleteError.message}` },
        { status: 400 }
      )
    }

    return NextResponse.json({ success: true, message: 'Tournament and all related data deleted successfully' })
  } catch (error: any) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
