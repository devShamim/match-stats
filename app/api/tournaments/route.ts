import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/auth'

// GET - List all tournaments
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    let query = supabaseAdmin()
      .from('tournaments')
      .select(`
        *,
        teams:tournament_teams(
          id,
          team:persistent_teams(*)
        )
      `)
      .order('created_at', { ascending: false })

    if (status) {
      query = query.eq('status', status)
    }

    const { data: tournaments, error } = await query

    if (error) {
      console.error('Error fetching tournaments:', error)
      return NextResponse.json(
        { error: `Failed to fetch tournaments: ${error.message}` },
        { status: 400 }
      )
    }

    // Add team count to each tournament
    const tournamentsWithCounts = (tournaments || []).map(tournament => ({
      ...tournament,
      team_count: tournament.teams?.length || 0
    }))

    return NextResponse.json({ tournaments: tournamentsWithCounts })
  } catch (error: any) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Create a new tournament
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      name,
      description,
      type,
      start_date,
      end_date,
      max_teams,
      min_players_per_team,
      max_players_per_team,
      points_per_win,
      points_per_draw,
      points_per_loss,
      prize_structure
    } = body

    if (!name || !type) {
      return NextResponse.json(
        { error: 'Tournament name and type are required' },
        { status: 400 }
      )
    }

    // Get user ID from auth
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin().auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { data: tournament, error } = await supabaseAdmin()
      .from('tournaments')
      .insert({
        name,
        description: description || null,
        type,
        status: 'draft',
        start_date: start_date || null,
        end_date: end_date || null,
        max_teams: max_teams || null,
        min_players_per_team: min_players_per_team || 5,
        max_players_per_team: max_players_per_team || 6,
        points_per_win: points_per_win || 3,
        points_per_draw: points_per_draw || 1,
        points_per_loss: points_per_loss || 0,
        prize_structure: prize_structure || null,
        created_by: user.id
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating tournament:', error)
      return NextResponse.json(
        { error: `Failed to create tournament: ${error.message}` },
        { status: 400 }
      )
    }

    return NextResponse.json({ tournament }, { status: 201 })
  } catch (error: any) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
