import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/auth'

// POST - Register a team to tournament
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tournamentId = params.id
    const body = await request.json()
    const { team_id, group_name, seed } = body

    if (!team_id) {
      return NextResponse.json(
        { error: 'Team ID is required' },
        { status: 400 }
      )
    }

    // Check if tournament exists and is accepting registrations
    const { data: tournament } = await supabaseAdmin()
      .from('tournaments')
      .select('max_teams, status')
      .eq('id', tournamentId)
      .single()

    if (!tournament) {
      return NextResponse.json(
        { error: 'Tournament not found' },
        { status: 404 }
      )
    }

    if (tournament.status !== 'draft' && tournament.status !== 'registration') {
      return NextResponse.json(
        { error: 'Tournament is not accepting registrations' },
        { status: 400 }
      )
    }

    // Check max teams limit
    if (tournament.max_teams) {
      const { count } = await supabaseAdmin()
        .from('tournament_teams')
        .select('*', { count: 'exact', head: true })
        .eq('tournament_id', tournamentId)

      if ((count || 0) >= tournament.max_teams) {
        return NextResponse.json(
          { error: 'Tournament has reached maximum team limit' },
          { status: 400 }
        )
      }
    }

    // Check if team is already registered
    const { data: existing } = await supabaseAdmin()
      .from('tournament_teams')
      .select('id')
      .eq('tournament_id', tournamentId)
      .eq('team_id', team_id)
      .single()

    if (existing) {
      return NextResponse.json(
        { error: 'Team is already registered in this tournament' },
        { status: 400 }
      )
    }

    const { data: tournamentTeam, error } = await supabaseAdmin()
      .from('tournament_teams')
      .insert({
        tournament_id: tournamentId,
        team_id,
        group_name: group_name || null,
        seed: seed || null,
        status: 'registered'
      })
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
      .single()

    if (error) {
      console.error('Error registering team:', error)
      return NextResponse.json(
        { error: `Failed to register team: ${error.message}` },
        { status: 400 }
      )
    }

    // Initialize standings for this team
    await supabaseAdmin()
      .from('tournament_standings')
      .insert({
        tournament_id: tournamentId,
        team_id,
        group_name: group_name || null,
        matches_played: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        goals_for: 0,
        goals_against: 0,
        goal_difference: 0,
        points: 0
      })

    return NextResponse.json({ tournamentTeam }, { status: 201 })
  } catch (error: any) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE - Unregister team from tournament
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tournamentId = params.id
    const { searchParams } = new URL(request.url)
    const team_id = searchParams.get('team_id')

    if (!team_id) {
      return NextResponse.json(
        { error: 'Team ID is required' },
        { status: 400 }
      )
    }

    // Delete tournament team registration
    const { error: deleteError } = await supabaseAdmin()
      .from('tournament_teams')
      .delete()
      .eq('tournament_id', tournamentId)
      .eq('team_id', team_id)

    if (deleteError) {
      console.error('Error unregistering team:', deleteError)
      return NextResponse.json(
        { error: `Failed to unregister team: ${deleteError.message}` },
        { status: 400 }
      )
    }

    // Delete standings
    await supabaseAdmin()
      .from('tournament_standings')
      .delete()
      .eq('tournament_id', tournamentId)
      .eq('team_id', team_id)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
