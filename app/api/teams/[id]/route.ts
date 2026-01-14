import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, verifyAdminAuth } from '@/lib/auth'

// GET - Get team details with players
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const teamId = params.id

    // Get team details
    const { data: team, error: teamError } = await supabaseAdmin()
      .from('persistent_teams')
      .select(`
        *,
        captain:players!persistent_teams_captain_id_fkey(
          *,
          user_profile:user_profiles(*)
        )
      `)
      .eq('id', teamId)
      .single()

    if (teamError || !team) {
      return NextResponse.json(
        { error: 'Team not found' },
        { status: 404 }
      )
    }

    // Get team players
    const { data: teamPlayers, error: playersError } = await supabaseAdmin()
      .from('team_players')
      .select(`
        *,
        player:players(
          *,
          user_profile:user_profiles(*)
        )
      `)
      .eq('team_id', teamId)
      // Supabase JS typings support `nullsFirst` (not `nullsLast`).
      // Setting `nullsFirst: false` yields "NULLS LAST" behavior.
      .order('jersey_number', { ascending: true, nullsFirst: false })

    if (playersError) {
      console.error('Error fetching team players:', playersError)
    }

    return NextResponse.json({
      team: {
        ...team,
        players: teamPlayers || []
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

// PUT - Update team
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await verifyAdminAuth(request)
    if (auth.error) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.error === 'Admin access required' ? 403 : 401 }
      )
    }

    const teamId = params.id
    const body = await request.json()
    const { name, logo_url, color, captain_id } = body

    // Check if team exists
    const { data: existingTeam } = await supabaseAdmin()
      .from('persistent_teams')
      .select('id, name')
      .eq('id', teamId)
      .single()

    if (!existingTeam) {
      return NextResponse.json(
        { error: 'Team not found' },
        { status: 404 }
      )
    }

    // Check if name is being changed and if it already exists
    if (name && name !== existingTeam.name) {
      const { data: nameCheck } = await supabaseAdmin()
        .from('persistent_teams')
        .select('id')
        .eq('name', name)
        .single()

      if (nameCheck) {
        return NextResponse.json(
          { error: 'Team name already exists' },
          { status: 400 }
        )
      }
    }

    const updateData: any = {}
    if (name !== undefined) updateData.name = name
    if (logo_url !== undefined) updateData.logo_url = logo_url
    if (color !== undefined) updateData.color = color
    if (captain_id !== undefined) updateData.captain_id = captain_id

    const { data: team, error } = await supabaseAdmin()
      .from('persistent_teams')
      .update(updateData)
      .eq('id', teamId)
      .select(`
        *,
        captain:players!persistent_teams_captain_id_fkey(
          *,
          user_profile:user_profiles(*)
        )
      `)
      .single()

    if (error) {
      console.error('Error updating team:', error)
      return NextResponse.json(
        { error: `Failed to update team: ${error.message}` },
        { status: 400 }
      )
    }

    return NextResponse.json({ team })
  } catch (error: any) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE - Delete team
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await verifyAdminAuth(request)
    if (auth.error) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.error === 'Admin access required' ? 403 : 401 }
      )
    }

    const teamId = params.id

    const { error } = await supabaseAdmin()
      .from('persistent_teams')
      .delete()
      .eq('id', teamId)

    if (error) {
      console.error('Error deleting team:', error)
      return NextResponse.json(
        { error: `Failed to delete team: ${error.message}` },
        { status: 400 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
