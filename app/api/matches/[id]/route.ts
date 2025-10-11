import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseClient'

export async function DELETE(
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

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Database connection not available' },
        { status: 500 }
      )
    }

    // First, verify the match exists
    const { data: match, error: matchError } = await supabaseAdmin
      .from('matches')
      .select('id')
      .eq('id', matchId)
      .single()

    if (matchError) {
      console.error('Error fetching match:', matchError)
      return NextResponse.json(
        { error: `Failed to fetch match: ${matchError.message}` },
        { status: 400 }
      )
    }

    if (!match) {
      return NextResponse.json(
        { error: 'Match not found' },
        { status: 404 }
      )
    }

    // Delete in order: stats -> match_events -> match_players -> teams -> matches
    // This ensures proper cascade deletion

    // 1. First get all match_player_ids for this match
    const { data: matchPlayers, error: matchPlayersQueryError } = await supabaseAdmin
      .from('match_players')
      .select('id')
      .eq('match_id', matchId)

    if (matchPlayersQueryError) {
      console.error('Error fetching match players:', matchPlayersQueryError)
      // Continue with deletion even if this fails
    }

    // 2. Delete stats records for this match
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

    // 3. Delete match_events records for this match
    const { error: matchEventsError } = await supabaseAdmin
      .from('match_events')
      .delete()
      .eq('match_id', matchId)

    if (matchEventsError) {
      console.error('Error deleting match_events:', matchEventsError)
      // Continue with deletion even if match_events deletion fails
    }

    // 4. Delete match_players records for this match
    const { error: matchPlayersError } = await supabaseAdmin
      .from('match_players')
      .delete()
      .eq('match_id', matchId)

    if (matchPlayersError) {
      console.error('Error deleting match_players:', matchPlayersError)
      return NextResponse.json(
        { error: `Failed to delete match player records: ${matchPlayersError.message}` },
        { status: 400 }
      )
    }

    // 5. Delete teams records for this match (if they exist)
    const { error: teamsError } = await supabaseAdmin
      .from('teams')
      .delete()
      .eq('match_id', matchId)

    if (teamsError) {
      console.error('Error deleting teams:', teamsError)
      // Continue with deletion even if teams deletion fails
    }

    // 6. Delete the match record
    const { error: matchDeleteError } = await supabaseAdmin
      .from('matches')
      .delete()
      .eq('id', matchId)

    if (matchDeleteError) {
      console.error('Error deleting match:', matchDeleteError)
      return NextResponse.json(
        { error: `Failed to delete match: ${matchDeleteError.message}` },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Match and all associated records deleted successfully'
    })
  } catch (error: any) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
