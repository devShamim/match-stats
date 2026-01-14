import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/auth'

// POST - Add player to team
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const teamId = params.id
    const body = await request.json()
    const { player_id, jersey_number, position, is_captain } = body

    if (!player_id) {
      return NextResponse.json(
        { error: 'Player ID is required' },
        { status: 400 }
      )
    }

    // Check if player is already in team
    const { data: existing } = await supabaseAdmin()
      .from('team_players')
      .select('id')
      .eq('team_id', teamId)
      .eq('player_id', player_id)
      .single()

    if (existing) {
      return NextResponse.json(
        { error: 'Player is already in this team' },
        { status: 400 }
      )
    }

    // If setting as captain, remove captain flag from other players
    if (is_captain) {
      await supabaseAdmin()
        .from('team_players')
        .update({ is_captain: false })
        .eq('team_id', teamId)
    }

    const { data: teamPlayer, error } = await supabaseAdmin()
      .from('team_players')
      .insert({
        team_id: teamId,
        player_id,
        jersey_number: jersey_number || null,
        position: position || null,
        is_captain: is_captain || false
      })
      .select(`
        *,
        player:players(
          *,
          user_profile:user_profiles(*)
        )
      `)
      .single()

    if (error) {
      console.error('Error adding player to team:', error)
      return NextResponse.json(
        { error: `Failed to add player: ${error.message}` },
        { status: 400 }
      )
    }

    // Update team captain if needed
    if (is_captain) {
      await supabaseAdmin()
        .from('persistent_teams')
        .update({ captain_id: player_id })
        .eq('id', teamId)
    }

    return NextResponse.json({ teamPlayer }, { status: 201 })
  } catch (error: any) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT - Update team player
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const teamId = params.id
    const body = await request.json()
    const { player_id, jersey_number, position, is_captain } = body

    if (!player_id) {
      return NextResponse.json(
        { error: 'Player ID is required' },
        { status: 400 }
      )
    }

    // If setting as captain, remove captain flag from other players
    if (is_captain) {
      await supabaseAdmin()
        .from('team_players')
        .update({ is_captain: false })
        .eq('team_id', teamId)
        .neq('player_id', player_id)
    }

    const updateData: any = {}
    if (jersey_number !== undefined) updateData.jersey_number = jersey_number
    if (position !== undefined) updateData.position = position
    if (is_captain !== undefined) updateData.is_captain = is_captain

    const { data: teamPlayer, error } = await supabaseAdmin()
      .from('team_players')
      .update(updateData)
      .eq('team_id', teamId)
      .eq('player_id', player_id)
      .select(`
        *,
        player:players(
          *,
          user_profile:user_profiles(*)
        )
      `)
      .single()

    if (error) {
      console.error('Error updating team player:', error)
      return NextResponse.json(
        { error: `Failed to update player: ${error.message}` },
        { status: 400 }
      )
    }

    // Update team captain if needed
    if (is_captain) {
      await supabaseAdmin()
        .from('persistent_teams')
        .update({ captain_id: player_id })
        .eq('id', teamId)
    }

    return NextResponse.json({ teamPlayer })
  } catch (error: any) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE - Remove player from team
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const teamId = params.id
    const { searchParams } = new URL(request.url)
    const player_id = searchParams.get('player_id')

    if (!player_id) {
      return NextResponse.json(
        { error: 'Player ID is required' },
        { status: 400 }
      )
    }

    const { error } = await supabaseAdmin()
      .from('team_players')
      .delete()
      .eq('team_id', teamId)
      .eq('player_id', player_id)

    if (error) {
      console.error('Error removing player from team:', error)
      return NextResponse.json(
        { error: `Failed to remove player: ${error.message}` },
        { status: 400 }
      )
    }

    // Check if this was the captain and remove captain from team
    const { data: team } = await supabaseAdmin()
      .from('persistent_teams')
      .select('captain_id')
      .eq('id', teamId)
      .single()

    if (team?.captain_id === player_id) {
      await supabaseAdmin()
        .from('persistent_teams')
        .update({ captain_id: null })
        .eq('id', teamId)
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
