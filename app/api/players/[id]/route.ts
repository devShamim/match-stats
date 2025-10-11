import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseClient'
import { createClient } from '@supabase/supabase-js'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const playerId = params.id

    if (!playerId) {
      return NextResponse.json(
        { error: 'Player ID is required' },
        { status: 400 }
      )
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Database connection not available' },
        { status: 500 }
      )
    }

    // Fetch player data with user profile
    const { data: player, error: playerError } = await supabaseAdmin
      .from('players')
      .select(`
        *,
        user_profile:user_profiles(*)
      `)
      .eq('id', playerId)
      .single()

    if (playerError) {
      console.error('Error fetching player:', playerError)
      return NextResponse.json(
        { error: `Failed to fetch player: ${playerError.message}` },
        { status: 400 }
      )
    }

    if (!player) {
      return NextResponse.json(
        { error: 'Player not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, player })
  } catch (error: any) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const playerId = params.id

    if (!playerId) {
      return NextResponse.json(
        { error: 'Player ID is required' },
        { status: 400 }
      )
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Database connection not available' },
        { status: 500 }
      )
    }

    // First, get the player's user_id to delete from user_profiles
    const { data: player, error: playerError } = await supabaseAdmin
      .from('players')
      .select('user_id')
      .eq('id', playerId)
      .single()

    if (playerError) {
      console.error('Error fetching player:', playerError)
      return NextResponse.json(
        { error: `Failed to fetch player: ${playerError.message}` },
        { status: 400 }
      )
    }

    if (!player) {
      return NextResponse.json(
        { error: 'Player not found' },
        { status: 404 }
      )
    }

    // Delete in order: stats -> match_players -> players -> user_profiles
    // This ensures proper cascade deletion

    // 1. First get all match_player_ids for this player
    const { data: matchPlayers, error: matchPlayersQueryError } = await supabaseAdmin
      .from('match_players')
      .select('id')
      .eq('player_id', playerId)

    if (matchPlayersQueryError) {
      console.error('Error fetching match players:', matchPlayersQueryError)
      // Continue with deletion even if this fails
    }

    // 2. Delete stats records for this player
    if (matchPlayers && matchPlayers.length > 0) {
      const matchPlayerIds = matchPlayers.map(mp => mp.id)
      const { error: statsError } = await supabaseAdmin
        .from('stats')
        .delete()
        .in('match_player_id', matchPlayerIds)

      if (statsError) {
        console.error('Error deleting stats:', statsError)
        // Continue with deletion even if stats deletion fails
      }
    }

    // 3. Delete match_players records for this player
    const { error: matchPlayersError } = await supabaseAdmin
      .from('match_players')
      .delete()
      .eq('player_id', playerId)

    if (matchPlayersError) {
      console.error('Error deleting match_players:', matchPlayersError)
      return NextResponse.json(
        { error: `Failed to delete player records: ${matchPlayersError.message}` },
        { status: 400 }
      )
    }

    // 4. Delete the player record
    const { error: playerDeleteError } = await supabaseAdmin
      .from('players')
      .delete()
      .eq('id', playerId)

    if (playerDeleteError) {
      console.error('Error deleting player:', playerDeleteError)
      return NextResponse.json(
        { error: `Failed to delete player: ${playerDeleteError.message}` },
        { status: 400 }
      )
    }

    // 5. Delete the user profile
    const { error: userProfileError } = await supabaseAdmin
      .from('user_profiles')
      .delete()
      .eq('id', player.user_id)

    if (userProfileError) {
      console.error('Error deleting user profile:', userProfileError)
      return NextResponse.json(
        { error: `Failed to delete user profile: ${userProfileError.message}` },
        { status: 400 }
      )
    }

    // 6. Delete the auth user from Supabase Auth
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

      if (!supabaseUrl || !serviceRoleKey) {
        console.error('Missing Supabase environment variables')
        return NextResponse.json(
          { error: 'Server configuration error' },
          { status: 500 }
        )
      }

      const supabaseAuth = createClient(supabaseUrl, serviceRoleKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      })

      const { error: authDeleteError } = await supabaseAuth.auth.admin.deleteUser(player.user_id)

      if (authDeleteError) {
        console.error('Error deleting auth user:', authDeleteError)
        return NextResponse.json(
          { error: `Failed to delete auth user: ${authDeleteError.message}` },
          { status: 400 }
        )
      }

      console.log('Auth user deleted successfully:', player.user_id)
    } catch (authError: any) {
      console.error('Unexpected error deleting auth user:', authError)
      return NextResponse.json(
        { error: `Failed to delete auth user: ${authError.message}` },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Player, user profile, auth account, and all associated records deleted successfully'
    })
  } catch (error: any) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}