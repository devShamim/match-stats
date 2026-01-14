import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/auth'

// GET - List all persistent teams
export async function GET(request: NextRequest) {
  try {
    const { data: teams, error } = await supabaseAdmin()
      .from('persistent_teams')
      .select(`
        *,
        captain:players!persistent_teams_captain_id_fkey(
          *,
          user_profile:user_profiles(*)
        )
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching teams:', error)
      return NextResponse.json(
        { error: `Failed to fetch teams: ${error.message}` },
        { status: 400 }
      )
    }

    // Get player counts and players for each team
    const teamsWithCounts = await Promise.all(
      (teams || []).map(async (team) => {
        const { data: teamPlayers, count } = await supabaseAdmin()
          .from('team_players')
          .select('*', { count: 'exact' })
          .eq('team_id', team.id)

        return {
          ...team,
          players: teamPlayers || [],
          player_count: count || 0
        }
      })
    )

    return NextResponse.json({ teams: teamsWithCounts })
  } catch (error: any) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Create a new persistent team
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, logo_url, color, captain_id } = body

    if (!name) {
      return NextResponse.json(
        { error: 'Team name is required' },
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

    // Check if team name already exists
    const { data: existingTeam } = await supabaseAdmin()
      .from('persistent_teams')
      .select('id')
      .eq('name', name)
      .single()

    if (existingTeam) {
      return NextResponse.json(
        { error: 'Team name already exists' },
        { status: 400 }
      )
    }

    const { data: team, error } = await supabaseAdmin()
      .from('persistent_teams')
      .insert({
        name,
        logo_url: logo_url || null,
        color: color || null,
        captain_id: captain_id || null,
        created_by: user.id
      })
      .select(`
        *,
        captain:players!persistent_teams_captain_id_fkey(
          *,
          user_profile:user_profiles(*)
        )
      `)
      .single()

    if (error) {
      console.error('Error creating team:', error)
      return NextResponse.json(
        { error: `Failed to create team: ${error.message}` },
        { status: 400 }
      )
    }

    return NextResponse.json({ team }, { status: 201 })
  } catch (error: any) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
